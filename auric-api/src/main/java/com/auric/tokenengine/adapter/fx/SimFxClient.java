package com.auric.tokenengine.adapter.fx;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Mock FX adapter — talks to the vendor simulator over HTTP. */
@Component
@Profile("mock")
public class SimFxClient implements FxProvider {

    private final RestClient http;

    public SimFxClient(RestClient simRestClient) {
        this.http = simRestClient;
    }

    @Override
    public FxRate getUsdSgd() {
        return http.get().uri("/fx/usdsgd").retrieve().body(FxRate.class);
    }
}
