-- Teste grátis de 7 dias, sem cartão.
-- Toda conta nova ganha uma linha em `assinaturas` com status 'trialing' e
-- `trial_ends_at` daqui a 7 dias. O teste é do Studoo, não da Stripe:
-- `gateway_subscription_id` fica nulo até o professor assinar.
-- Fica no banco (trigger com SECURITY DEFINER) porque `authenticated` não
-- tem INSERT/UPDATE em `assinaturas`: o professor não consegue esticar o
-- próprio teste.

CREATE OR REPLACE FUNCTION public.iniciar_teste_gratis()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public'
  AS $function$
  BEGIN
    INSERT INTO public.assinaturas (professor_id, gateway, status, plano, trial_ends_at)
    VALUES (NEW.id, 'stripe', 'trialing', 'mensal', now() + interval '7 days')
    ON CONFLICT (professor_id) DO NOTHING;
    RETURN NEW;
  END;
  $function$;

REVOKE ALL ON FUNCTION public.iniciar_teste_gratis() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.iniciar_teste_gratis() TO postgres, service_role;

DROP TRIGGER IF EXISTS iniciar_teste_gratis_ao_criar_professor ON public.professores;
CREATE TRIGGER iniciar_teste_gratis_ao_criar_professor
  AFTER INSERT ON public.professores
  FOR EACH ROW
  EXECUTE FUNCTION public.iniciar_teste_gratis();

-- Contas que já existiam sem assinatura ganham o mesmo teste a partir de agora.
INSERT INTO public.assinaturas (professor_id, gateway, status, plano, trial_ends_at)
SELECT p.id, 'stripe', 'trialing', 'mensal', now() + interval '7 days'
FROM public.professores p
WHERE NOT EXISTS (SELECT 1 FROM public.assinaturas a WHERE a.professor_id = p.id);

-- Checkouts abandonados (customer criado, nenhuma assinatura) também.
UPDATE public.assinaturas
SET status = 'trialing',
    trial_ends_at = now() + interval '7 days',
    updated_at = now()
WHERE status = 'incomplete'
  AND gateway_subscription_id IS NULL;
