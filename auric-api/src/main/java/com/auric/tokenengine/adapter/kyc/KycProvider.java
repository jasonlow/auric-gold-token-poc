package com.auric.tokenengine.adapter.kyc;

/** Port: KYC/AML provider (Sumsub in production, simulator in the POC). */
public interface KycProvider {

    KycApplicant createApplicant(String externalUserId);

    KycApplicant getStatus(String applicantId);

    record KycApplicant(String applicantId, String status) {}
}
