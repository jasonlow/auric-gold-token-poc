package com.auric.tokenengine.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigDecimal;

/** Pricing config — fees, quote-lock TTL, and staleness thresholds. */
@ConfigurationProperties(prefix = "auric.pricing")
public record PricingProperties(
    BigDecimal mintFeePercent,
    BigDecimal redeemFeePercent,
    long quoteTtlSeconds,
    long oracleMaxStaleSeconds
) {}
