package com.auric.tokenengine.recon;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Periodic reconciliation trigger. Default hourly; the single-runner advisory
 * lock in ReconciliationService makes concurrent/duplicate runs safe (SAD C6).
 */
@Component
public class ReconciliationScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReconciliationScheduler.class);

    private final ReconciliationService recon;

    public ReconciliationScheduler(ReconciliationService recon) {
        this.recon = recon;
    }

    @Scheduled(fixedDelayString = "${auric.reconciliation.interval-ms:3600000}",
        initialDelayString = "${auric.reconciliation.initial-delay-ms:3600000}")
    public void scheduled() {
        try {
            recon.runReconciliation();
        } catch (Exception e) {
            log.warn("scheduled reconciliation failed: {}", e.getMessage());
        }
    }
}
