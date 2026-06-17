package com.auric.tokenengine.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;

/** Builds the Web3j client from configuration (chain-agnostic). */
@Configuration
@EnableConfigurationProperties(BlockchainProperties.class)
public class Web3jConfig {

    @Bean(destroyMethod = "shutdown")
    public Web3j web3j(BlockchainProperties props) {
        return Web3j.build(new HttpService(props.rpcUrl()));
    }
}
