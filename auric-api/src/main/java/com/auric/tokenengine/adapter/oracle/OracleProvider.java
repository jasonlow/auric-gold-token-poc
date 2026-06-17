package com.auric.tokenengine.adapter.oracle;

import java.math.BigDecimal;

/** Port: gold price oracle. XAU/USD is priced per TROY OUNCE. */
public interface OracleProvider {

    OraclePrice getXauUsd();

    record OraclePrice(BigDecimal pricePerOunceUsd, int decimals, long updatedAt) {}
}
