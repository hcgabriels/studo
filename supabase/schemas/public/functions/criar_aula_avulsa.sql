CREATE OR REPLACE FUNCTION public.criar_aula_avulsa (
  p_professor_id            uuid,
  p_aluno_id                uuid,
  p_data_hora               timestamp with time zone,
  p_duracao                 integer,
  p_tipo                    text,
  p_aluno_experimental_nome text,
  p_eh_reposicao            boolean
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'pg_catalog', 'public', 'private'
  AS $function$
DECLARE
  authenticated_professor_id uuid := private.meu_professor_id();
  saved_aula_id uuid;
  affected_rows integer;
BEGIN
  IF authenticated_professor_id IS NULL OR p_professor_id IS DISTINCT FROM authenticated_professor_id THEN
    RAISE EXCEPTION 'Professor não autorizado';
  END IF;

  IF p_data_hora IS NULL OR p_duracao IS NULL OR p_duracao NOT BETWEEN 15 AND 480 THEN
    RAISE EXCEPTION 'Data ou duração de aula inválida';
  END IF;

  IF p_tipo NOT IN ('avulsa', 'experimental') THEN
    RAISE EXCEPTION 'Tipo de aula inválido';
  END IF;

  IF p_tipo = 'experimental' THEN
    IF p_aluno_id IS NOT NULL OR p_eh_reposicao OR NULLIF(btrim(p_aluno_experimental_nome), '') IS NULL THEN
      RAISE EXCEPTION 'Dados de aula experimental inválidos';
    END IF;
  ELSIF p_aluno_id IS NULL OR NOT EXISTS (
    SELECT 1
      FROM public.alunos
     WHERE id = p_aluno_id
       AND professor_id = authenticated_professor_id
  ) THEN
    RAISE EXCEPTION 'Aluno não pertence ao professor autenticado';
  END IF;

  IF p_eh_reposicao THEN
    UPDATE public.alunos
       SET reposicoes_disponiveis = reposicoes_disponiveis - 1,
           updated_at = now()
     WHERE id = p_aluno_id
       AND professor_id = authenticated_professor_id
       AND reposicoes_disponiveis > 0;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN
      RAISE EXCEPTION 'Aluno não possui reposição disponível';
    END IF;
  END IF;

  INSERT INTO public.aulas (
    aluno_id,
    professor_id,
    data_hora,
    duracao_minutos,
    status,
    tipo,
    aluno_experimental_nome,
    eh_reposicao
  )
  VALUES (
    p_aluno_id,
    authenticated_professor_id,
    p_data_hora,
    p_duracao,
    'agendada',
    p_tipo,
    CASE
      WHEN p_tipo = 'experimental' THEN btrim(p_aluno_experimental_nome)
      ELSE NULL
    END,
    p_eh_reposicao
  )
  RETURNING id INTO saved_aula_id;

  RETURN saved_aula_id;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."criar_aula_avulsa"(uuid, uuid, timestamp WITH time zone, integer, text, text, boolean) FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."criar_aula_avulsa"(uuid, uuid, timestamp WITH time zone, integer, text, text, boolean) TO "authenticated", "postgres", "service_role";
