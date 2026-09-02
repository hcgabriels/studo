CREATE OR REPLACE FUNCTION public.salvar_aluno_com_horarios (
  p_aluno_id          uuid,
  p_professor_id      uuid,
  p_nome              text,
  p_instrumento       text,
  p_nivel             text,
  p_objetivo          text,
  p_telefone          text,
  p_email_notificacao text,
  p_nome_responsavel  text,
  p_data_nascimento   date,
  p_valor_mensalidade numeric,
  p_observacoes       text,
  p_horarios          jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'pg_catalog', 'public', 'private'
  AS $function$
DECLARE
  authenticated_professor_id uuid := private.meu_professor_id();
  saved_aluno_id uuid := p_aluno_id;
  primeiro_horario jsonb;
BEGIN
  IF authenticated_professor_id IS NULL OR p_professor_id IS DISTINCT FROM authenticated_professor_id THEN
    RAISE EXCEPTION 'Professor não autorizado';
  END IF;

  IF NULLIF(btrim(p_nome), '') IS NULL OR NULLIF(btrim(p_instrumento), '') IS NULL THEN
    RAISE EXCEPTION 'Nome e instrumento são obrigatórios';
  END IF;

  IF p_nivel IS NOT NULL AND p_nivel NOT IN ('Iniciante', 'Intermediário', 'Avançado') THEN
    RAISE EXCEPTION 'Nível do aluno inválido';
  END IF;

  IF p_valor_mensalidade IS NULL OR p_valor_mensalidade <= 0 THEN
    RAISE EXCEPTION 'Mensalidade deve ser maior que zero';
  END IF;

  IF jsonb_typeof(p_horarios) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_horarios) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Informe de 1 a 20 horários recorrentes';
  END IF;

  primeiro_horario := p_horarios->0;

  IF saved_aluno_id IS NULL THEN
    INSERT INTO public.alunos (
      professor_id,
      nome,
      instrumento,
      nivel,
      objetivo,
      telefone,
      email_notificacao,
      nome_responsavel,
      data_nascimento,
      dia_semana,
      horario,
      duracao_minutos,
      valor_mensalidade,
      observacoes,
      status
    )
    VALUES (
      authenticated_professor_id,
      btrim(p_nome),
      btrim(p_instrumento),
      p_nivel,
      NULLIF(btrim(p_objetivo), ''),
      NULLIF(regexp_replace(COALESCE(p_telefone, ''), '[^0-9]', '', 'g'), ''),
      NULLIF(btrim(p_email_notificacao), ''),
      NULLIF(btrim(p_nome_responsavel), ''),
      p_data_nascimento,
      (primeiro_horario->>'dia_semana')::integer,
      (primeiro_horario->>'horario')::time,
      (primeiro_horario->>'duracao_minutos')::integer,
      p_valor_mensalidade,
      NULLIF(btrim(p_observacoes), ''),
      'ativo'
    )
    RETURNING id INTO saved_aluno_id;
  ELSE
    PERFORM 1
      FROM public.alunos
     WHERE id = saved_aluno_id
       AND professor_id = authenticated_professor_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Aluno não encontrado para o professor autenticado';
    END IF;

    UPDATE public.alunos
       SET nome = btrim(p_nome),
           instrumento = btrim(p_instrumento),
           nivel = p_nivel,
           objetivo = NULLIF(btrim(p_objetivo), ''),
           telefone = NULLIF(regexp_replace(COALESCE(p_telefone, ''), '[^0-9]', '', 'g'), ''),
           email_notificacao = NULLIF(btrim(p_email_notificacao), ''),
           nome_responsavel = NULLIF(btrim(p_nome_responsavel), ''),
           data_nascimento = p_data_nascimento,
           dia_semana = (primeiro_horario->>'dia_semana')::integer,
           horario = (primeiro_horario->>'horario')::time,
           duracao_minutos = (primeiro_horario->>'duracao_minutos')::integer,
           valor_mensalidade = p_valor_mensalidade,
           observacoes = NULLIF(btrim(p_observacoes), ''),
           updated_at = now()
     WHERE id = saved_aluno_id
       AND professor_id = authenticated_professor_id;
  END IF;

  PERFORM public.salvar_horarios_aluno(
    saved_aluno_id,
    authenticated_professor_id,
    p_horarios
  );

  RETURN saved_aluno_id;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."salvar_aluno_com_horarios"(uuid, uuid, text, text, text, text, text, text, text, date, numeric, text, jsonb) FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."salvar_aluno_com_horarios"(uuid, uuid, text, text, text, text, text, text, text, date, numeric, text, jsonb) TO "authenticated", "postgres", "service_role";
