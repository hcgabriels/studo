CREATE OR REPLACE FUNCTION public.importar_alunos (
  p_professor_id uuid,
  p_alunos       jsonb
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'pg_catalog', 'public', 'private'
  AS $function$
DECLARE
  authenticated_professor_id uuid := private.meu_professor_id();
  prepared_alunos jsonb;
  imported_count integer;
BEGIN
  IF authenticated_professor_id IS NULL OR p_professor_id IS DISTINCT FROM authenticated_professor_id THEN
    RAISE EXCEPTION 'Professor não autorizado';
  END IF;

  IF jsonb_typeof(p_alunos) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_alunos) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'Informe de 1 a 500 alunos para importar';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_alunos) AS aluno(item)
     WHERE NULLIF(btrim(item->>'nome'), '') IS NULL
        OR jsonb_typeof(COALESCE(item->'horarios', '[]'::jsonb)) IS DISTINCT FROM 'array'
        OR jsonb_array_length(COALESCE(item->'horarios', '[]'::jsonb)) > 20
        OR COALESCE(item->>'valor_mensalidade', '0') !~ '^[0-9]+([.][0-9]{1,2})?$'
  ) THEN
    RAISE EXCEPTION 'Dados de aluno inválidos na importação';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_alunos) AS aluno(item)
      CROSS JOIN LATERAL jsonb_array_elements(
        COALESCE(aluno.item->'horarios', '[]'::jsonb)
      ) AS horario(item)
     WHERE COALESCE(horario.item->>'dia_semana', '') !~ '^[0-6]$'
        OR COALESCE(horario.item->>'horario', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
        OR COALESCE(horario.item->>'duracao_minutos', '') !~ '^[0-9]{1,3}$'
  ) THEN
    RAISE EXCEPTION 'Horário inválido na importação';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_alunos) AS aluno(item)
      CROSS JOIN LATERAL jsonb_array_elements(
        COALESCE(aluno.item->'horarios', '[]'::jsonb)
      ) AS horario(item)
     WHERE (horario.item->>'duracao_minutos')::integer NOT BETWEEN 15 AND 480
  ) THEN
    RAISE EXCEPTION 'Duração inválida na importação';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_alunos) WITH ORDINALITY AS aluno(item, ordinalidade)
      CROSS JOIN LATERAL jsonb_array_elements(
        COALESCE(aluno.item->'horarios', '[]'::jsonb)
      ) AS horario(item)
     GROUP BY
       aluno.ordinalidade,
       (horario.item->>'dia_semana')::integer,
       (horario.item->>'horario')::time
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Um aluno possui dia e horário repetidos';
  END IF;

  SELECT jsonb_agg(
           aluno.item || jsonb_build_object('_id', gen_random_uuid())
           ORDER BY aluno.ordinalidade
         )
    INTO prepared_alunos
    FROM jsonb_array_elements(p_alunos) WITH ORDINALITY AS aluno(item, ordinalidade);

  INSERT INTO public.alunos (
    id,
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
  SELECT
    (input.item->>'_id')::uuid,
    authenticated_professor_id,
    btrim(input.item->>'nome'),
    COALESCE(btrim(input.item->>'instrumento'), ''),
    NULLIF(
      regexp_replace(COALESCE(input.item->>'telefone', ''), '[^0-9]', '', 'g'),
      ''
    ),
    CASE
      WHEN jsonb_array_length(COALESCE(input.item->'horarios', '[]'::jsonb)) > 0
        THEN (input.item->'horarios'->0->>'dia_semana')::integer
      ELSE NULL
    END,
    CASE
      WHEN jsonb_array_length(COALESCE(input.item->'horarios', '[]'::jsonb)) > 0
        THEN (input.item->'horarios'->0->>'horario')::time
      ELSE NULL
    END,
    CASE
      WHEN jsonb_array_length(COALESCE(input.item->'horarios', '[]'::jsonb)) > 0
        THEN (input.item->'horarios'->0->>'duracao_minutos')::integer
      ELSE 60
    END,
    COALESCE((input.item->>'valor_mensalidade')::numeric, 0),
    'ativo'
  FROM jsonb_array_elements(prepared_alunos) AS input(item);

  GET DIAGNOSTICS imported_count = ROW_COUNT;

  INSERT INTO public.aulas_recorrentes (
    aluno_id,
    professor_id,
    dia_semana,
    horario,
    duracao_minutos,
    ativo,
    data_inicio
  )
  SELECT
    (input.item->>'_id')::uuid,
    authenticated_professor_id,
    (horario.item->>'dia_semana')::integer,
    (horario.item->>'horario')::time,
    (horario.item->>'duracao_minutos')::integer,
    true,
    COALESCE(NULLIF(horario.item->>'data_inicio', '')::date, CURRENT_DATE)
  FROM jsonb_array_elements(prepared_alunos) AS input(item)
  CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE(input.item->'horarios', '[]'::jsonb)
  ) AS horario(item);

  RETURN imported_count;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."importar_alunos"(uuid, jsonb) FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."importar_alunos"(uuid, jsonb) TO "authenticated", "postgres", "service_role";
