-- Core domain schema for the Auric Token Engine.
-- Designed around the corrected architecture invariants:
--   * mint/burn are SAGAS with an explicit `state` (no DB tx across the chain call)
--   * `idempotency_key` so a retried request can't double-mint
--   * `pending_settlement` so reconciliation compares NET of in-flight ops
-- Amounts: token units & on-chain supply use 18 decimals (1 token = 1 gram);
-- physical grams use 4 decimals; SGD uses 2 decimals.

-- ----------------------------------------------------------------------------
-- users — investors (KYC, accreditation, wallet). No raw PII (only masked + hash).
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    wallet_address        VARCHAR(42)  NOT NULL UNIQUE,        -- 0x + 40 hex, stored lowercase
    name                  VARCHAR(255),
    nric_masked           VARCHAR(32),                          -- e.g. S****123A (never raw)
    nationality           VARCHAR(2),                           -- ISO 3166-1 alpha-2
    jurisdiction          VARCHAR(2),
    kyc_status            VARCHAR(16)  NOT NULL DEFAULT 'PENDING'
                              CHECK (kyc_status IN ('PENDING','VERIFIED','REJECTED','EXPIRED')),
    kyc_hash              VARCHAR(66),                          -- hash of off-chain KYC record
    kyc_provider_ref      VARCHAR(128),
    kyc_expiry            TIMESTAMPTZ,
    accreditation_status  VARCHAR(16)  NOT NULL DEFAULT 'PENDING'
                              CHECK (accreditation_status IN ('PENDING','ACCREDITED','REJECTED')),
    bank_account_masked   VARCHAR(64),
    daily_mint_limit_sgd  NUMERIC(20,2) NOT NULL DEFAULT 30000,
    status                VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE'
                              CHECK (status IN ('ACTIVE','FROZEN','CLOSED')),
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_kyc_status ON users (kyc_status);
CREATE INDEX idx_users_status     ON users (status);

-- ----------------------------------------------------------------------------
-- vault_records — allocated/segregated physical gold (bars, serials, certs).
-- ----------------------------------------------------------------------------
CREATE TABLE vault_records (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vault_ref      VARCHAR(64)   NOT NULL UNIQUE,
    gold_grams     NUMERIC(20,4) NOT NULL CHECK (gold_grams >= 0),
    bar_serial     VARCHAR(128),
    certificate_id VARCHAR(128),
    dealer         VARCHAR(128),
    purchase_date  DATE,
    status         VARCHAR(16)   NOT NULL DEFAULT 'ALLOCATED'
                       CHECK (status IN ('ALLOCATED','RELEASED')),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- transactions — mint/burn/transfer as saga state machines.
-- `state` values (app-enforced; see MintService / BurnService):
--   MINT : QUOTED -> PENDING_PAYMENT -> PAYMENT_CONFIRMED -> VAULT_ALLOCATED
--          -> MINTING(CHAIN_SENT) -> CONFIRMED | FAILED
--   BURN : REQUESTED -> LOCKED -> GOLD_SOLD -> FIAT_SETTLED -> BURNED -> COMPLETE
--          | RETURN_ESCROW | PENDING_LIQUIDATION | FAILED
--   TRANSFER (user-signed on-chain): SUBMITTED -> CONFIRMED | FAILED
-- ----------------------------------------------------------------------------
CREATE TABLE transactions (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idempotency_key       VARCHAR(80)  NOT NULL UNIQUE,        -- dedupe retried requests
    user_id               BIGINT       REFERENCES users (id),
    type                  VARCHAR(16)  NOT NULL CHECK (type IN ('MINT','BURN','TRANSFER')),
    state                 VARCHAR(32)  NOT NULL,               -- saga state (see above)
    token_amount          NUMERIC(38,18),                      -- 18-dec token units (= grams)
    gold_grams            NUMERIC(20,4),
    fiat_amount_sgd       NUMERIC(20,2),
    fee_sgd               NUMERIC(20,2),
    counterparty          VARCHAR(42),                         -- recipient wallet (transfers)
    vault_ref             VARCHAR(64),
    txn_hash              VARCHAR(66),                         -- on-chain tx hash
    chain_status          VARCHAR(16)  CHECK (chain_status IN ('PENDING','CONFIRMED','FAILED')),
    failure_reason        TEXT,
    quote_sgd_per_gram    NUMERIC(20,4),                       -- locked quote
    quote_locked_at       TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_txn_user       ON transactions (user_id);
CREATE INDEX idx_txn_type_state ON transactions (type, state);
CREATE INDEX idx_txn_hash       ON transactions (txn_hash);

-- ----------------------------------------------------------------------------
-- pending_settlement — in-flight grams that reconciliation must net out.
--   PENDING_MINT : grams reserved (paid/allocated) but not yet minted on-chain
--   PENDING_BURN : grams escrowed for redemption but not yet burned
-- Used for atomic vault-headroom reservation (no TOCTOU double-mint) and for the
-- invariant: on_chain == vault_grams - pending_burns + pending_mints (± tolerance).
-- ----------------------------------------------------------------------------
CREATE TABLE pending_settlement (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_id BIGINT        NOT NULL REFERENCES transactions (id),
    kind           VARCHAR(16)   NOT NULL CHECK (kind IN ('PENDING_MINT','PENDING_BURN')),
    gold_grams     NUMERIC(20,4) NOT NULL CHECK (gold_grams > 0),
    status         VARCHAR(16)   NOT NULL DEFAULT 'OPEN'
                       CHECK (status IN ('OPEN','CLEARED','CANCELLED')),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    cleared_at     TIMESTAMPTZ
);
CREATE INDEX idx_pending_open ON pending_settlement (kind) WHERE status = 'OPEN';

-- ----------------------------------------------------------------------------
-- reconciliations — hourly check, net of in-flight settlement.
-- breach = under-collateralisation only (on_chain > vault + tolerance, net).
-- ----------------------------------------------------------------------------
CREATE TABLE reconciliations (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    onchain_supply_grams  NUMERIC(38,18) NOT NULL,
    vault_grams           NUMERIC(20,4)  NOT NULL,
    pending_mints_grams   NUMERIC(20,4)  NOT NULL DEFAULT 0,
    pending_burns_grams   NUMERIC(20,4)  NOT NULL DEFAULT 0,
    net_delta_grams       NUMERIC(38,18) NOT NULL,             -- onchain - (vault - burns + mints)
    tolerance_grams       NUMERIC(20,4)  NOT NULL DEFAULT 0.01,
    status                VARCHAR(8)     NOT NULL CHECK (status IN ('OK','WARN','BREACH')),
    breach                BOOLEAN        NOT NULL DEFAULT false,
    alert_sent            BOOLEAN        NOT NULL DEFAULT false,
    checked_at            TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX idx_recon_checked_at ON reconciliations (checked_at);

-- ----------------------------------------------------------------------------
-- compliance_rules — runtime-updatable rules (no contract redeploy).
-- ----------------------------------------------------------------------------
CREATE TABLE compliance_rules (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rule_type      VARCHAR(64) NOT NULL,
    rule_value     JSONB       NOT NULL,
    effective_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by     VARCHAR(255),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_compliance_rule_type ON compliance_rules (rule_type);
