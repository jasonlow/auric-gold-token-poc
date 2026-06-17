package com.auric.tokenengine.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(PricingProperties.class)
public class PricingConfig {}
