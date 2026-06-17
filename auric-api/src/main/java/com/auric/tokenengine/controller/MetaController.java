package com.auric.tokenengine.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Minimal liveness/info endpoint to confirm the API is up (scaffold). */
@RestController
@RequestMapping("/api/v1")
public class MetaController {

    private final Environment env;

    @Value("${spring.application.name:auric-token-engine}")
    private String appName;

    public MetaController(Environment env) {
        this.env = env;
    }

    @GetMapping("/meta")
    public Map<String, Object> meta() {
        return Map.of(
            "name", appName,
            "status", "ok",
            "profiles", env.getActiveProfiles()
        );
    }
}
