CREATE OR REPLACE FUNCTION public.converter_aula_experimental (
  p_aula_id          uuid,
  p_professor_id     uuid,
  p_nome             text,
  p_instrumento      text,
  p_telefone         text,
  p_dia_semana       integer,
  p_horario          time without time zone,
  p_duracao          integer,
  p_valor_mensalidade numeric
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'pg_catalog', 'public', 'private'
  AS $function$
DECLARE
  authenticated_professor_id uuid := private.meu_professor_id();
  trial_tipo text;
  trial_aluno_id uuid;
  novo_aluno_id uuid;
BEGIN
  IF authenticated_professor_id IS NULL OR p_professor_id IS DISTINCT FROM authenticated_professor_id THEN
    RAISE EXCEPTION 'Professor não autorizado';
  END IF;

  IF NULLIF(btrim(p_nome), '') IS NULL OR NULLIF(btrim(p_instrumento), '') IS NULL THEN
    RAISE EXCEPTION 'Nome e instrumento são obrigatórios';
  END IF;

  IF p_dia_semana IS NULL OR p_dia_semana NOT BETWEEN 0 AND 6 OR p_horario IS NULL THEN
    RAISE EXCEPTION 'Dia ou horário recorrente inválido';
  END IF;

  IF p_duracao IS NULL OR p_duracao NOT BETWEEN 15 AND 480 THEN
    RAISE EXCEPTION 'Duração de aula inválida';
  END IF;

  IF p_valor_mensalidade IS NULL OR p_valor_mensalidade <= 0 THEN
    RAISE EXCEPTION 'Mensalidade deve ser maior que zero';
  END IF;

  SELECT tipo, aluno_id
    INTO trial_tipo, trial_aluno_id
    FROM public.aulas
   WHERE id = p_aula_id
     AND professor_id = authenticated_professor_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aula não encontrada para o professor autenticado';
  END IF;

  IF trial_tipo IS DISTINCT FROM 'experimental' THEN
    RAISE EXCEPTION 'Aula informada não é experimental';
  END IF;

  IF trial_aluno_id IS NOT NULL THEN
    RAISE EXCEPTION 'Aula experimental já foi convertida';
  END IF;

  INSERT INTO public.alunos (
    professor_id,
    nome,
    instrumento,
    telefone,
    dia_semana,
    horario,
    duracao_minutos,
    valor_mensalidade,
    status
  )
  VALUES (
    authenticated_professor_id,
    btrim(p_nome),
    btrim(p_instrumento),
    NULLIF(regexp_replace(COALESCE(p_telefone, ''), '[^0-9]', '', 'g'), ''),
    p_dia_semana,
    p_horario,
    p_duracao,
    p_valor_mensalidade,
    'ativo'
  )
  RETURNING id INTO novo_aluno_id;

  INSERT INTO public.aulas_recorrentes (
    aluno_id,
    professor_id,
    dia_semana,
    horario,
    duracao_minutos,
    ativo,
    data_inicio
  )
  VALUES (
    novo_aluno_id,
    authenticated_professor_id,
    p_dia_semana,
    p_horario,
    p_duracao,
    true,
    CURRENT_DATE
  );

  UPDATE public.aulas
     SET aluno_id = novo_aluno_id,
         aluno_experimental_nome = NULL,
         updated_at = now()
   WHERE id = p_aula_id
     AND professor_id = authenticated_professor_id;

  RETURN novo_aluno_id;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."converter_aula_experimental"(uuid, uuid, text, text, text, integer, time WITHOUT time zone, integer, numeric) FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."converter_aula_experimental"(uuid, uuid, text, text, text, integer, time WITHOUT time zone, integer, numeric) TO "authenticated", "postgres", "service_role";
