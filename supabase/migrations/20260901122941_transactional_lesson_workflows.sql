-- Keep lesson history and replacement-credit balances consistent. Each RPC
-- below is one PostgreSQL transaction and derives tenant ownership from auth.

CREATE OR REPLACE FUNCTION public.registrar_aula(
  p_aula_id uuid,
  p_professor_id uuid,
  p_aluno_id uuid,
  p_data_hora timestamptz,
  p_duracao integer,
  p_status text,
  p_observacao text,
  p_licao_casa text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.criar_aula_avulsa(
  p_professor_id uuid,
  p_aluno_id uuid,
  p_data_hora timestamptz,
  p_duracao integer,
  p_tipo text,
  p_aluno_experimental_nome text,
  p_eh_reposicao boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
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
$$;

DROP FUNCTION IF EXISTS public.reagendar_aula(uuid, uuid, uuid, timestamptz, integer);

CREATE FUNCTION public.reagendar_aula(
  p_aula_id uuid,
  p_professor_id uuid,
  p_aluno_id uuid,
  p_data_original timestamptz,
  p_nova_data timestamptz,
  p_duracao integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  authenticated_professor_id uuid := private.meu_professor_id();
  original_aula_id uuid := p_aula_id;
  original_aluno_id uuid;
  original_tipo text;
  original_experimental_name text;
  nova_aula_id uuid;
BEGIN
  IF authenticated_professor_id IS NULL OR p_professor_id IS DISTINCT FROM authenticated_professor_id THEN
    RAISE EXCEPTION 'Professor não autorizado';
  END IF;

  IF p_nova_data IS NULL OR p_duracao IS NULL OR p_duracao NOT BETWEEN 15 AND 480 THEN
    RAISE EXCEPTION 'Data ou duração de aula inválida';
  END IF;

  IF original_aula_id IS NOT NULL THEN
    SELECT aluno_id, tipo, aluno_experimental_nome
      INTO original_aluno_id, original_tipo, original_experimental_name
      FROM public.aulas
     WHERE id = original_aula_id
       AND professor_id = authenticated_professor_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Aula original não encontrada para o professor autenticado';
    END IF;

    IF p_aluno_id IS DISTINCT FROM original_aluno_id THEN
      RAISE EXCEPTION 'Aluno informado não corresponde à aula original';
    END IF;

    UPDATE public.aulas
       SET status = 'reagendada', updated_at = now()
     WHERE id = original_aula_id
       AND professor_id = authenticated_professor_id;
  ELSE
    IF p_data_original IS NULL THEN
      RAISE EXCEPTION 'Data da aula original é obrigatória';
    END IF;

    IF p_aluno_id IS NULL OR NOT EXISTS (
      SELECT 1
        FROM public.alunos
       WHERE id = p_aluno_id
         AND professor_id = authenticated_professor_id
    ) THEN
      RAISE EXCEPTION 'Aluno não pertence ao professor autenticado';
    END IF;

    original_aluno_id := p_aluno_id;
    original_tipo := 'recorrente';

    INSERT INTO public.aulas (
      aluno_id,
      professor_id,
      data_hora,
      duracao_minutos,
      status,
      tipo
    )
    VALUES (
      original_aluno_id,
      authenticated_professor_id,
      p_data_original,
      p_duracao,
      'reagendada',
      original_tipo
    )
    RETURNING id INTO original_aula_id;
  END IF;

  INSERT INTO public.aulas (
    aluno_id,
    professor_id,
    data_hora,
    duracao_minutos,
    status,
    tipo,
    reagendada_de,
    aluno_experimental_nome
  )
  VALUES (
    original_aluno_id,
    authenticated_professor_id,
    p_nova_data,
    p_duracao,
    'agendada',
    CASE WHEN original_tipo = 'experimental' THEN 'experimental' ELSE 'avulsa' END,
    original_aula_id,
    CASE WHEN original_tipo = 'experimental' THEN original_experimental_name ELSE NULL END
  )
  RETURNING id INTO nova_aula_id;

  RETURN nova_aula_id;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_aula(uuid, uuid, uuid, timestamptz, integer, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.criar_aula_avulsa(uuid, uuid, timestamptz, integer, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reagendar_aula(uuid, uuid, uuid, timestamptz, timestamptz, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.registrar_aula(uuid, uuid, uuid, timestamptz, integer, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.criar_aula_avulsa(uuid, uuid, timestamptz, integer, text, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reagendar_aula(uuid, uuid, uuid, timestamptz, timestamptz, integer) TO authenticated, service_role;
