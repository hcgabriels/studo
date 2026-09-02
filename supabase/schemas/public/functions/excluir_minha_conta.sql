CREATE OR REPLACE FUNCTION public.excluir_minha_conta()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public'
  AS $function$
DECLARE
  authenticated_user_id uuid := auth.uid();
  authenticated_professor_id uuid;
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Sem usuário autenticado';
  END IF;

  SELECT id
    INTO authenticated_professor_id
    FROM public.professores
   WHERE user_id = authenticated_user_id;

  IF authenticated_professor_id IS NOT NULL THEN
    DELETE FROM public.mensagens_enviadas WHERE professor_id = authenticated_professor_id;
    DELETE FROM public.aulas WHERE professor_id = authenticated_professor_id;
    DELETE FROM public.cobrancas WHERE professor_id = authenticated_professor_id;
    DELETE FROM public.pacotes_aulas WHERE professor_id = authenticated_professor_id;
    DELETE FROM public.aulas_recorrentes WHERE professor_id = authenticated_professor_id;
    DELETE FROM public.bloqueios_data WHERE professor_id = authenticated_professor_id;
    DELETE FROM public.alunos WHERE professor_id = authenticated_professor_id;
    DELETE FROM public.professores WHERE id = authenticated_professor_id;
  END IF;

  DELETE FROM auth.users WHERE id = authenticated_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."excluir_minha_conta"() FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."excluir_minha_conta"() TO "authenticated", "postgres", "service_role";
