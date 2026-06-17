-- Baseline migration. Foundational, append-only audit log.
-- Full domain schema (users, transactions, vault_records, reconciliations,
-- pending_settlement, compliance_rules) follows in ENGINE-02.

CREATE TABLE audit_log (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor       VARCHAR(255) NOT NULL,            -- admin email / "system" / wallet
    action      VARCHAR(64)  NOT NULL,            -- MINT, BURN, FREEZE, WHITELIST, RECON ...
    target      VARCHAR(255),                     -- user / wallet / rule affected
    details     JSONB,                            -- full parameters
    ip_address  VARCHAR(64),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_created_at ON audit_log (created_at);
CREATE INDEX idx_audit_log_action     ON audit_log (action);
