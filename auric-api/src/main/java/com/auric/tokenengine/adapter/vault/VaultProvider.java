package com.auric.tokenengine.adapter.vault;

import java.math.BigDecimal;

/** Port: physical gold custody (Brink's in production, simulator in the POC). */
public interface VaultProvider {

    VaultBalance getBalance();

    VaultAllocation allocate(BigDecimal grams, String vaultRef);

    record VaultBalance(BigDecimal grams, BigDecimal pendingGrams) {}

    record VaultAllocation(String vaultRef, BigDecimal grams, String status, String barSerial, String certificateId) {}
}
