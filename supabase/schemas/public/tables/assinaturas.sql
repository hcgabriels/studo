CREATE TABLE "public"."assinaturas" (
  "id"                         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "professor_id"               uuid                     NOT NULL,
  "gateway"                    text                     NOT NULL DEFAULT 'stripe'::text,
  "gateway_customer_id"        text,
  "gateway_subscription_id"    text,
  "status"                     text                     NOT NULL DEFAULT 'beta'::text,
  "plano"                      text                     NOT NULL DEFAULT 'beta'::text,
  "trial_ends_at"              timestamp with time zone,
  "current_period_end"         timestamp with time zone,
  "cancel_at_period_end"       boolean                  NOT NULL DEFAULT false,
  "created_at"                 timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                 timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "assinaturas_gateway_check" CHECK ((gateway = 'stripe'::text)),
  CONSTRAINT "assinaturas_plano_check" CHECK ((plano = ANY (ARRAY['beta'::text, 'mensal'::text, 'anual'::text]))),
  CONSTRAINT "assinaturas_pkey" PRIMARY KEY (id),
  CONSTRAINT "assinaturas_professor_id_fkey" FOREIGN KEY (professor_id) REFERENCES public.professores(id) ON DELETE CASCADE,
  CONSTRAINT "assinaturas_professor_id_key" UNIQUE (professor_id),
  CONSTRAINT "assinaturas_status_check" CHECK ((status = ANY (ARRAY['beta'::text, 'trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text, 'unpaid'::text, 'incomplete'::text, 'incomplete_expired'::text, 'paused'::text])))
);

ALTER TABLE "public"."assinaturas"
  ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX assinaturas_gateway_customer_id_key
  ON public.assinaturas USING btree (gateway_customer_id)
  WHERE gateway_customer_id IS NOT NULL;

CREATE UNIQUE INDEX assinaturas_gateway_subscription_id_key
  ON public.assinaturas USING btree (gateway_subscription_id)
  WHERE gateway_subscription_id IS NOT NULL;

CREATE INDEX idx_assinaturas_professor_id
  ON public.assinaturas USING btree (professor_id);

CREATE INDEX idx_assinaturas_status
  ON public.assinaturas USING btree (status);

CREATE TRIGGER update_assinaturas_updated_at
  BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Professor visualiza a propria assinatura" ON "public"."assinaturas"
  FOR SELECT
  TO "authenticated"
  USING ((professor_id = private.meu_professor_id()));

REVOKE ALL ON TABLE "public"."assinaturas" FROM "anon", "authenticated";

GRANT SELECT ON TABLE "public"."assinaturas" TO "authenticated";

GRANT ALL ON TABLE "public"."assinaturas" TO "service_role";
