CREATE OR REPLACE FUNCTION public.registrar_aula (
  p_aula_id      uuid,
  p_professor_id uuid,
  p_aluno_id     uuid,
  p_data_hora    timestamp with time zone,
  p_duracao      integer,
  p_status       text,
  p_observacao   text,
  p_licao_casa   text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'pg_catalog', 'public', 'private'
  AS $function$
DECLARE
  authenticated_professor_id uuid := private.meu_professor_id();
  persisted_aluno_id uuid;
  previous_status text;
  strict_no_show_policy boolean;
  granted_before boolean;
  grants_now boolean;
  saved_aula_id uuid;
  affected_rows integer;
BEGIN
  IF authenticated_professor_id IS NULL OR p_professor_id IS DISTINCT FROM authenticated_professor_id THEN
    RAISE EXCEPTION 'Professor não autorizado';
  END IF;

  IF p_status NOT IN ('realizada', 'falta_justificada', 'falta_sem_aviso') THEN
    RAISE EXCEPTION 'Status de aula inválido';
  END IF;

  IF p_data_hora IS NULL OR p_duracao IS NULL OR p_duracao NOT BETWEEN 15 AND 480 THEN
    RAISE EXCEPTION 'Data ou duração de aula inválida';
  END IF;

  SELECT cobrar_falta_sem_aviso
    INTO strict_no_show_policy
    FROM public.professores
   WHERE id = authenticated_professor_id;

  IF p_aula_id IS NOT NULL THEN
    SELECT aluno_id, status
      INTO persisted_aluno_id, previous_status
      FROM public.aulas
     WHERE id = p_aula_id
       AND professor_id = authenticated_professor_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Aula não encontrada para o professor autenticado';
    END IF;

    -- Aula reagendada não é mais "a aula" naquele horário: quem deve
    -- receber o registro de presença é a nova ocorrência criada pelo
    -- reagendamento. Sem essa trava, registrar aqui sobrescrevia o
    -- status 'reagendada' e apagava o rastro do reagendamento.
    IF previous_status = 'reagendada' THEN
      RAISE EXCEPTION 'Esta aula foi reagendada — registre a presença na nova data.';
    END IF;

    IF p_aluno_id IS DISTINCT FROM persisted_aluno_id THEN
      RAISE EXCEPTION 'Aluno informado não corresponde à aula';
    END IF;

    UPDATE public.aulas
       SET status = p_status,
           observacao = NULLIF(btrim(p_observacao), ''),
           licao_casa = NULLIF(btrim(p_licao_casa), ''),
           updated_at = now()
     WHERE id = p_aula_id
       AND professor_id = authenticated_professor_id
    RETURNING id INTO saved_aula_id;
  ELSE
    IF p_aluno_id IS NULL OR NOT EXISTS (
      SELECT 1
        FROM public.alunos
       WHERE id = p_aluno_id
         AND professor_id = authenticated_professor_id
    ) THEN
      RAISE EXCEPTION 'Aluno não pertence ao professor autenticado';
    END IF;

    persisted_aluno_id := p_aluno_id;

    INSERT INTO public.aulas (
      aluno_id,
      professor_id,
      data_hora,
      duracao_minutos,
      status,
      tipo,
      observacao,
      licao_casa
    )
    VALUES (
      persisted_aluno_id,
      authenticated_professor_id,
      p_data_hora,
      p_duracao,
      p_status,
      'recorrente',
      NULLIF(btrim(p_observacao), ''),
      NULLIF(btrim(p_licao_casa), '')
    )
    RETURNING id INTO saved_aula_id;
  END IF;

  granted_before := COALESCE(
    previous_status = 'falta_justificada'
    OR (
      previous_status = 'falta_sem_aviso'
      AND COALESCE(strict_no_show_policy, true) = false
    ),
    false
  );
  grants_now :=
    p_status = 'falta_justificada'
    OR (
      p_status = 'falta_sem_aviso'
      AND COALESCE(strict_no_show_policy, true) = false
    );

  IF persisted_aluno_id IS NOT NULL AND NOT granted_before AND grants_now THEN
    UPDATE public.alunos
       SET reposicoes_disponiveis = reposicoes_disponiveis + 1,
           updated_at = now()
     WHERE id = persisted_aluno_id
       AND professor_id = authenticated_professor_id;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN
      RAISE EXCEPTION 'Não foi possível creditar a reposição do aluno';
    END IF;
  ELSIF persisted_aluno_id IS NOT NULL AND granted_before AND NOT grants_now THEN
    UPDATE public.alunos
       SET reposicoes_disponiveis = GREATEST(reposicoes_disponiveis - 1, 0),
           updated_at = now()
     WHERE id = persisted_aluno_id
       AND professor_id = authenticated_professor_id;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN
      RAISE EXCEPTION 'Não foi possível reverter a reposição do aluno';
    END IF;
  END IF;

  RETURN saved_aula_id;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."registrar_aula"(uuid, uuid, uuid, timestamp WITH time zone, integer, text, text, text) FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."registrar_aula"(uuid, uuid, uuid, timestamp WITH time zone, integer, text, text, text) TO "authenticated", "postgres", "service_role";
