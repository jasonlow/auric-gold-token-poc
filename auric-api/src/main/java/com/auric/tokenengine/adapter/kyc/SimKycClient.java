package com.auric.tokenengine.adapter.kyc;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/** Mock KYC adapter — talks to the vendor simulator over HTTP. */
@Component
@Profile("mock")
public class SimKycClient implements KycProvider {

    private final RestClient http;

    public SimKycClient(RestClient simRestClient) {
        this.http = simRestClient;
    }

    @Override
    public KycApplicant createApplicant(String externalUserId) {
        return http.post().uri("/kyc/applicant")
            .body(Map.of("externalUserId", externalUserId))
            .retrieve().body(KycApplicant.class);
    }

    @Override
    public KycApplicant getStatus(String applicantId) {
        return http.get().uri("/kyc/status/{id}", applicantId).retrieve().body(KycApplicant.class);
    }
}
