package com.auric.tokenengine.mint;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Atomic vault-headroom reservation (no fractional reserve, no TOCTOU double-mint).
 * Serialised with a Postgres advisory lock so concurrent mints can't both claim
 * the same headroom (F3). Writes a PENDING_MINT row that reconciliation nets out.
 */
@Service
public class HeadroomReservationService {

    private static final long LOCK_KEY = 42L; // single global mint-reservation lock

    @PersistenceContext
    private EntityManager em;

    /**
     * Reserve `grams` of headroom for a transaction, or throw if unavailable.
     * available = vaultGrams - onChainGrams - SUM(open PENDING_MINT).
     */
    @Transactional
    public void reserve(Long txnId, BigDecimal grams, BigDecimal vaultGrams, BigDecimal onChainGrams) {
        em.createNativeQuery("SELECT pg_advisory_xact_lock(:k)").setParameter("k", LOCK_KEY).getSingleResult();

        Number pending = (Number) em.createNativeQuery(
                "SELECT COALESCE(SUM(gold_grams),0) FROM pending_settlement WHERE kind='PENDING_MINT' AND status='OPEN'")
            .getSingleResult();

        BigDecimal available = vaultGrams.subtract(onChainGrams).subtract(new BigDecimal(pending.toString()));
        if (grams.compareTo(available) > 0) {
            throw new InsufficientVaultException(
                "insufficient vault headroom: requested " + grams + "g, available " + available + "g");
        }

        em.createNativeQuery(
                "INSERT INTO pending_settlement (transaction_id, kind, gold_grams, status) VALUES (:tid,'PENDING_MINT',:g,'OPEN')")
            .setParameter("tid", txnId)
            .setParameter("g", grams)
            .executeUpdate();
    }

    /** Record an in-flight burn (escrowed tokens) so reconciliation nets it out. */
    @Transactional
    public void recordPendingBurn(Long txnId, BigDecimal grams) {
        em.createNativeQuery(
                "INSERT INTO pending_settlement (transaction_id, kind, gold_grams, status) VALUES (:tid,'PENDING_BURN',:g,'OPEN')")
            .setParameter("tid", txnId)
            .setParameter("g", grams)
            .executeUpdate();
    }

    @Transactional
    public void clear(Long txnId) {
        em.createNativeQuery(
                "UPDATE pending_settlement SET status='CLEARED', cleared_at=now() WHERE transaction_id=:tid AND status='OPEN'")
            .setParameter("tid", txnId).executeUpdate();
    }

    @Transactional
    public void cancel(Long txnId) {
        em.createNativeQuery(
                "UPDATE pending_settlement SET status='CANCELLED', cleared_at=now() WHERE transaction_id=:tid AND status='OPEN'")
            .setParameter("tid", txnId).executeUpdate();
    }
}
