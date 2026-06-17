package com.auric.tokenengine.controller;

import com.auric.tokenengine.blockchain.ChainService;
import com.auric.tokenengine.config.BlockchainProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigInteger;
import java.util.LinkedHashMap;
import java.util.Map;

/** Read-only on-chain views (confirms Web3j wiring + contract config). */
@RestController
@RequestMapping("/api/v1/chain")
public class ChainController {

    private final ChainService chain;
    private final BlockchainProperties props;

    public ChainController(ChainService chain, BlockchainProperties props) {
        this.chain = chain;
        this.props = props;
    }

    @GetMapping("/info")
    public Map<String, Object> info() {
        int decimals = chain.decimals();
        BigInteger supply = chain.totalSupply();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("networkChainId", chain.chainId().toString());
        m.put("configuredChainId", props.chainId());
        m.put("rpcHost", rpcHost(props.rpcUrl()));
        m.put("goldToken", props.contracts().goldToken());
        m.put("decimals", decimals);
        m.put("totalSupplyRaw", supply.toString());
        m.put("totalSupplyGrams", chain.toGrams(supply, decimals).toPlainString());
        return m;
    }

    private static String rpcHost(String url) {
        try {
            return java.net.URI.create(url).getHost();
        } catch (Exception e) {
            return "configured";
        }
    }

    @GetMapping("/supply")
    public Map<String, Object> supply() {
        int decimals = chain.decimals();
        BigInteger supply = chain.totalSupply();
        return Map.of(
            "raw", supply.toString(),
            "grams", chain.toGrams(supply, decimals).toPlainString()
        );
    }

    @GetMapping("/balance/{wallet}")
    public Map<String, Object> balance(@PathVariable String wallet) {
        int decimals = chain.decimals();
        BigInteger bal = chain.balanceOf(wallet);
        return Map.of(
            "wallet", wallet,
            "raw", bal.toString(),
            "grams", chain.toGrams(bal, decimals).toPlainString()
        );
    }
}
