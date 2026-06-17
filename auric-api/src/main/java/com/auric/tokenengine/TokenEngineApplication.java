package com.auric.tokenengine;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Auric Token Engine — REST API that orchestrates the gold-token lifecycle
 * (mint/burn sagas, reconciliation) and talks to vendors via swappable adapters.
 * Profiles: {@code local,mock} for local development with simulated vendors.
 */
@SpringBootApplication
@EnableScheduling
public class TokenEngineApplication {

    public static void main(String[] args) {
        SpringApplication.run(TokenEngineApplication.class, args);
    }
}
