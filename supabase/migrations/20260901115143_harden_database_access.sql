-- Enforce tenant ownership at both the row-policy and RPC boundaries, and
-- replace the broad grants found in the linked production schema.

-- Abort without changing data if historical rows already cross tenants.
DO $$
DECLARE
  invalid_aulas bigint;
  invalid_cobrancas bigint;
  invalid_recorrentes bigint;
  invalid_pacotes bigint;
  invalid_mensagens bigint;
BEGIN
  SELECT count(*)
    INTO invalid_aulas
    FROM public.aulas AS aula
    JOIN public.alunos AS aluno ON aluno.id = aula.aluno_id
   WHERE aula.professor_id <> aluno.professor_id;

  SELECT count(*)
    INTO invalid_cobrancas
    FROM public.cobrancas AS cobranca
    JOIN public.alunos AS aluno ON aluno.id = cobranca.aluno_id
   WHERE cobranca.professor_id <> aluno.professor_id;

  SELECT count(*)
    INTO invalid_recorrentes
    FROM public.aulas_recorrentes AS recorrente
    JOIN public.alunos AS aluno ON aluno.id = recorrente.aluno_id
   WHERE recorrente.professor_id <> aluno.professor_id;

  SELECT count(*)
    INTO invalid_pacotes
    FROM public.pacotes_aulas AS pacote
    JOIN public.alunos AS aluno ON aluno.id = pacote.aluno_id
   WHERE pacote.professor_id <> aluno.professor_id;

  SELECT count(*)
    INTO invalid_mensagens
    FROM public.mensagens_enviadas AS mensagem
    JOIN public.alunos AS aluno ON aluno.id = mensagem.aluno_id
   WHERE mensagem.professor_id <> aluno.professor_id;

  IF invalid_aulas + invalid_cobrancas + invalid_recorrentes + invalid_pacotes + invalid_mensagens > 0 THEN
    RAISE EXCEPTION
      USING
        MESSAGE = format(
          'Foram encontradas referências entre professores: aulas=%s, cobrancas=%s, recorrentes=%s, pacotes=%s, mensagens=%s.',
          invalid_aulas,
          invalid_cobrancas,
          invalid_recorrentes,
          invalid_pacotes,
          invalid_mensagens
        ),
        HINT = 'Revise os registros antes de reaplicar. A migração não altera nem remove esses dados.';
  END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
REVOKE CREATE ON SCHEMA private FROM authenticated, service_role;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.meu_professor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT id
    FROM public.professores
   WHERE user_id = (SELECT auth.uid())
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION private.meu_professor_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.meu_professor_id() TO authenticated, service_role;

-- Remove every pre-existing app policy. Permissive PostgreSQL policies combine
-- with OR, so leaving one historical `USING (true)` would defeat hardening.
DO $$
DECLARE
  existing_policy record;
BEGIN
  FOR existing_policy IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN (
         'professores',
         'alunos',
         'aulas',
         'cobrancas',
         'bloqueios_data',
         'aulas_recorrentes',
         'pacotes_aulas',
         'mensagens_enviadas'
       )
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  END LOOP;
END
$$;

ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueios_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas_recorrentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacotes_aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_enviadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professor gerencia o proprio perfil"
  ON public.professores
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Professor gerencia seus alunos"
  ON public.alunos
  FOR ALL
  TO authenticated
  USING (professor_id = private.meu_professor_id())
  WITH CHECK (professor_id = private.meu_professor_id());

CREATE POLICY "Professor gerencia suas aulas"
  ON public.aulas
  FOR ALL
  TO authenticated
  USING (
    professor_id = private.meu_professor_id()
    AND (
      aluno_id IS NULL
      OR EXISTS (
        SELECT 1
          FROM public.alunos AS aluno
         WHERE aluno.id = aulas.aluno_id
           AND aluno.professor_id = private.meu_professor_id()
      )
    )
  )
  WITH CHECK (
    professor_id = private.meu_professor_id()
    AND (
      aluno_id IS NULL
      OR EXISTS (
        SELECT 1
          FROM public.alunos AS aluno
         WHERE aluno.id = aulas.aluno_id
           AND aluno.professor_id = private.meu_professor_id()
      )
    )
  );

