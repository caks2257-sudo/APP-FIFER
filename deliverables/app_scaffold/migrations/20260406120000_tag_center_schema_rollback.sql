-- Rollback: removes fifer_platform schema and all objects within.
-- Run only after confirming no dependencies.

DROP SCHEMA IF EXISTS fifer_platform CASCADE;
