package com.auric.tokenengine.pricing;

import com.auric.tokenengine.adapter.fx.FxProvider;
import com.auric.tokenengine.adapter.oracle.OracleProvider;
import com.auric.tokenengine.config.PricingProperties;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Pricing pipeline (BRS FR-ORC-06/07):
 *   XAU/USD per troy ounce  ->  per-gram USD (÷ 31.1035)  ->  per-gram SGD (× USD/SGD)
 *   ->  gold value  ±  fee  =  total. Quotes are locked for a short TTL; a stale
 *   oracle/FX price blocks the quote (caller re-quotes).
 */
@Service
public class PricingService {

    public enum Side { MINT, REDEEM }

    private static final BigDecimal TROY_OUNCE_GRAMS = new BigDecimal("31.1035");

    private final OracleProvider oracle;
    private final FxProvider fx;
    private final PricingProperties props;
    private final ConcurrentMap<String, Quote> quotes = new ConcurrentHashMap<>();

    public PricingService(OracleProvider oracle, FxProvider fx, PricingProperties props) {
        this.oracle = oracle;
        this.fx = fx;
        this.props = props;
    }

    public record Quote(
        String quoteId, BigDecimal grams, Side side,
        BigDecimal xauUsdPerOunce, BigDecimal usdSgdRate, BigDecimal pricePerGramSgd,
        BigDecimal goldValueSgd, BigDecimal feeSgd, BigDecimal totalSgd, Instant expiresAt
    ) {}

    public record Spot(BigDecimal pricePerGramSgd, BigDecimal xauUsdPerOunce, BigDecimal usdSgdRate, boolean stale) {}

    /** Current per-gram SGD spot price (no quote stored, no stale-throw). For NAV display. */
    public Spot spot() {
        OracleProvider.OraclePrice gold = oracle.getXauUsd();
        FxProvider.FxRate fxRate = fx.getUsdSgd();
        BigDecimal perGramUsd = gold.pricePerOunceUsd().divide(TROY_OUNCE_GRAMS, 10, RoundingMode.HALF_UP);
        BigDecimal perGramSgd = perGramUsd.multiply(fxRate.rate()).setScale(4, RoundingMode.HALF_UP);
        return new Spot(perGramSgd, gold.pricePerOunceUsd(), fxRate.rate(), fxRate.stale());
    }

    public Quote quote(BigDecimal grams, Side side) {
        OracleProvider.OraclePrice gold = oracle.getXauUsd();
        FxProvider.FxRate fxRate = fx.getUsdSgd();

        // Staleness gates (F9).
        if (fxRate.stale()) {
            throw new StalePriceException("FX rate (USD/SGD) is stale — re-quote");
        }
        long ageSec = Instant.now().getEpochSecond() - gold.updatedAt();
        if (gold.updatedAt() > 0 && ageSec > props.oracleMaxStaleSeconds()) {
            throw new StalePriceException("gold price is stale (" + ageSec + "s old) — re-quote");
        }

        BigDecimal perGramUsd = gold.pricePerOunceUsd().divide(TROY_OUNCE_GRAMS, 10, RoundingMode.HALF_UP);
        BigDecimal perGramSgd = perGramUsd.multiply(fxRate.rate()).setScale(4, RoundingMode.HALF_UP);
        BigDecimal goldValueSgd = perGramSgd.multiply(grams).setScale(2, RoundingMode.HALF_UP);

        BigDecimal feePercent = side == Side.MINT ? props.mintFeePercent() : props.redeemFeePercent();
        BigDecimal feeSgd = goldValueSgd.multiply(feePercent).setScale(2, RoundingMode.HALF_UP);
        // Fee is charged in SGD on top of (mint) / deducted from (redeem) gold value — never reduces backing.
        BigDecimal totalSgd = side == Side.MINT ? goldValueSgd.add(feeSgd) : goldValueSgd.subtract(feeSgd);

        Quote q = new Quote(
            UUID.randomUUID().toString(), grams, side,
            gold.pricePerOunceUsd(), fxRate.rate(), perGramSgd,
            goldValueSgd, feeSgd, totalSgd,
            Instant.now().plusSeconds(props.quoteTtlSeconds())
        );
        quotes.put(q.quoteId(), q);
        return q;
    }

    /** Validate a previously issued quote is still within its lock window. */
    public Quote requireValid(String quoteId) {
        Quote q = quotes.get(quoteId);
        if (q == null) throw new StalePriceException("unknown quote");
        if (q.expiresAt().isBefore(Instant.now())) throw new StalePriceException("quote expired — re-quote");
        return q;
    }
}
