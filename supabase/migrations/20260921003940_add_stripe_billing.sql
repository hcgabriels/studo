CREATE TABLE IF NOT EXISTS public.assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL UNIQUE REFERENCES public.professores(id) ON DELETE CASCADE,
  gateway text NOT NULL DEFAULT 'stripe',
  gateway_customer_id text,
  gateway_subscription_id text,
  status text NOT NULL DEFAULT 'beta',
  plano text NOT NULL DEFAULT 'beta',
  trial_ends_at timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT assinaturas_gateway_check
    CHECK (gateway IN ('stripe')),
  CONSTRAINT assinaturas_status_check
    CHECK (status IN ('beta', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')),
  CONSTRAINT assinaturas_plano_check
    CHECK (plano IN ('beta', 'mensal', 'anual'))
);

CREATE UNIQUE INDEX IF NOT EXISTS assinaturas_gateway_customer_id_key
  ON public.assinaturas(gateway_customer_id)
  WHERE gateway_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS assinaturas_gateway_subscription_id_key
  ON public.assinaturas(gateway_subscription_id)
  WHERE gateway_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assinaturas_professor_id
  ON public.assinaturas(professor_id);

CREATE INDEX IF NOT EXISTS idx_assinaturas_status
  ON public.assinaturas(status);

CREATE TRIGGER update_assinaturas_updated_at
  BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professor visualiza a propria assinatura"
  ON public.assinaturas
  FOR SELECT
  TO authenticated
  USING (professor_id = private.meu_professor_id());

REVOKE ALL ON TABLE public.assinaturas FROM anon, authenticated;
GRANT SELECT ON TABLE public.assinaturas TO authenticated;
GRANT ALL ON TABLE public.assinaturas TO service_role;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  processed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.stripe_webhook_events FROM anon, authenticated;
GRANT ALL ON TABLE public.stripe_webhook_events TO service_role;
