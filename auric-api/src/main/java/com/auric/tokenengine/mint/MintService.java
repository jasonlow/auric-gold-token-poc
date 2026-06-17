package com.auric.tokenengine.mint;

import com.auric.tokenengine.adapter.bank.BankProvider;
import com.auric.tokenengine.adapter.vault.VaultProvider;
import com.auric.tokenengine.audit.Audited;
import com.auric.tokenengine.blockchain.ChainService;
import com.auric.tokenengine.blockchain.TokenWriteService;
import com.auric.tokenengine.domain.Transaction;
import com.auric.tokenengine.domain.TransactionRepository;
import com.auric.tokenengine.mint.MintDtos.MintRequest;
import com.auric.tokenengine.mint.MintDtos.MintResult;
import com.auric.tokenengine.recon.MintPauseGuard;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.web3j.protocol.core.methods.response.TransactionReceipt;

import java.math.BigDecimal;
import java.math.BigInteger;

/**
 * Mint saga (BRS FR-MINT-11, SAD C1/C5). State machine:
 *   QUOTED → PENDING_PAYMENT → PAYMENT_CONFIRMED → VAULT_ALLOCATED → MINTING → CONFIRMED | FAILED
 *
 * Invariants enforced here:
 *  - idempotency key → a retried request never double-mints (F1)
 *  - payment confirmed BEFORE minting (F2: no payment → stays PENDING_PAYMENT)
 *  - vault headroom reserved atomically BEFORE minting (F3: no over-issue)
 *  - the on-chain send() runs OUTSIDE any DB transaction; DB writes are per-step
 */
@Service
public class MintService {

    private static final Logger log = LoggerFactory.getLogger(MintService.class);

    private final TransactionRepository txRepo;
    private final HeadroomReservationService headroom;
    private final BankProvider bank;
    private final VaultProvider vault;
    private final ChainService chain;
    private final TokenWriteService tokenWrite;
    private final MintPauseGuard pauseGuard;

    public MintService(TransactionRepository txRepo, HeadroomReservationService headroom, BankProvider bank,
                       VaultProvider vault, ChainService chain, TokenWriteService tokenWrite, MintPauseGuard pauseGuard) {
        this.txRepo = txRepo;
        this.headroom = headroom;
        this.bank = bank;
        this.vault = vault;
        this.chain = chain;
        this.tokenWrite = tokenWrite;
        this.pauseGuard = pauseGuard;
    }

    @Audited(action = "MINT")
    public MintResult mint(MintRequest req) {
        // (0) Minting paused by a reconciliation breach — refuse (FR-HOLD-06).
        if (pauseGuard.isPaused()) {
            return new MintResult(null, "BLOCKED_MINTING_PAUSED", null, req.grams(), null, pauseGuard.reason());
        }

        // (1) Idempotency — return the existing saga if this key was seen before.
        var existing = txRepo.findByIdempotencyKey(req.idempotencyKey());
        if (existing.isPresent()) {
            log.info("idempotent mint: key={} → txn {}", req.idempotencyKey(), existing.get().id);
            return toResult(existing.get());
        }

        Transaction txn = new Transaction();
        txn.idempotencyKey = req.idempotencyKey();
        txn.type = "MINT";
        txn.state = "QUOTED";
        txn.goldGrams = req.grams();
        txn.tokenAmount = req.grams(); // 1 token = 1 gram
        txn.counterparty = req.walletAddress();
        try {
            txn = txRepo.saveAndFlush(txn);
        } catch (DataIntegrityViolationException race) {
            // Concurrent request with the same key won the insert — return that one.
            return toResult(txRepo.findByIdempotencyKey(req.idempotencyKey()).orElseThrow());
        }

        // (2) Payment gate — mint only after fiat received (F2).
        var pay = bank.getPaymentStatus(req.paymentReference());
        if (!"RECEIVED".equals(pay.status())) {
            return save(txn, "PENDING_PAYMENT");
        }
        txn.fiatAmountSgd = pay.amountSgd();
        save(txn, "PAYMENT_CONFIRMED");

        // (3) Reserve vault headroom atomically (F3). Reads happen OUTSIDE the lock tx.
        BigDecimal vaultGrams = vault.getBalance().grams();
        BigDecimal onChainGrams = chain.toGrams(chain.totalSupply(), chain.decimals());
        try {
            headroom.reserve(txn.id, req.grams(), vaultGrams, onChainGrams);
        } catch (InsufficientVaultException e) {
            txn.failureReason = e.getMessage();
            return save(txn, "FAILED");
        }
        save(txn, "VAULT_ALLOCATED");

        // (4) Chain send — OUTSIDE any DB transaction. On auto-mining nodes a revert
        //     (e.g. "recipient not verified") surfaces here → compensate, don't 500.
        BigInteger amount = req.grams().movePointRight(18).toBigInteger();
        String txHash;
        try {
            txHash = tokenWrite.sendMint(req.walletAddress(), amount);
        } catch (RuntimeException e) {
            headroom.cancel(txn.id);
            txn.failureReason = revertReason(e);
            return save(txn, "FAILED");
        }
        txn.txnHash = txHash;
        txn.chainStatus = "PENDING";
        save(txn, "MINTING");

        // (5) Confirm / compensate.
        TransactionReceipt receipt;
        try {
            receipt = tokenWrite.waitForReceipt(txHash);
        } catch (RuntimeException e) {
            receipt = null;
        }
        if (receipt != null && receipt.isStatusOK()) {
            txn.chainStatus = "CONFIRMED";
            headroom.clear(txn.id);
            return save(txn, "CONFIRMED");
        }
        txn.chainStatus = "FAILED";
        txn.failureReason = "on-chain mint failed or timed out";
        headroom.cancel(txn.id);
        return save(txn, "FAILED");
    }

    /** Pull the Solidity revert reason out of a chain exception message. */
    public static String revertReason(RuntimeException e) {
        String m = e.getMessage() == null ? "" : e.getMessage();
        int i = m.indexOf("reason string '");
        if (i >= 0) {
            int start = i + "reason string '".length();
            int end = m.indexOf('\'', start);
            if (end > start) return m.substring(start, end);
        }
        return "on-chain send failed";
    }

    private MintResult save(Transaction txn, String state) {
        txn.state = state;
        return toResult(txRepo.save(txn));
    }

    private MintResult toResult(Transaction t) {
        return new MintResult(t.id, t.state, t.txnHash, t.goldGrams, t.fiatAmountSgd, t.failureReason);
    }
}
