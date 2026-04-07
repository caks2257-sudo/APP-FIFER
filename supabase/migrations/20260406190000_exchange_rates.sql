CREATE SCHEMA IF NOT EXISTS fifer_finance;

CREATE TABLE IF NOT EXISTS fifer_finance.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL,
  target_currency text NOT NULL,
  rate numeric(20,10) NOT NULL CHECK (rate > 0),
  source text NOT NULL DEFAULT 'unknown',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exchange_rates_currency_pair_unique UNIQUE (base_currency, target_currency)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair
  ON fifer_finance.exchange_rates (base_currency, target_currency);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_fetched_at
  ON fifer_finance.exchange_rates (fetched_at DESC);

CREATE OR REPLACE FUNCTION fifer_finance.exchange_rates_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exchange_rates_updated ON fifer_finance.exchange_rates;
CREATE TRIGGER trg_exchange_rates_updated
BEFORE UPDATE ON fifer_finance.exchange_rates
FOR EACH ROW
EXECUTE PROCEDURE fifer_finance.exchange_rates_set_updated_at();

