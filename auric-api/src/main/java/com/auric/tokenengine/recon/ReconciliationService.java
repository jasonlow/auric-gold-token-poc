package com.auric.tokenengine.recon;

import com.auric.tokenengine.adapter.vault.VaultProvider;
import com.auric.tokenengine.audit.Audited;
import com.auric.tokenengine.blockchain.ChainService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Reconciliation (BRS NFR-DAT-01, SAD C3). Net-of-pending invariant:
 *   onchain_supply == vault_grams − pending_mints + pending_burns   (± tolerance)
 * i.e. adjusted = onchain − vault + pending_mints − pending_burns.
 *  - adjusted >  tolerance  → BREACH (under-collateralised) → PAUSE minting + alert
 *  - adjusted < −tolerance  → WARN  (over-collateralised drift)
 *  - |adjusted| ≤ tolerance → OK
 * In-flight mint/burn windows net to ~0, so they don't false-alarm (F6).
 * Single-runner: a Postgres advisory lock held for the (transactional) run.
 */
@Service
public class ReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(ReconciliationService.class);
    private static final long RECON_LOCK = 99L;

    @PersistenceContext
    private EntityManager em;

    private final ChainService chain;
    private final VaultProvider vault;
    private final ReconciliationRepository reconRepo;
    private final MintPauseGuard pauseGuard;
    private final AlertService alerts;

    @Value("${auric.reconciliation.tolerance-grams:0.01}")
    private BigDecimal tolerance;

    public ReconciliationService(ChainService chain, VaultProvider vault, ReconciliationRepository reconRepo,
                                 MintPauseGuard pauseGuard, AlertService alerts) {
        this.chain = chain;
        this.vault = vault;
        this.reconRepo = reconRepo;
        this.pauseGuard = pauseGuard;
        this.alerts = alerts;
    }

    @Audited(action = "RECON")
    @Transactional
    public Reconciliation runReconciliation() {
        // Single-runner: only one reconciliation proceeds at a time.
        em.createNativeQuery("SELECT pg_advisory_xact_lock(:k)").setParameter("k", RECON_LOCK).getSingleResult();

        BigDecimal onchain = chain.toGrams(chain.totalSupply(), chain.decimals());
        BigDecimal vaultGrams = vault.getBalance().grams();
        BigDecimal pendingMints = sumOpen("PENDING_MINT");
        BigDecimal pendingBurns = sumOpen("PENDING_BURN");

        BigDecimal adjusted = onchain.subtract(vaultGrams).add(pendingMints).subtract(pendingBurns);

        Reconciliation r = new Reconciliation();
        r.onchainSupplyGrams = onchain;
        r.vaultGrams = vaultGrams;
        r.pendingMintsGrams = pendingMints;
        r.pendingBurnsGrams = pendingBurns;
        r.netDeltaGrams = adjusted;
        r.toleranceGrams = tolerance;
        r.alertSent = false;

        if (adjusted.compareTo(tolerance) > 0) {
            r.status = "BREACH";
            r.breach = true;
            String msg = "RECONCILIATION BREACH — under-collateralised by " + adjusted + "g "
                + "(onchain=" + onchain + ", vault=" + vaultGrams + ", pendingMints=" + pendingMints
                + ", pendingBurns=" + pendingBurns + "). Minting PAUSED.";
            pauseGuard.pause(msg);
            alerts.alert(msg);
            r.alertSent = true;
        } else if (adjusted.abs().compareTo(tolerance) <= 0) {
            r.status = "OK";
        } else {
            r.status = "WARN"; // over-collateralised drift (not a breach)
        }

        log.info("recon: status={} adjusted={}g onchain={} vault={} pMint={} pBurn={}",
            r.status, adjusted, onchain, vaultGrams, pendingMints, pendingBurns);
        return reconRepo.save(r);
    }

    private BigDecimal sumOpen(String kind) {
        Number n = (Number) em.createNativeQuery(
                "SELECT COALESCE(SUM(gold_grams),0) FROM pending_settlement WHERE kind=:k AND status='OPEN'")
            .setParameter("k", kind).getSingleResult();
        return new BigDecimal(n.toString());
    }
}
