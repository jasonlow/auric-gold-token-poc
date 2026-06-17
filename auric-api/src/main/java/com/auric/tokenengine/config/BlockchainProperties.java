package com.auric.tokenengine.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Chain configuration — RPC, chain id and contract addresses. Sourced entirely
 * from config (env / application-*.yml), never hardcoded, so switching networks
 * (local Hardhat ↔ Polygon Amoy) is a config change (BRS FR-MIG-01).
 */
@ConfigurationProperties(prefix = "blockchain")
public record BlockchainProperties(String rpcUrl, long chainId, String minterPrivateKey, Contracts contracts) {

    public record Contracts(
        String goldToken,
        String identityRegistry,
        String complianceModule,
        String trustedIssuers,
        String priceFeed
    ) {}
}
