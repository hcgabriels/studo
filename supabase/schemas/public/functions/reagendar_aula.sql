CREATE OR REPLACE FUNCTION public.reagendar_aula (
  p_aula_id       uuid,
  p_professor_id  uuid,
  p_aluno_id      uuid,
  p_data_original timestamp with time zone,
  p_nova_data     timestamp with time zone,
  p_duracao       integer
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'pg_catalog', 'public', 'private'
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION "public"."reagendar_aula"(uuid, uuid, uuid, timestamp WITH time zone, timestamp WITH time zone, integer) FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."reagendar_aula"(uuid, uuid, uuid, timestamp WITH time zone, timestamp WITH time zone, integer) TO "authenticated", "postgres", "service_role";
