package com.auric.tokenengine.recon;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

/** A reconciliation check result. DB owns checked_at. */
@Entity
@Table(name = "reconciliations")
public class Reconciliation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "onchain_supply_grams")
    public BigDecimal onchainSupplyGrams;

    @Column(name = "vault_grams")
    public BigDecimal vaultGrams;

    @Column(name = "pending_mints_grams")
    public BigDecimal pendingMintsGrams;

    @Column(name = "pending_burns_grams")
    public BigDecimal pendingBurnsGrams;

    @Column(name = "net_delta_grams")
    public BigDecimal netDeltaGrams;

    @Column(name = "tolerance_grams")
    public BigDecimal toleranceGrams;

    public String status; // OK / WARN / BREACH

    public boolean breach;

    @Column(name = "alert_sent")
    public boolean alertSent;
}
