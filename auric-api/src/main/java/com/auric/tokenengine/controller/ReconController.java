package com.auric.tokenengine.controller;

import com.auric.tokenengine.recon.MintPauseGuard;
import com.auric.tokenengine.recon.Reconciliation;
import com.auric.tokenengine.recon.ReconciliationRepository;
import com.auric.tokenengine.recon.ReconciliationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/recon")
public class ReconController {

    private final ReconciliationService recon;
    private final ReconciliationRepository reconRepo;
    private final MintPauseGuard pauseGuard;

    public ReconController(ReconciliationService recon, ReconciliationRepository reconRepo, MintPauseGuard pauseGuard) {
        this.recon = recon;
        this.reconRepo = reconRepo;
        this.pauseGuard = pauseGuard;
    }

    @PostMapping("/trigger")
    public Reconciliation trigger() {
        return recon.runReconciliation();
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("mintingPaused", pauseGuard.isPaused());
        out.put("pauseReason", pauseGuard.reason());
        out.put("latest", reconRepo.findTopByOrderByIdDesc().orElse(null));
        return out;
    }

    /** Re-enable minting after a breach is resolved (multisig action in prod). */
    @PostMapping("/resume")
    public Map<String, Object> resume() {
        pauseGuard.resume();
        return Map.of("mintingPaused", pauseGuard.isPaused());
    }
}
