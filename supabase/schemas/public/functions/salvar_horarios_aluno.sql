CREATE OR REPLACE FUNCTION public.salvar_horarios_aluno (
  p_aluno_id     uuid,
  p_professor_id uuid,
  p_horarios     jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'pg_catalog', 'public', 'private'
  AS $function$
DECLARE
  authenticated_professor_id uuid := private.meu_professor_id();
BEGIN
  IF authenticated_professor_id IS NULL OR p_professor_id IS DISTINCT FROM authenticated_professor_id THEN
    RAISE EXCEPTION 'Professor não autorizado';
  END IF;

  PERFORM 1
    FROM public.alunos
   WHERE id = p_aluno_id
     AND professor_id = authenticated_professor_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno não pertence ao professor autenticado';
  END IF;

  IF jsonb_typeof(p_horarios) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Horários precisam ser enviados como uma lista';
  END IF;

  IF jsonb_array_length(p_horarios) > 20 THEN
    RAISE EXCEPTION 'Limite de 20 horários por aluno excedido';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_horarios) AS h
     WHERE COALESCE(h->>'dia_semana', '') !~ '^[0-6]$'
        OR COALESCE(h->>'horario', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
        OR COALESCE(h->>'duracao_minutos', '') !~ '^[0-9]{1,3}$'
  ) THEN
    RAISE EXCEPTION 'Horário recorrente inválido';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_horarios) AS h
     WHERE (h->>'duracao_minutos')::integer NOT BETWEEN 15 AND 480
  ) THEN
    RAISE EXCEPTION 'Duração recorrente inválida';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_horarios) AS h
     GROUP BY (h->>'dia_semana')::integer, (h->>'horario')::time
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Não repita o mesmo dia e horário';
  END IF;

  DELETE FROM public.aulas_recorrentes
   WHERE aluno_id = p_aluno_id
     AND professor_id = authenticated_professor_id;

  INSERT INTO public.aulas_recorrentes
    (aluno_id, professor_id, dia_semana, horario, duracao_minutos, ativo, data_inicio)
  SELECT
    p_aluno_id,
    authenticated_professor_id,
    (h->>'dia_semana')::int,
    (h->>'horario')::time,
    COALESCE((h->>'duracao_minutos')::int, 60),
    true,
    COALESCE(NULLIF(h->>'data_inicio', '')::date, CURRENT_DATE)
  FROM jsonb_array_elements(p_horarios) AS h;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."salvar_horarios_aluno"(uuid, uuid, jsonb) FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."salvar_horarios_aluno"(uuid, uuid, jsonb) TO "authenticated", "postgres", "service_role";
