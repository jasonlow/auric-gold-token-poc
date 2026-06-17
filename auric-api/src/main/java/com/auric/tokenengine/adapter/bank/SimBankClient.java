package com.auric.tokenengine.adapter.bank;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.Map;

/** Mock bank adapter — talks to the vendor simulator over HTTP. */
@Component
@Profile("mock")
public class SimBankClient implements BankProvider {

    private final RestClient http;

    public SimBankClient(RestClient simRestClient) {
        this.http = simRestClient;
    }

    @Override
    public PaymentStatus getPaymentStatus(String reference) {
        return http.get().uri("/bank/payment-status/{ref}", reference).retrieve().body(PaymentStatus.class);
    }

    @Override
    public PayoutResult payout(String account, BigDecimal amountSgd, String reference) {
        return http.post().uri("/bank/payout")
            .body(Map.of("account", account, "amountSgd", amountSgd, "reference", reference == null ? "" : reference))
            .retrieve().body(PayoutResult.class);
    }
}
