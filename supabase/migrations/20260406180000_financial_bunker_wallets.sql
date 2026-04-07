-- Financial Bunker v3.6
CREATE SCHEMA IF NOT EXISTS fifer_finance;

CREATE TABLE IF NOT EXISTS fifer_finance.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  balance numeric(18, 6) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallets_user_unique UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS fifer_finance.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES fifer_finance.wallets (id) ON DELETE CASCADE,
  amount numeric(18, 6) NOT NULL,
  type text NOT NULL CHECK (type IN ('ai_spend', 'referral_earn', 'top_up')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_wallet_id
  ON fifer_finance.transactions (wallet_id);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_type
  ON fifer_finance.transactions (type);

CREATE OR REPLACE FUNCTION fifer_finance.wallets_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wallets_updated ON fifer_finance.wallets;
CREATE TRIGGER trg_wallets_updated
  BEFORE UPDATE ON fifer_finance.wallets
  FOR EACH ROW
  EXECUTE PROCEDURE fifer_finance.wallets_set_updated_at();

-- Atomic operation: verify balance -> debit -> transaction log.
CREATE OR REPLACE FUNCTION public.finance_apply_ai_spend(
  p_user_id uuid,
  p_amount numeric,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(ok boolean, reason text, wallet_id uuid, new_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  w_record fifer_finance.wallets%ROWTYPE;
  spend numeric := COALESCE(p_amount, 0);
BEGIN
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'missing_user_id', NULL::uuid, NULL::numeric;
    RETURN;
  END IF;

  IF spend <= 0 THEN
    RETURN QUERY SELECT false, 'invalid_amount', NULL::uuid, NULL::numeric;
    RETURN;
  END IF;

  SELECT * INTO w_record
  FROM fifer_finance.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'wallet_not_found', NULL::uuid, NULL::numeric;
    RETURN;
  END IF;

  IF w_record.balance < spend THEN
    RETURN QUERY SELECT false, 'insufficient_balance', w_record.id, w_record.balance;
    RETURN;
  END IF;

  UPDATE fifer_finance.wallets
  SET balance = balance - spend
  WHERE id = w_record.id
  RETURNING balance INTO new_balance;

  INSERT INTO fifer_finance.transactions (wallet_id, amount, type, metadata)
  VALUES (
    w_record.id,
    -spend,
    'ai_spend',
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN QUERY SELECT true, 'debited', w_record.id, new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.finance_apply_ai_spend(uuid, numeric, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finance_apply_ai_spend(uuid, numeric, jsonb) TO service_role;

