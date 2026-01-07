-- Create atmos_transactions table
CREATE TABLE public.atmos_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan text NOT NULL,
  amount_tiyin integer NOT NULL,
  currency text NOT NULL DEFAULT 'UZS',
  account text UNIQUE NOT NULL,
  store_id text,
  transaction_id text UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'confirmed', 'failed', 'canceled')),
  provider_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

-- Create atmos_cards table
CREATE TABLE public.atmos_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  masked_pan text,
  expiry text,
  phone text,
  card_token text,
  binding_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  atmos_card_id uuid REFERENCES public.atmos_cards(id),
  last_transaction_id uuid REFERENCES public.atmos_transactions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.atmos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atmos_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS for atmos_transactions: Users can read their own
CREATE POLICY "Users can view their own transactions"
ON public.atmos_transactions FOR SELECT
USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access to transactions"
ON public.atmos_transactions FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- RLS for atmos_cards: Users can read their own
CREATE POLICY "Users can view their own cards"
ON public.atmos_cards FOR SELECT
USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access to cards"
ON public.atmos_cards FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- RLS for subscriptions: Users can read their own
CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access to subscriptions"
ON public.subscriptions FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_atmos_transactions_user_id ON public.atmos_transactions(user_id);
CREATE INDEX idx_atmos_transactions_status ON public.atmos_transactions(status);
CREATE INDEX idx_atmos_transactions_account ON public.atmos_transactions(account);
CREATE INDEX idx_atmos_transactions_transaction_id ON public.atmos_transactions(transaction_id);

CREATE INDEX idx_atmos_cards_user_id ON public.atmos_cards(user_id);
CREATE INDEX idx_atmos_cards_status ON public.atmos_cards(status);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- Add updated_at triggers
CREATE TRIGGER update_atmos_transactions_updated_at
  BEFORE UPDATE ON public.atmos_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_atmos_cards_updated_at
  BEFORE UPDATE ON public.atmos_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();