CREATE POLICY "Professor gerencia suas cobrancas"
  ON public.cobrancas
  FOR ALL
  TO authenticated
  USING (
    professor_id = private.meu_professor_id()
    AND EXISTS (
      SELECT 1
        FROM public.alunos AS aluno
       WHERE aluno.id = cobrancas.aluno_id
         AND aluno.professor_id = private.meu_professor_id()
    )
  )
  WITH CHECK (
    professor_id = private.meu_professor_id()
    AND EXISTS (
      SELECT 1
        FROM public.alunos AS aluno
       WHERE aluno.id = cobrancas.aluno_id
         AND aluno.professor_id = private.meu_professor_id()
    )
  );

CREATE POLICY "Professor gerencia seus bloqueios"
  ON public.bloqueios_data
  FOR ALL
  TO authenticated
  USING (professor_id = private.meu_professor_id())
  WITH CHECK (professor_id = private.meu_professor_id());

CREATE POLICY "Professor gerencia suas aulas recorrentes"
  ON public.aulas_recorrentes
  FOR ALL
  TO authenticated
  USING (
    professor_id = private.meu_professor_id()
    AND EXISTS (
      SELECT 1
        FROM public.alunos AS aluno
       WHERE aluno.id = aulas_recorrentes.aluno_id
         AND aluno.professor_id = private.meu_professor_id()
    )
  )
  WITH CHECK (
    professor_id = private.meu_professor_id()
    AND EXISTS (
      SELECT 1
        FROM public.alunos AS aluno
       WHERE aluno.id = aulas_recorrentes.aluno_id
         AND aluno.professor_id = private.meu_professor_id()
    )
  );

CREATE POLICY "Professor gerencia seus pacotes"
  ON public.pacotes_aulas
  FOR ALL
  TO authenticated
  USING (
    professor_id = private.meu_professor_id()
    AND EXISTS (
      SELECT 1
        FROM public.alunos AS aluno
       WHERE aluno.id = pacotes_aulas.aluno_id
         AND aluno.professor_id = private.meu_professor_id()
    )
  )
  WITH CHECK (
    professor_id = private.meu_professor_id()
    AND EXISTS (
      SELECT 1
        FROM public.alunos AS aluno
       WHERE aluno.id = pacotes_aulas.aluno_id
         AND aluno.professor_id = private.meu_professor_id()
    )
  );

CREATE POLICY "Professor gerencia suas mensagens"
  ON public.mensagens_enviadas
  FOR ALL
  TO authenticated
  USING (
    professor_id = private.meu_professor_id()
    AND (
      aluno_id IS NULL
      OR EXISTS (
        SELECT 1
          FROM public.alunos AS aluno
         WHERE aluno.id = mensagens_enviadas.aluno_id
           AND aluno.professor_id = private.meu_professor_id()
      )
    )
  )
  WITH CHECK (
    professor_id = private.meu_professor_id()
    AND (
      aluno_id IS NULL
      OR EXISTS (
        SELECT 1
          FROM public.alunos AS aluno
         WHERE aluno.id = mensagens_enviadas.aluno_id
           AND aluno.professor_id = private.meu_professor_id()
      )
    )
  );

