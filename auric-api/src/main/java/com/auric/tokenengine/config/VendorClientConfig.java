package com.auric.tokenengine.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/** HTTP client pointed at the vendor simulator (used by the mock adapters). */
@Configuration
@EnableConfigurationProperties(VendorProperties.class)
public class VendorClientConfig {

    @Bean
    public RestClient simRestClient(VendorProperties props) {
        return RestClient.builder().baseUrl(props.simBaseUrl()).build();
    }
}
