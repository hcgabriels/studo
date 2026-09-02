CREATE OR REPLACE FUNCTION public.finalizar_onboarding (
  p_professor_id               uuid,
  p_pular                      boolean,
  p_endereco                   text,
  p_chave_pix                  text,
  p_cpf_cnpj                   text,
  p_cobrar_falta_sem_aviso     boolean,
  p_horas_antecedencia_aviso   integer,
  p_alunos                     jsonb
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'pg_catalog', 'public', 'private'
  AS $function$
DECLARE
  authenticated_professor_id uuid := private.meu_professor_id();
  already_completed boolean;
  imported_count integer := 0;
BEGIN
  IF authenticated_professor_id IS NULL OR p_professor_id IS DISTINCT FROM authenticated_professor_id THEN
    RAISE EXCEPTION 'Professor não autorizado';
  END IF;

  IF p_pular IS NULL THEN
    RAISE EXCEPTION 'Escolha de conclusão do onboarding inválida';
  END IF;

  IF jsonb_typeof(p_alunos) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Alunos do onboarding precisam ser uma lista';
  END IF;

  SELECT COALESCE(onboarding_completo, false)
    INTO already_completed
    FROM public.professores
   WHERE id = authenticated_professor_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado para o usuário autenticado';
  END IF;

  IF already_completed THEN
    RETURN 0;
  END IF;

  IF p_pular THEN
    UPDATE public.professores
       SET onboarding_completo = true,
           updated_at = now()
     WHERE id = authenticated_professor_id;
  ELSE
    IF p_cobrar_falta_sem_aviso IS NULL
       OR p_horas_antecedencia_aviso IS NULL
       OR p_horas_antecedencia_aviso NOT BETWEEN 0 AND 168 THEN
      RAISE EXCEPTION 'Política de faltas inválida';
    END IF;

    UPDATE public.professores
       SET endereco = NULLIF(btrim(p_endereco), ''),
           chave_pix = NULLIF(btrim(p_chave_pix), ''),
           cpf_cnpj = NULLIF(btrim(p_cpf_cnpj), ''),
           cobrar_falta_sem_aviso = p_cobrar_falta_sem_aviso,
           horas_antecedencia_aviso = p_horas_antecedencia_aviso,
           onboarding_completo = true,
           updated_at = now()
     WHERE id = authenticated_professor_id;

    IF jsonb_array_length(p_alunos) > 0 THEN
      imported_count := public.importar_alunos(
        authenticated_professor_id,
        p_alunos
      );
    END IF;
  END IF;

  RETURN imported_count;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."finalizar_onboarding"(uuid, boolean, text, text, text, boolean, integer, jsonb) FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."finalizar_onboarding"(uuid, boolean, text, text, text, boolean, integer, jsonb) TO "authenticated", "postgres", "service_role";
