package com.auric.tokenengine.controller;

import com.auric.tokenengine.admin.AdminService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;

/** Admin/onboarding actions (each behind stubbed multisig approval + audited). */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final AdminService admin;

    public AdminController(AdminService admin) {
        this.admin = admin;
    }

    @PostMapping("/whitelist")
    public Map<String, Object> whitelist(@RequestBody Map<String, String> body) {
        return admin.whitelist(body.get("walletAddress"));
    }

    @PostMapping("/freeze")
    public Map<String, Object> freeze(@RequestBody Map<String, Object> body) {
        boolean frozen = body.get("frozen") == null || Boolean.parseBoolean(String.valueOf(body.get("frozen")));
        return admin.setFrozen(String.valueOf(body.get("walletAddress")), frozen);
    }

    @PostMapping("/force-transfer")
    public Map<String, Object> forceTransfer(@RequestBody Map<String, Object> body) {
        return admin.forceTransfer(String.valueOf(body.get("from")), String.valueOf(body.get("to")), grams(body));
    }

    @PostMapping("/manual-mint")
    public Map<String, Object> manualMint(@RequestBody Map<String, Object> body) {
        return admin.manualMint(String.valueOf(body.get("walletAddress")), grams(body));
    }

    @PostMapping("/manual-burn")
    public Map<String, Object> manualBurn(@RequestBody Map<String, Object> body) {
        return admin.manualBurn(String.valueOf(body.get("walletAddress")), grams(body));
    }

    @PostMapping("/rule")
    public Map<String, Object> rule(@RequestBody Map<String, String> body) {
        return admin.updateRule(body.get("ruleType"), body.get("value"));
    }

    private BigDecimal grams(Map<String, Object> body) {
        return new BigDecimal(String.valueOf(body.get("grams")));
    }
}
