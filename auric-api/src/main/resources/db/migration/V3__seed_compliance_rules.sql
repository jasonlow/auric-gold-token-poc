-- Default compliance rules for the pilot (mirror the on-chain ComplianceModule
-- defaults and BRS business rules). Runtime-updatable via the admin API later.

INSERT INTO compliance_rules (rule_type, rule_value, updated_by) VALUES
    ('JURISDICTION_ALLOW',   '["SG"]',  'system'),   -- Singapore only (BR-05)
    ('REQUIRE_ACCREDITED',   'true',    'system'),   -- accredited investors only (BR-04)
    ('DAILY_MINT_LIMIT_SGD', '30000',   'system'),   -- per-user daily cap (BR-06)
    ('MINT_FEE_PERCENT',     '0.005',   'system'),   -- 0.5% (BR-08)
    ('REDEEM_FEE_PERCENT',   '0.005',   'system'),   -- 0.5% (BR-07)
    ('GRAM_TOLERANCE',       '0.01',    'system');   -- reconciliation tolerance (NFR-DAT-01)
