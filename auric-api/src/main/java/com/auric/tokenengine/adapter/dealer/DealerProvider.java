package com.auric.tokenengine.adapter.dealer;

import java.math.BigDecimal;

/** Port: bullion dealer — buys gold (mint) / sells gold (redeem). */
public interface DealerProvider {

    DealerQuote quote(BigDecimal grams, Side side);

    DealerFill buy(BigDecimal grams);

    DealerFill sell(BigDecimal grams);

    enum Side { buy, sell }

    record DealerQuote(BigDecimal grams, String side, BigDecimal pricePerGramSgd, int spreadBps, BigDecimal totalSgd) {}

    record DealerFill(String ref, BigDecimal grams, String status, BigDecimal pricePerGramSgd,
                      BigDecimal costSgd, BigDecimal proceedsSgd) {}
}
