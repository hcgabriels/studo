-- ============================================================================
-- Studoo · Hardening pre-lancamento (agosto/2026)
--
-- Objetivo:
--   1. Tirar EXECUTE publico/anonimo das RPCs do app.
--   2. Mover o helper de RLS para schema nao exposto pela Data API.
--   3. Reduzir warnings do Supabase Advisor antes do beta.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE OR REPLACE FUNCTION private.meu_professor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.professores WHERE user_id = (select auth.uid()) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION private.meu_professor_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.meu_professor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.meu_professor_id() TO service_role;

DROP POLICY IF EXISTS "Professor gerencia seus alunos" ON public.alunos;
CREATE POLICY "Professor gerencia seus alunos"
  ON public.alunos FOR ALL
  TO authenticated
  USING (professor_id = private.meu_professor_id())
  WITH CHECK (professor_id = private.meu_professor_id());

DROP POLICY IF EXISTS "Professor gerencia suas aulas" ON public.aulas;
CREATE POLICY "Professor gerencia suas aulas"
  ON public.aulas FOR ALL
  TO authenticated
  USING (professor_id = private.meu_professor_id())
  WITH CHECK (professor_id = private.meu_professor_id());

DROP POLICY IF EXISTS "Professor gerencia suas cobrancas" ON public.cobrancas;
CREATE POLICY "Professor gerencia suas cobrancas"
  ON public.cobrancas FOR ALL
  TO authenticated
  USING (professor_id = private.meu_professor_id())
  WITH CHECK (professor_id = private.meu_professor_id());

DROP POLICY IF EXISTS "Professor gerencia seus bloqueios" ON public.bloqueios_data;
CREATE POLICY "Professor gerencia seus bloqueios"
  ON public.bloqueios_data FOR ALL
  TO authenticated
  USING (professor_id = private.meu_professor_id())
  WITH CHECK (professor_id = private.meu_professor_id());

DROP POLICY IF EXISTS "Professor gerencia suas aulas recorrentes" ON public.aulas_recorrentes;
CREATE POLICY "Professor gerencia suas aulas recorrentes"
  ON public.aulas_recorrentes FOR ALL
  TO authenticated
  USING (professor_id = private.meu_professor_id())
  WITH CHECK (
    professor_id = private.meu_professor_id()
    AND EXISTS (
      SELECT 1 FROM public.alunos a
       WHERE a.id = aulas_recorrentes.aluno_id
         AND a.professor_id = private.meu_professor_id()
    )
  );

DROP POLICY IF EXISTS "Professor gerencia seus pacotes" ON public.pacotes_aulas;
CREATE POLICY "Professor gerencia seus pacotes"
  ON public.pacotes_aulas FOR ALL
  TO authenticated
  USING (professor_id = private.meu_professor_id())
  WITH CHECK (
    professor_id = private.meu_professor_id()
    AND EXISTS (
      SELECT 1 FROM public.alunos a
       WHERE a.id = pacotes_aulas.aluno_id
         AND a.professor_id = private.meu_professor_id()
    )
  );

DROP POLICY IF EXISTS "Professor gerencia suas mensagens" ON public.mensagens_enviadas;
CREATE POLICY "Professor gerencia suas mensagens"
  ON public.mensagens_enviadas FOR ALL
  TO authenticated
  USING (professor_id = private.meu_professor_id())
  WITH CHECK (professor_id = private.meu_professor_id());

CREATE OR REPLACE FUNCTION public.excluir_aluno(p_aluno_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, private
AS $$
DECLARE
  v_prof uuid := private.meu_professor_id();
BEGIN
  IF v_prof IS NULL THEN
    RAISE EXCEPTION 'Sem professor autenticado';
  END IF;

  DELETE FROM public.alunos WHERE id = p_aluno_id AND professor_id = v_prof;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.meu_professor_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.increment_reposicao(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decrement_reposicao(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reagendar_aula(uuid, uuid, uuid, timestamptz, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.salvar_horarios_aluno(uuid, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.usar_aula_pacote(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.excluir_aluno(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.excluir_minha_conta() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.increment_reposicao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_reposicao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reagendar_aula(uuid, uuid, uuid, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_horarios_aluno(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.usar_aula_pacote(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_aluno(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_minha_conta() TO authenticated;

-- Performance: evita reavaliar auth.uid() por linha na policy de professores.
DROP POLICY IF EXISTS "Professor gerencia o proprio perfil" ON public.professores;
CREATE POLICY "Professor gerencia o proprio perfil"
  ON public.professores FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Performance: FKs usadas em cascata/joins precisam de indice de apoio.
CREATE INDEX IF NOT EXISTS idx_aulas_reagendada_de
  ON public.aulas (reagendada_de)
  WHERE reagendada_de IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_aulas_recorrentes_aluno_id
  ON public.aulas_recorrentes (aluno_id);

CREATE INDEX IF NOT EXISTS idx_aulas_recorrentes_professor_id
  ON public.aulas_recorrentes (professor_id);

CREATE INDEX IF NOT EXISTS idx_mensagens_enviadas_professor_id
  ON public.mensagens_enviadas (professor_id);

CREATE INDEX IF NOT EXISTS idx_pacotes_aulas_aluno_id
  ON public.pacotes_aulas (aluno_id);

CREATE INDEX IF NOT EXISTS idx_pacotes_aulas_professor_id
  ON public.pacotes_aulas (professor_id);

ALTER TABLE public.cobrancas
  DROP CONSTRAINT IF EXISTS cobrancas_aluno_mes_unique;

ALTER TABLE public.professores
  DROP CONSTRAINT IF EXISTS professores_user_id_unique;
