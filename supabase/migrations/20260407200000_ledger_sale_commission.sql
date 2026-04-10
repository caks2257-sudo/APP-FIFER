-- Platform Profit Ranking: comisión de venta en ledger (metadata.platform)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'fifer_finance'
      AND t.relname = 'ledger'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE fifer_finance.ledger DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE fifer_finance.ledger
ADD CONSTRAINT ledger_type_check
CHECK (
  type IN (
    'ai_spend',
    'referral_earn',
    'sale_commission',
    'top_up',
    'adjustment',
    'refund'
  )
);

COMMENT ON CONSTRAINT ledger_type_check ON fifer_finance.ledger IS
  'sale_commission: comisión atribuible a plataforma afiliada (metadata.platform).';
