CREATE OR REPLACE FUNCTION public.decrement_reposicao (
  p_aluno_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'pg_catalog', 'public', 'private'
  AS $function$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.alunos
     SET reposicoes_disponiveis = GREATEST(COALESCE(reposicoes_disponiveis, 0) - 1, 0),
         updated_at = now()
   WHERE id = p_aluno_id
     AND professor_id = private.meu_professor_id();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'Aluno não encontrado para o professor autenticado';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."decrement_reposicao"(uuid) FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."decrement_reposicao"(uuid) TO "authenticated", "postgres", "service_role";
