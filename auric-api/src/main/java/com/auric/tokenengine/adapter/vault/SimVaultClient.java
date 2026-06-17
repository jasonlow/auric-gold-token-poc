package com.auric.tokenengine.adapter.vault;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

/** Mock vault adapter — talks to the vendor simulator over HTTP. */
@Component
@Profile("mock")
public class SimVaultClient implements VaultProvider {

    private final RestClient http;

    public SimVaultClient(RestClient simRestClient) {
        this.http = simRestClient;
    }

    @Override
    public VaultBalance getBalance() {
        return http.get().uri("/vault/balance").retrieve().body(VaultBalance.class);
    }

    @Override
    public VaultAllocation allocate(BigDecimal grams, String vaultRef) {
        Map<String, Object> body = new HashMap<>();
        body.put("grams", grams);
        if (vaultRef != null) body.put("vaultRef", vaultRef);
        return http.post().uri("/vault/allocate").body(body).retrieve().body(VaultAllocation.class);
    }
}