-- RPCs keep their public signatures for frontend compatibility, but ownership
-- is derived from auth.uid(); client-supplied professor IDs are never trusted.
CREATE OR REPLACE FUNCTION public.salvar_horarios_aluno(
  p_aluno_id uuid,
  p_professor_id uuid,
  p_horarios jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  authenticated_professor_id uuid := private.meu_professor_id();
BEGIN
  IF authenticated_professor_id IS NULL OR p_professor_id IS DISTINCT FROM authenticated_professor_id THEN
    RAISE EXCEPTION 'Professor não autorizado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.alunos
     WHERE id = p_aluno_id
       AND professor_id = authenticated_professor_id
  ) THEN
    RAISE EXCEPTION 'Aluno não pertence ao professor autenticado';
  END IF;

  IF jsonb_typeof(p_horarios) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Horários precisam ser enviados como uma lista';
  END IF;

  IF jsonb_array_length(p_horarios) > 20 THEN
    RAISE EXCEPTION 'Limite de 20 horários por aluno excedido';
  END IF;

  DELETE FROM public.aulas_recorrentes
   WHERE aluno_id = p_aluno_id
     AND professor_id = authenticated_professor_id;

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
    p_aluno_id,
    authenticated_professor_id,
    (horario->>'dia_semana')::integer,
    (horario->>'horario')::time,
    COALESCE((horario->>'duracao_minutos')::integer, 60),
    true,
    COALESCE(NULLIF(horario->>'data_inicio', '')::date, CURRENT_DATE)
  FROM jsonb_array_elements(p_horarios) AS horario;
END;
$$;

