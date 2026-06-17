package com.auric.tokenengine.adapter.oracle;

import com.auric.tokenengine.blockchain.ChainService;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.BigInteger;

/**
 * Reads XAU/USD from the on-chain price feed (MockV3Aggregator in the POC, real
 * Chainlink on mainnet — interchangeable via the configured feed address). Always
 * on-chain, so it is not profile-gated like the simulator-backed adapters.
 */
@Component
public class ChainlinkOracleProvider implements OracleProvider {

    private final ChainService chain;

    public ChainlinkOracleProvider(ChainService chain) {
        this.chain = chain;
    }

    @Override
    public OraclePrice getXauUsd() {
        int decimals = chain.priceFeedDecimals();
        BigInteger[] latest = chain.priceFeedLatest(); // [answer, updatedAt]
        BigDecimal pricePerOunceUsd = new BigDecimal(latest[0]).movePointLeft(decimals);
        return new OraclePrice(pricePerOunceUsd, decimals, latest[1].longValue());
    }
}
