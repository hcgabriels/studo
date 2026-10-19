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
