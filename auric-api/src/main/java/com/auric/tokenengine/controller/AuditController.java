package com.auric.tokenengine.controller;

import com.auric.tokenengine.audit.AuditService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Audit log (read) for the admin dashboard. */
@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {

    private final AuditService audit;

    public AuditController(AuditService audit) {
        this.audit = audit;
    }

    @GetMapping
    public List<Map<String, Object>> recent() {
        return audit.recent(50);
    }
}
