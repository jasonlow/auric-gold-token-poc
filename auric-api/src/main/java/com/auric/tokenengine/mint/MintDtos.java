package com.auric.tokenengine.mint;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public final class MintDtos {

    public record MintRequest(
        @NotNull String walletAddress,
        @NotNull @Positive BigDecimal grams,
        @NotNull String paymentReference,
        @NotNull String idempotencyKey
    ) {}

    public record MintResult(
        Long transactionId,
        String state,
        String txnHash,
        BigDecimal grams,
        BigDecimal fiatAmountSgd,
        String failureReason
    ) {}

    private MintDtos() {}
}
