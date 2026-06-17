package com.auric.tokenengine.redeem;

import com.auric.tokenengine.adapter.bank.BankProvider;
import com.auric.tokenengine.adapter.dealer.DealerProvider;
import com.auric.tokenengine.audit.Audited;
import com.auric.tokenengine.blockchain.ChainService;
import com.auric.tokenengine.blockchain.TokenWriteService;
import com.auric.tokenengine.domain.Transaction;
import com.auric.tokenengine.domain.TransactionRepository;
import com.auric.tokenengine.mint.HeadroomReservationService;
import com.auric.tokenengine.mint.MintService;
import com.auric.tokenengine.pricing.PricingService;
import com.auric.tokenengine.pricing.PricingService.Quote;
import com.auric.tokenengine.recon.AlertService;
import com.auric.tokenengine.redeem.RedeemDtos.RedeemRequest;
import com.auric.tokenengine.redeem.RedeemDtos.RedeemResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.web3j.protocol.core.methods.response.TransactionReceipt;

import java.math.BigInteger;

/**
 * Redemption saga — ESCROW-THEN-BURN (BRS FR-BURN-10, SAD C2). State machine:
 *   REQUESTED → LOCKED → GOLD_SOLD → FIAT_SETTLED → BURNED → COMPLETE
 *   | RETURN_ESCROW (payout failed — tokens released, NOTHING burned)   ← F4
 *   | PENDING_LIQUIDATION (dealer can't sell — escrow held)             ← F5
 *
 * The burn is the LAST step, only after SGD settlement is confirmed. Escrow is a
 * partial freeze on the holder's wallet — tokens are never destroyed before payout.
 */
@Service
public class BurnService {

    private static final Logger log = LoggerFactory.getLogger(BurnService.class);

    private final TransactionRepository txRepo;
    private final HeadroomReservationService pending;
    private final DealerProvider dealer;
    private final BankProvider bank;
    private final ChainService chain;
    private final TokenWriteService tokenWrite;
    private final PricingService pricing;
    private final AlertService alerts;

    public BurnService(TransactionRepository txRepo, HeadroomReservationService pending, DealerProvider dealer,
                       BankProvider bank, ChainService chain, TokenWriteService tokenWrite, PricingService pricing,
                       AlertService alerts) {
        this.txRepo = txRepo;
        this.pending = pending;
        this.dealer = dealer;
        this.bank = bank;
        this.chain = chain;
        this.tokenWrite = tokenWrite;
        this.pricing = pricing;
        this.alerts = alerts;
    }

    @Audited(action = "REDEEM")
    public RedeemResult redeem(RedeemRequest req) {
        var existing = txRepo.findByIdempotencyKey(req.idempotencyKey());
        if (existing.isPresent()) return toResult(existing.get());

        Transaction txn = new Transaction();
        txn.idempotencyKey = req.idempotencyKey();
        txn.type = "BURN";
        txn.state = "REQUESTED";
        txn.goldGrams = req.grams();
        txn.tokenAmount = req.grams();
        txn.counterparty = req.walletAddress();
        try {
            txn = txRepo.saveAndFlush(txn);
        } catch (DataIntegrityViolationException race) {
            return toResult(txRepo.findByIdempotencyKey(req.idempotencyKey()).orElseThrow());
        }

        BigInteger amount = req.grams().movePointRight(18).toBigInteger();

        // Sufficient (unfrozen) balance check.
        if (chain.balanceOf(req.walletAddress()).compareTo(amount) < 0) {
            txn.failureReason = "insufficient balance";
            return save(txn, "FAILED");
        }

        // Lock in the SGD payout amount (redeem quote = gold value − fee).
        Quote q = pricing.quote(req.grams(), PricingService.Side.REDEEM);
        txn.fiatAmountSgd = q.totalSgd();
        txn.feeSgd = q.feeSgd();

        // (1) LOCK escrow — partial freeze on the holder's wallet.
        try {
            if (!ok(tokenWrite.waitForReceipt(tokenWrite.freezePartial(req.walletAddress(), amount)))) {
                txn.failureReason = "escrow lock failed";
                return save(txn, "FAILED");
            }
        } catch (RuntimeException e) {
            txn.failureReason = "escrow lock failed: " + MintService.revertReason(e);
            return save(txn, "FAILED");
        }
        pending.recordPendingBurn(txn.id, req.grams());
        save(txn, "LOCKED");

        // (2) SELL gold — if the dealer can't transact, hold escrow (F5).
        try {
            dealer.sell(req.grams());
        } catch (Exception e) {
            log.warn("dealer sell failed for txn {}: {}", txn.id, e.getMessage());
            alerts.alert("Redemption " + txn.id + " held (PENDING_LIQUIDATION) — dealer unavailable: " + e.getMessage());
            txn.failureReason = "dealer unavailable: " + e.getMessage();
            return save(txn, "PENDING_LIQUIDATION"); // escrow retained, nothing burned
        }
        save(txn, "GOLD_SOLD");

        // (3) PAYOUT SGD — if it fails, RETURN ESCROW (F4): unfreeze, never burn.
        try {
            var payout = bank.payout(req.bankAccount(), txn.fiatAmountSgd, "REDEEM-" + txn.id);
            if (!"COMPLETED".equals(payout.status())) {
                throw new IllegalStateException("payout status " + payout.status());
            }
        } catch (Exception e) {
            log.warn("payout failed for txn {} → returning escrow: {}", txn.id, e.getMessage());
            alerts.alert("Redemption " + txn.id + " payout FAILED — escrow returned, nothing burned: " + e.getMessage());
            tokenWrite.waitForReceipt(tokenWrite.unfreezePartial(req.walletAddress(), amount));
            pending.cancel(txn.id);
            txn.failureReason = "payout failed: " + e.getMessage();
            return save(txn, "RETURN_ESCROW");
        }
        save(txn, "FIAT_SETTLED");

        // (4) BURN — only now that SGD has settled. Unfreeze then burn.
        try {
            tokenWrite.waitForReceipt(tokenWrite.unfreezePartial(req.walletAddress(), amount));
            String burnTx = tokenWrite.sendBurn(req.walletAddress(), amount);
            txn.txnHash = burnTx;
            if (ok(tokenWrite.waitForReceipt(burnTx))) {
                txn.chainStatus = "CONFIRMED";
                pending.clear(txn.id);
                return save(txn, "COMPLETE");
            }
        } catch (RuntimeException e) {
            txn.failureReason = "burn failed after payout: " + MintService.revertReason(e);
        }
        // Burn failed after payout — under-collateralised; recon will flag it.
        txn.chainStatus = "FAILED";
        if (txn.failureReason == null) txn.failureReason = "burn failed after payout — needs manual resolution";
        return save(txn, "FAILED");
    }

    private boolean ok(TransactionReceipt r) {
        return r != null && r.isStatusOK();
    }

    private RedeemResult save(Transaction txn, String state) {
        txn.state = state;
        return toResult(txRepo.save(txn));
    }

    private RedeemResult toResult(Transaction t) {
        return new RedeemResult(t.id, t.state, t.txnHash, t.goldGrams, t.fiatAmountSgd, t.failureReason);
    }
}
