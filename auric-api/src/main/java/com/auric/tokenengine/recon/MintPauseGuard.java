package com.auric.tokenengine.recon;

import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Global mint kill-switch. Set by reconciliation on a true under-collateralisation
 * breach (BRS FR-HOLD-06); cleared by an admin only after the breach is resolved
 * (re-enable is a multisig action in production).
 */
@Component
public class MintPauseGuard {

    private final AtomicBoolean paused = new AtomicBoolean(false);
    private volatile String reason;

    public void pause(String reason) {
        this.reason = reason;
        paused.set(true);
    }

    public void resume() {
        paused.set(false);
        this.reason = null;
    }

    public boolean isPaused() {
        return paused.get();
    }

    public String reason() {
        return reason;
    }
}