CREATE OR REPLACE FUNCTION public.reagendar_aula(
  p_aula_id uuid,
  p_professor_id uuid,
  p_aluno_id uuid,
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
  nova_aula_id uuid;
  affected_rows integer;
BEGIN
  IF authenticated_professor_id IS NULL OR p_professor_id IS DISTINCT FROM authenticated_professor_id THEN
    RAISE EXCEPTION 'Professor não autorizado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.alunos
     WHERE id = p_aluno_id
       AND professor_id = authenticated_professor_id
  ) THEN
    RAISE EXCEPTION 'Aluno não pertence ao professor autenticado';
  END IF;

  IF p_nova_data IS NULL OR p_duracao IS NULL OR p_duracao NOT BETWEEN 15 AND 480 THEN
    RAISE EXCEPTION 'Data ou duração de aula inválida';
  END IF;

  IF p_aula_id IS NOT NULL THEN
    UPDATE public.aulas
       SET status = 'reagendada', updated_at = now()
     WHERE id = p_aula_id
       AND professor_id = authenticated_professor_id;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN
      RAISE EXCEPTION 'Aula original não encontrada para o professor autenticado';
    END IF;
  END IF;

  INSERT INTO public.aulas (
    aluno_id,
    professor_id,
    data_hora,
    duracao_minutos,
    status,
    tipo,
    reagendada_de
  )
  VALUES (
    p_aluno_id,
    authenticated_professor_id,
    p_nova_data,
    p_duracao,
    'agendada',
    'avulsa',
    p_aula_id
  )
  RETURNING id INTO nova_aula_id;

  RETURN nova_aula_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_reposicao(p_aluno_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.alunos
     SET reposicoes_disponiveis = COALESCE(reposicoes_disponiveis, 0) + 1,
         updated_at = now()
   WHERE id = p_aluno_id
     AND professor_id = private.meu_professor_id();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'Aluno não encontrado para o professor autenticado';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_reposicao(p_aluno_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.alunos
     SET reposicoes_disponiveis = GREATEST(COALESCE(reposicoes_disponiveis, 0) - 1, 0),
         updated_at = now()
   WHERE id = p_aluno_id
     AND professor_id = private.meu_professor_id();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'Aluno não encontrado para o professor autenticado';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.usar_aula_pacote(p_pacote_id uuid)
RETURNS TABLE (out_aulas_usadas integer, out_status text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.pacotes_aulas AS pacote
     SET aulas_usadas = pacote.aulas_usadas + 1,
         status = CASE
           WHEN pacote.aulas_usadas + 1 >= pacote.total_aulas THEN 'concluido'
           ELSE pacote.status
         END,
         updated_at = now()
   WHERE pacote.id = p_pacote_id
     AND pacote.professor_id = private.meu_professor_id()
     AND pacote.aulas_usadas < pacote.total_aulas
     AND pacote.status = 'ativo'
  RETURNING pacote.aulas_usadas::integer, pacote.status::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.excluir_aluno(p_aluno_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.excluir_minha_conta()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
  authenticated_professor_id uuid;
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Sem usuário autenticado';
  END IF;

  SELECT id
    INTO authenticated_professor_id
    FROM public.professores
   WHERE user_id = authenticated_user_id;

  IF authenticated_professor_id IS NOT NULL THEN
    DELETE FROM public.mensagens_enviadas WHERE professor_id = authenticated_professor_id;
    DELETE FROM public.aulas WHERE professor_id = authenticated_professor_id;
    DELETE FROM public.cobrancas WHERE professor_id = authenticated_professor_id;
    DELETE FROM public.pacotes_aulas WHERE professor_id = authenticated_professor_id;
    DELETE FROM public.aulas_recorrentes WHERE professor_id = authenticated_professor_id;
    DELETE FROM public.bloqueios_data WHERE professor_id = authenticated_professor_id;
    DELETE FROM public.alunos WHERE professor_id = authenticated_professor_id;
    DELETE FROM public.professores WHERE id = authenticated_professor_id;
  END IF;

  DELETE FROM auth.users WHERE id = authenticated_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.professores (user_id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(COALESCE(NEW.email, ''), '@', 1)),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  ddl_command record;
BEGIN
  FOR ddl_command IN
    SELECT *
      FROM pg_event_trigger_ddl_commands()
     WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
       AND object_type IN ('table', 'partitioned table')
  LOOP
    IF ddl_command.schema_name = 'public' THEN
      EXECUTE format(
        'ALTER TABLE IF EXISTS %s ENABLE ROW LEVEL SECURITY',
        ddl_command.object_identity
      );
    END IF;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_event_trigger
     WHERE evtname = 'ensure_rls'
  ) THEN
    CREATE EVENT TRIGGER ensure_rls
      ON ddl_command_end
      WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      EXECUTE FUNCTION public.rls_auto_enable();
  END IF;
END
$$;

-- The old public helper is not used by the application and needlessly exposes
-- an ownership lookup through the Data API.
DROP FUNCTION IF EXISTS public.meu_professor_id();

-- Explicit least-privilege table access. `anon` is only used by Supabase Auth
-- in this product and needs no direct access to application tables.
REVOKE ALL PRIVILEGES ON TABLE
  public.professores,
  public.alunos,
  public.aulas,
  public.cobrancas,
  public.bloqueios_data,
  public.aulas_recorrentes,
  public.pacotes_aulas,
  public.mensagens_enviadas
FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.professores,
  public.alunos,
  public.aulas,
  public.cobrancas,
  public.bloqueios_data,
  public.aulas_recorrentes,
  public.pacotes_aulas,
  public.mensagens_enviadas
TO authenticated;

GRANT ALL PRIVILEGES ON TABLE
  public.professores,
  public.alunos,
  public.aulas,
  public.cobrancas,
  public.bloqueios_data,
  public.aulas_recorrentes,
  public.pacotes_aulas,
  public.mensagens_enviadas
TO service_role;

REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.salvar_horarios_aluno(uuid, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reagendar_aula(uuid, uuid, uuid, timestamptz, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_reposicao(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decrement_reposicao(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.usar_aula_pacote(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.excluir_aluno(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.excluir_minha_conta() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.salvar_horarios_aluno(uuid, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reagendar_aula(uuid, uuid, uuid, timestamptz, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_reposicao(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_reposicao(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.usar_aula_pacote(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.excluir_aluno(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.excluir_minha_conta() TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;

-- Future objects must not silently inherit the permissive cloud defaults.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;
