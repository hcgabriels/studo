CREATE OR REPLACE FUNCTION public.excluir_aluno (
  p_aluno_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'pg_catalog', 'public', 'private'
  AS $function$
DECLARE
  authenticated_professor_id uuid := private.meu_professor_id();
BEGIN
  IF authenticated_professor_id IS NULL THEN
    RAISE EXCEPTION 'Sem professor autenticado';
  END IF;

  DELETE FROM public.alunos
   WHERE id = p_aluno_id
     AND professor_id = authenticated_professor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno não encontrado para o professor autenticado';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."excluir_aluno"(uuid) FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."excluir_aluno"(uuid) TO "authenticated", "postgres", "service_role";
