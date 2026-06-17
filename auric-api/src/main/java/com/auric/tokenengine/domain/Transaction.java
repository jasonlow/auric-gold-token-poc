package com.auric.tokenengine.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Mint/burn/transfer saga row. Field access; DB owns created_at/updated_at. */
@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    @Column(name = "idempotency_key")
    public String idempotencyKey;

    public String type; // MINT / BURN / TRANSFER
    public String state; // saga state

    @Column(name = "token_amount")
    public BigDecimal tokenAmount;

    @Column(name = "gold_grams")
    public BigDecimal goldGrams;

    @Column(name = "fiat_amount_sgd")
    public BigDecimal fiatAmountSgd;

    @Column(name = "fee_sgd")
    public BigDecimal feeSgd;

    public String counterparty; // recipient wallet

    @Column(name = "vault_ref")
    public String vaultRef;

    @Column(name = "txn_hash")
    public String txnHash;

    @Column(name = "chain_status")
    public String chainStatus;

    @Column(name = "failure_reason")
    public String failureReason;
}
