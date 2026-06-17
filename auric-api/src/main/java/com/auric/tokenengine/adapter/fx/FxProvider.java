package com.auric.tokenengine.adapter.fx;

import java.math.BigDecimal;

/** Port: USD->SGD FX feed (used to convert the gold price into SGD). */
public interface FxProvider {

    FxRate getUsdSgd();

    record FxRate(String pair, BigDecimal rate, boolean stale, long ageMs) {}
}
