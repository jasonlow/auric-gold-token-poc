package com.auric.tokenengine.admin;

import com.auric.tokenengine.audit.Audited;
import com.auric.tokenengine.blockchain.TokenWriteService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.web3j.protocol.core.methods.response.TransactionReceipt;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Privileged admin actions — each passes through the stubbed multisig approval
 * (SAD C10) and is audited. Chain actions are signed by the engine (agent/issuer).
 */
@Service
public class AdminService {

    @PersistenceContext
    private EntityManager em;

    private final TokenWriteService tokenWrite;
    private final ApprovalService approval;

    public AdminService(TokenWriteService tokenWrite, ApprovalService approval) {
        this.tokenWrite = tokenWrite;
        this.approval = approval;
    }

    @Audited(action = "WHITELIST")
    public Map<String, Object> whitelist(String wallet) {
        approval.require("WHITELIST", wallet);
        return confirm(tokenWrite.registerIdentity(wallet, 702, true, 0L), wallet);
    }

    @Audited(action = "FREEZE")
    public Map<String, Object> setFrozen(String wallet, boolean frozen) {
        approval.require(frozen ? "FREEZE" : "UNFREEZE", wallet);
        return confirm(tokenWrite.setAddressFrozen(wallet, frozen), wallet);
    }

    @Audited(action = "FORCE_TRANSFER")
    public Map<String, Object> forceTransfer(String from, String to, BigDecimal grams) {
        approval.require("FORCE_TRANSFER", from + "->" + to + " " + grams + "g");
        return confirm(tokenWrite.forcedTransfer(from, to, toUnits(grams)), to);
    }

    @Audited(action = "MANUAL_MINT")
    public Map<String, Object> manualMint(String wallet, BigDecimal grams) {
        approval.require("MANUAL_MINT", wallet + " " + grams + "g");
        return confirm(tokenWrite.sendMint(wallet, toUnits(grams)), wallet);
    }

    @Audited(action = "MANUAL_BURN")
    public Map<String, Object> manualBurn(String wallet, BigDecimal grams) {
        approval.require("MANUAL_BURN", wallet + " " + grams + "g");
        return confirm(tokenWrite.sendBurn(wallet, toUnits(grams)), wallet);
    }

    @Audited(action = "RULE_UPDATE")
    @Transactional
    public Map<String, Object> updateRule(String ruleType, String valueJson) {
        approval.require("RULE_UPDATE", ruleType + "=" + valueJson);
        em.createNativeQuery(
                "INSERT INTO compliance_rules (rule_type, rule_value, updated_by) VALUES (:t, CAST(:v AS jsonb), 'admin')")
            .setParameter("t", ruleType).setParameter("v", valueJson).executeUpdate();
        return Map.of("ruleType", ruleType, "value", valueJson, "status", "UPDATED");
    }

    private BigInteger toUnits(BigDecimal grams) {
        return grams.movePointRight(18).toBigInteger();
    }

    private Map<String, Object> confirm(String txHash, String target) {
        TransactionReceipt r = tokenWrite.waitForReceipt(txHash);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("target", target);
        m.put("txHash", txHash);
        m.put("status", r != null && r.isStatusOK() ? "CONFIRMED" : "FAILED");
        return m;
    }
}
