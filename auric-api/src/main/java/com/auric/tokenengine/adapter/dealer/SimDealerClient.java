package com.auric.tokenengine.adapter.dealer;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.Map;

/** Mock dealer adapter — talks to the vendor simulator over HTTP. */
@Component
@Profile("mock")
public class SimDealerClient implements DealerProvider {

    private final RestClient http;

    public SimDealerClient(RestClient simRestClient) {
        this.http = simRestClient;
    }

    @Override
    public DealerQuote quote(BigDecimal grams, Side side) {
        return http.get()
            .uri(b -> b.path("/dealer/quote").queryParam("grams", grams).queryParam("side", side.name()).build())
            .retrieve()
            .body(DealerQuote.class);
    }

    @Override
    public DealerFill buy(BigDecimal grams) {
        return http.post().uri("/dealer/buy").body(Map.of("grams", grams)).retrieve().body(DealerFill.class);
    }

    @Override
    public DealerFill sell(BigDecimal grams) {
        return http.post().uri("/dealer/sell").body(Map.of("grams", grams)).retrieve().body(DealerFill.class);
    }
}
