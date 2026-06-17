package com.auric.tokenengine.controller;

import com.auric.tokenengine.adapter.dealer.DealerProvider;
import com.auric.tokenengine.adapter.fx.FxProvider;
import com.auric.tokenengine.adapter.oracle.OracleProvider;
import com.auric.tokenengine.adapter.vault.VaultProvider;
import com.auric.tokenengine.config.VendorProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

/** Probe that exercises the vendor adapters (proves engine ↔ simulator + oracle). */
@RestController
@RequestMapping("/api/v1/vendors")
public class VendorProbeController {

    private final VendorProperties props;
    private final VaultProvider vault;
    private final DealerProvider dealer;
    private final FxProvider fx;
    private final OracleProvider oracle;

    public VendorProbeController(VendorProperties props, VaultProvider vault, DealerProvider dealer,
                                 FxProvider fx, OracleProvider oracle) {
        this.props = props;
        this.vault = vault;
        this.dealer = dealer;
        this.fx = fx;
        this.oracle = oracle;
    }

    @GetMapping("/probe")
    public Map<String, Object> probe() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("mode", props.mode());
        out.put("vaultBalance", vault.getBalance());
        out.put("fx", fx.getUsdSgd());
        out.put("dealerQuote", dealer.quote(new BigDecimal("10"), DealerProvider.Side.buy));
        out.put("oracleXauUsd", oracle.getXauUsd());
        return out;
    }
}
