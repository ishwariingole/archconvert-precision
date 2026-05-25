-- INR wallet balance for each user
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_balance INTEGER NOT NULL DEFAULT 0;

UPDATE public.profiles
SET wallet_balance = COALESCE(wallet_balance, 0)
WHERE wallet_balance IS NULL;

-- Simple wallet ledger for top-ups and debits
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  reference TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own wallet tx read"
  ON public.wallet_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "own wallet tx insert"
  ON public.wallet_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_reference_unique
  ON public.wallet_transactions (reference)
  WHERE reference IS NOT NULL;

-- Ensure conversion history table exists for wallet spend logging.
CREATE TABLE IF NOT EXISTS public.conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,
  file_name TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.conversions ADD COLUMN IF NOT EXISTS tool TEXT;
ALTER TABLE public.conversions ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.conversions ADD COLUMN IF NOT EXISTS tokens_used INTEGER;
ALTER TABLE public.conversions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE public.conversions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversions'
      AND policyname = 'own conv read'
  ) THEN
    CREATE POLICY "own conv read"
      ON public.conversions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversions'
      AND policyname = 'own conv insert'
  ) THEN
    CREATE POLICY "own conv insert"
      ON public.conversions
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Re-declare user creation so new accounts start with zero balance and zero spendable credit.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, email, wallet_balance)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    0
  );
  RETURN NEW;
END;
$$;

-- Atomic wallet spend for a conversion.
CREATE OR REPLACE FUNCTION public.spend_wallet_for_conversion(
  p_user_id UUID,
  p_amount INTEGER,
  p_tool TEXT,
  p_file_name TEXT
)
RETURNS TABLE(balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  SELECT wallet_balance
    INTO current_balance
    FROM public.profiles
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  UPDATE public.profiles
     SET wallet_balance = wallet_balance - p_amount
    WHERE user_id = p_user_id
   RETURNING wallet_balance INTO balance;

  INSERT INTO public.wallet_transactions (user_id, type, amount, reference, meta)
  VALUES (
    p_user_id,
    'debit',
    p_amount,
    gen_random_uuid()::text,
    jsonb_build_object('tool', p_tool, 'file_name', p_file_name)
  );

  INSERT INTO public.conversions (user_id, tool, file_name, tokens_used, status)
  VALUES (
    p_user_id,
    p_tool,
    p_file_name,
    p_amount,
    'completed'
  );

  RETURN NEXT;
END;
$$;

-- Atomic wallet credit for top-ups coming from a payment gateway.
CREATE OR REPLACE FUNCTION public.credit_wallet_after_payment(
  p_user_id UUID,
  p_amount INTEGER,
  p_reference TEXT,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_reference TEXT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  IF p_reference IS NULL OR length(trim(p_reference)) = 0 THEN
    RAISE EXCEPTION 'INVALID_REFERENCE';
  END IF;

  SELECT reference
    INTO existing_reference
    FROM public.wallet_transactions
   WHERE reference = p_reference
   LIMIT 1;

  IF existing_reference IS NOT NULL THEN
    SELECT wallet_balance INTO balance
      FROM public.profiles
     WHERE user_id = p_user_id;
    RETURN NEXT;
  END IF;

  UPDATE public.profiles
     SET wallet_balance = wallet_balance + p_amount
   WHERE user_id = p_user_id
   RETURNING wallet_balance INTO balance;

  IF balance IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  INSERT INTO public.wallet_transactions (user_id, type, amount, reference, meta)
  VALUES (
    p_user_id,
    'credit',
    p_amount,
    p_reference,
    p_meta
  );

  RETURN NEXT;
END;
$$;
