package com.auric.tokenengine.redeem;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public final class RedeemDtos {

    public record RedeemRequest(
        @NotNull String walletAddress,
        @NotNull @Positive BigDecimal grams,
        @NotNull String bankAccount,
        @NotNull String idempotencyKey
    ) {}

    public record RedeemResult(
        Long transactionId,
        String state,
        String txnHash,
        BigDecimal grams,
        BigDecimal fiatAmountSgd,
        String failureReason
    ) {}

    private RedeemDtos() {}
}
