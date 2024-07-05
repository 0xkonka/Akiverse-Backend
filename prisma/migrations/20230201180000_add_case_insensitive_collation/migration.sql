-- create case insensitive collation
CREATE COLLATION IF NOT EXISTS case_insensitive (provider = icu, locale = 'und-u-ks-level2', deterministic = false);

-- alter table
ALTER TABLE users
    ALTER COLUMN wallet_address TYPE text COLLATE case_insensitive;

ALTER TABLE moralis_sessions
    ALTER COLUMN wallet_address TYPE text COLLATE case_insensitive;

ALTER TABLE arcade_machines
    ALTER COLUMN owner_wallet_address TYPE text COLLATE case_insensitive,
    ALTER COLUMN physical_wallet_address TYPE text COLLATE case_insensitive;

ALTER TABLE arcade_parts
    ALTER COLUMN owner_wallet_address TYPE text COLLATE case_insensitive,
    ALTER COLUMN physical_wallet_address TYPE text COLLATE case_insensitive;

ALTER TABLE game_centers
    ALTER COLUMN owner_wallet_address TYPE text COLLATE case_insensitive,
    ALTER COLUMN physical_wallet_address TYPE text COLLATE case_insensitive;

ALTER TABLE withdrawals
    ALTER COLUMN wallet_address TYPE text COLLATE case_insensitive;
