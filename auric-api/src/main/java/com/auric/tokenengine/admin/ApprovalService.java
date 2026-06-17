package com.auric.tokenengine.admin;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Stubbed multisig (Gnosis Safe 2/3) approval (SAD C10). In the POC a single key
 * signs, but every privileged admin action still passes through this approval
 * step so the flow is correct. Phase 2 replaces this with a real Safe proposal.
 */
@Service
public class ApprovalService {

    private static final Logger log = LoggerFactory.getLogger(ApprovalService.class);

    public Approval require(String action, String details) {
        // STUB: auto-approve, but record that a 2/3 approval "happened".
        log.info("STUB multisig approval (2/3) granted for {} — {}", action, details);
        return new Approval(true, "stub-2of3", List.of("signer-1", "signer-2"));
    }

    public record Approval(boolean approved, String ref, List<String> signers) {}
}
