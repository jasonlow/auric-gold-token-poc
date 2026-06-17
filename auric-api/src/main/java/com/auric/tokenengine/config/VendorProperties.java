package com.auric.tokenengine.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Vendor adapter config. `mode` selects mock vs real implementations (profiles);
 * `simBaseUrl` is the vendor-simulator base URL used by the mock HTTP clients.
 * Switching to real vendors is a config/profile change, not a code change.
 */
@ConfigurationProperties(prefix = "auric.vendors")
public record VendorProperties(String mode, String simBaseUrl) {}
