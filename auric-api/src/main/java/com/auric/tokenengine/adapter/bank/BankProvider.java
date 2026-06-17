package com.auric.tokenengine.adapter.bank;

import java.math.BigDecimal;

/** Port: SGD banking rails — confirm payment-in (mint gate), pay out (redeem). */
public interface BankProvider {

    PaymentStatus getPaymentStatus(String reference);

    PayoutResult payout(String account, BigDecimal amountSgd, String reference);

    record PaymentStatus(String reference, String status, BigDecimal amountSgd) {}

    record PayoutResult(String payoutId, String status, BigDecimal amountSgd) {}
}
