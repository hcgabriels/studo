-- ============================================================================
-- Studoo · Migration de lançamento (agosto/2026)
--
-- HISTÓRICO: não execute este arquivo. A versão canônica e revisada está em
-- supabase/migrations/ e inclui o schema completo e hardening posterior.
--
-- Originalmente, este arquivo era colado inteiro no SQL Editor e desenhado
-- para ser idempotente. Esse fluxo foi aposentado.
--
-- Conteúdo:
--   1. RLS das 4 tabelas centrais  ← CRÍTICO, leia a nota abaixo
--   2. Colunas novas (dia_vencimento, data_inicio)
--   3. ON DELETE CASCADE (pra exclusão de aluno/conta não deixar órfão)
--   4. Funções transacionais (salvar horários, reagendar, contadores)
--   5. LGPD (excluir_minha_conta, excluir_aluno)
--   6. Verificação final
-- ============================================================================


-- ============================================================================
-- 1. ROW LEVEL SECURITY
--
-- MOTIVO: o repositório documentava policy só pra 4 tabelas
-- (bloqueios_data, aulas_recorrentes, pacotes_aulas, mensagens_enviadas).
-- As 4 CENTRAIS — professores, alunos, aulas, cobrancas — não tinham policy
-- versionada em lugar nenhum.
--
-- Isso importa porque a tela /alunos/:id consulta alunos, aulas, cobrancas e
-- mensagens filtrando SÓ por id/aluno_id, sem professor_id: a separação entre
-- professores depende inteiramente do RLS. Sem policy, qualquer usuário
-- autenticado que descubra um UUID lê nome, telefone, aniversário e histórico
-- financeiro de aluno de outro professor — direto na REST API, com a anon key
-- que é pública por natureza no bundle. Dado pessoal de menor de idade.
-- ============================================================================

ALTER TABLE professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE aulas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobrancas   ENABLE ROW LEVEL SECURITY;

-- professores: o dono é o próprio usuário autenticado.
DROP POLICY IF EXISTS "Professor gerencia o proprio perfil" ON professores;
CREATE POLICY "Professor gerencia o proprio perfil"
  ON professores FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Helper: id do professor logado. STABLE + SECURITY DEFINER pra não recursar
-- na policy de `professores` quando as outras tabelas consultarem.
CREATE OR REPLACE FUNCTION public.meu_professor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM professores WHERE user_id = auth.uid() LIMIT 1;
$$;

DROP POLICY IF EXISTS "Professor gerencia seus alunos" ON alunos;
CREATE POLICY "Professor gerencia seus alunos"
  ON alunos FOR ALL
  TO authenticated
  USING (professor_id = public.meu_professor_id())
  WITH CHECK (professor_id = public.meu_professor_id());

DROP POLICY IF EXISTS "Professor gerencia suas aulas" ON aulas;
CREATE POLICY "Professor gerencia suas aulas"
  ON aulas FOR ALL
  TO authenticated
  USING (professor_id = public.meu_professor_id())
  WITH CHECK (professor_id = public.meu_professor_id());

DROP POLICY IF EXISTS "Professor gerencia suas cobrancas" ON cobrancas;
CREATE POLICY "Professor gerencia suas cobrancas"
  ON cobrancas FOR ALL
  TO authenticated
  USING (professor_id = public.meu_professor_id())
  WITH CHECK (professor_id = public.meu_professor_id());

-- As 4 já documentadas: recria com `TO authenticated` e `WITH CHECK` explícito.
-- Além do professor_id, agora valida a COERÊNCIA do aluno_id — antes dava pra
-- inserir um pacote com o próprio professor_id e o aluno_id de terceiro.
DROP POLICY IF EXISTS "Professor gerencia seus bloqueios" ON bloqueios_data;
CREATE POLICY "Professor gerencia seus bloqueios"
  ON bloqueios_data FOR ALL
  TO authenticated
  USING (professor_id = public.meu_professor_id())
  WITH CHECK (professor_id = public.meu_professor_id());

DROP POLICY IF EXISTS "Professor gerencia suas aulas recorrentes" ON aulas_recorrentes;
CREATE POLICY "Professor gerencia suas aulas recorrentes"
  ON aulas_recorrentes FOR ALL
  TO authenticated
  USING (professor_id = public.meu_professor_id())
  WITH CHECK (
    professor_id = public.meu_professor_id()
    AND EXISTS (
      SELECT 1 FROM alunos a
       WHERE a.id = aulas_recorrentes.aluno_id
         AND a.professor_id = public.meu_professor_id()
    )
  );

DROP POLICY IF EXISTS "Professor gerencia seus pacotes" ON pacotes_aulas;
CREATE POLICY "Professor gerencia seus pacotes"
  ON pacotes_aulas FOR ALL
  TO authenticated
  USING (professor_id = public.meu_professor_id())
  WITH CHECK (
    professor_id = public.meu_professor_id()
    AND EXISTS (
      SELECT 1 FROM alunos a
       WHERE a.id = pacotes_aulas.aluno_id
         AND a.professor_id = public.meu_professor_id()
    )
  );

DROP POLICY IF EXISTS "Professor gerencia suas mensagens" ON mensagens_enviadas;
CREATE POLICY "Professor gerencia suas mensagens"
  ON mensagens_enviadas FOR ALL
  TO authenticated
  USING (professor_id = public.meu_professor_id())
  WITH CHECK (professor_id = public.meu_professor_id());


-- ============================================================================
-- 2. COLUNAS NOVAS
-- ============================================================================

-- Dia de vencimento configurável. Era fixo no dia 10, hardcoded no frontend —
-- quem cobra dia 5 não conseguia usar o Financeiro.
ALTER TABLE professores
  ADD COLUMN IF NOT EXISTS dia_vencimento smallint DEFAULT 10;

ALTER TABLE professores
  DROP CONSTRAINT IF EXISTS professores_dia_vencimento_check;
ALTER TABLE professores
  ADD CONSTRAINT professores_dia_vencimento_check
  CHECK (dia_vencimento IS NULL OR (dia_vencimento BETWEEN 1 AND 31));

-- Início da recorrência. Sem isso, aluno cadastrado hoje aparecia com aulas em
-- TODAS as semanas passadas, e o relatório do mês anterior contava essas aulas
-- fantasma como "previstas" — número em que o professor não confia.
ALTER TABLE aulas_recorrentes
  ADD COLUMN IF NOT EXISTS data_inicio date;

-- Backfill: recorrências que já existem começam na data de cadastro do aluno.
UPDATE aulas_recorrentes ar
   SET data_inicio = COALESCE(ar.data_inicio, a.created_at::date)
  FROM alunos a
 WHERE a.id = ar.aluno_id
   AND ar.data_inicio IS NULL;


-- ============================================================================
-- 3. ON DELETE CASCADE
--
-- Sem isso, excluir um aluno (direito LGPD) deixaria aula, cobrança, pacote e
-- mensagem órfãos — ou estouraria erro de foreign key.
-- ============================================================================

ALTER TABLE aulas_recorrentes DROP CONSTRAINT IF EXISTS aulas_recorrentes_aluno_id_fkey;
ALTER TABLE aulas_recorrentes
  ADD CONSTRAINT aulas_recorrentes_aluno_id_fkey
  FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE;

ALTER TABLE cobrancas DROP CONSTRAINT IF EXISTS cobrancas_aluno_id_fkey;
ALTER TABLE cobrancas
  ADD CONSTRAINT cobrancas_aluno_id_fkey
  FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE;

ALTER TABLE pacotes_aulas DROP CONSTRAINT IF EXISTS pacotes_aulas_aluno_id_fkey;
ALTER TABLE pacotes_aulas
  ADD CONSTRAINT pacotes_aulas_aluno_id_fkey
  FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE;

-- aulas.aluno_id é nullable (aula experimental não tem aluno cadastrado).
-- SET NULL preserva o histórico da agenda sem quebrar a integridade.
ALTER TABLE aulas DROP CONSTRAINT IF EXISTS aulas_aluno_id_fkey;
ALTER TABLE aulas
  ADD CONSTRAINT aulas_aluno_id_fkey
  FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE SET NULL;

ALTER TABLE mensagens_enviadas DROP CONSTRAINT IF EXISTS mensagens_enviadas_aluno_id_fkey;
ALTER TABLE mensagens_enviadas
  ADD CONSTRAINT mensagens_enviadas_aluno_id_fkey
  FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE SET NULL;


-- ============================================================================
-- 4. FUNÇÕES TRANSACIONAIS
--
-- Todas SECURITY INVOKER (default), então o RLS continua valendo dentro delas.
-- O ganho é atomicidade: uma função plpgsql roda numa transação só, então uma
-- falha no meio desfaz o começo.
-- ============================================================================

-- DROP antes de criar: o Postgres NÃO deixa `CREATE OR REPLACE FUNCTION`
-- renomear um parâmetro nem trocar o tipo de retorno. A `increment_reposicao`
-- que já existe no banco usa `aluno_id_param`; sem o DROP, o replace falha com
--   42P13: cannot change name of input parameter "aluno_id_param"
-- O DROP é por assinatura (tipo dos argumentos), então pega qualquer versão
-- anterior independente do nome do parâmetro.
DROP FUNCTION IF EXISTS public.salvar_horarios_aluno(uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS public.reagendar_aula(uuid, uuid, uuid, timestamptz, int);
DROP FUNCTION IF EXISTS public.increment_reposicao(uuid);
DROP FUNCTION IF EXISTS public.decrement_reposicao(uuid);
DROP FUNCTION IF EXISTS public.usar_aula_pacote(uuid);
DROP FUNCTION IF EXISTS public.excluir_aluno(uuid);
DROP FUNCTION IF EXISTS public.excluir_minha_conta();

-- 4.1 Salvar horários do aluno.
-- O client fazia DELETE de todos os recorrentes + INSERT dos novos, em duas
-- chamadas. Se o INSERT falhasse, o aluno ficava SEM NENHUM horário e sumia
-- da agenda.
CREATE OR REPLACE FUNCTION public.salvar_horarios_aluno(
  p_aluno_id     uuid,
  p_professor_id uuid,
  p_horarios     jsonb
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM aulas_recorrentes
   WHERE aluno_id = p_aluno_id
     AND professor_id = p_professor_id;

  INSERT INTO aulas_recorrentes
    (aluno_id, professor_id, dia_semana, horario, duracao_minutos, ativo, data_inicio)
  SELECT
    p_aluno_id,
    p_professor_id,
    (h->>'dia_semana')::int,
    (h->>'horario')::time,
    COALESCE((h->>'duracao_minutos')::int, 60),
    true,
    COALESCE(NULLIF(h->>'data_inicio', '')::date, CURRENT_DATE)
  FROM jsonb_array_elements(p_horarios) AS h;
END;
$$;

-- 4.2 Reagendar aula.
-- Eram dois requests: marcar a original como "reagendada" e inserir a nova.
-- Falha no segundo = aula simplesmente desaparecida da agenda.
CREATE OR REPLACE FUNCTION public.reagendar_aula(
  p_aula_id       uuid,
  p_professor_id  uuid,
  p_aluno_id      uuid,
  p_nova_data     timestamptz,
  p_duracao       int
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_nova_id uuid;
BEGIN
  IF p_aula_id IS NOT NULL THEN
    UPDATE aulas
       SET status = 'reagendada', updated_at = now()
     WHERE id = p_aula_id
       AND professor_id = p_professor_id;
  END IF;

  INSERT INTO aulas (aluno_id, professor_id, data_hora, duracao_minutos, status, tipo, reagendada_de)
  VALUES (p_aluno_id, p_professor_id, p_nova_data, COALESCE(p_duracao, 60), 'agendada', 'avulsa', p_aula_id)
  RETURNING id INTO v_nova_id;

  RETURN v_nova_id;
END;
$$;

-- 4.3 Contadores de reposição — versão atômica.
-- O client fazia read-modify-write: com o app aberto no celular e no desktop
-- dentro da janela de cache, os dois liam o mesmo valor e gravavam o mesmo
-- incremento. Uma reposição sumia (ou sobrava).
CREATE OR REPLACE FUNCTION public.increment_reposicao(p_aluno_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE alunos
     SET reposicoes_disponiveis = COALESCE(reposicoes_disponiveis, 0) + 1,
         updated_at = now()
   WHERE id = p_aluno_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_reposicao(p_aluno_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE alunos
     SET reposicoes_disponiveis = GREATEST(COALESCE(reposicoes_disponiveis, 0) - 1, 0),
         updated_at = now()
   WHERE id = p_aluno_id;
$$;

-- 4.4 Consumir 1 aula do pacote, sem estourar o total.
-- O client lia `aulas_usadas` do CACHE e gravava +1 — duas abas davam aula
-- grátis pro aluno. O WHERE garante a invariante no servidor.
-- Os nomes de retorno levam prefixo de propósito: `RETURNS TABLE (aulas_usadas
-- …)` cria uma variável plpgsql com o mesmo nome da coluna, e aí a referência
-- dentro do UPDATE fica ambígua ("column reference is ambiguous").
CREATE OR REPLACE FUNCTION public.usar_aula_pacote(p_pacote_id uuid)
RETURNS TABLE (out_aulas_usadas int, out_status text)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE pacotes_aulas p
     SET aulas_usadas = p.aulas_usadas + 1,
         status = CASE
                    WHEN p.aulas_usadas + 1 >= p.total_aulas THEN 'concluido'
                    ELSE p.status
                  END,
         updated_at = now()
   WHERE p.id = p_pacote_id
     AND p.aulas_usadas < p.total_aulas
     AND p.status = 'ativo'
  RETURNING p.aulas_usadas::int, p.status::text;
END;
$$;


-- ============================================================================
-- 5. LGPD
-- ============================================================================

-- 5.1 Excluir um aluno e tudo que veio junto.
CREATE OR REPLACE FUNCTION public.excluir_aluno(p_aluno_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_prof uuid := public.meu_professor_id();
BEGIN
  IF v_prof IS NULL THEN
    RAISE EXCEPTION 'Sem professor autenticado';
  END IF;

  -- O CASCADE da seção 3 cuida de recorrentes, cobranças e pacotes;
  -- aulas e mensagens ficam com aluno_id NULL (histórico da agenda).
  DELETE FROM alunos WHERE id = p_aluno_id AND professor_id = v_prof;
END;
$$;

-- 5.2 Excluir a própria conta.
-- SECURITY DEFINER porque precisa apagar de auth.users, que o usuário comum
-- não alcança. O search_path fixo evita hijacking.
CREATE OR REPLACE FUNCTION public.excluir_minha_conta()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_prof uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sem usuário autenticado';
  END IF;

  SELECT id INTO v_prof FROM professores WHERE user_id = v_uid;

  IF v_prof IS NOT NULL THEN
    DELETE FROM mensagens_enviadas WHERE professor_id = v_prof;
    DELETE FROM aulas              WHERE professor_id = v_prof;
    DELETE FROM cobrancas          WHERE professor_id = v_prof;
    DELETE FROM pacotes_aulas      WHERE professor_id = v_prof;
    DELETE FROM aulas_recorrentes  WHERE professor_id = v_prof;
    DELETE FROM bloqueios_data     WHERE professor_id = v_prof;
    DELETE FROM alunos             WHERE professor_id = v_prof;
    DELETE FROM professores        WHERE id = v_prof;
  END IF;

  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.excluir_minha_conta() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.excluir_minha_conta() TO authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_aluno(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_horarios_aluno(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reagendar_aula(uuid, uuid, uuid, timestamptz, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_reposicao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_reposicao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.usar_aula_pacote(uuid) TO authenticated;


-- ============================================================================
-- 6. VERIFICAÇÃO
--
-- Rode as três queries abaixo DEPOIS de aplicar. A primeira é a que importa:
-- todas as 8 tabelas precisam vir com rowsecurity = true.
-- ============================================================================

-- 6.1 RLS ligado em todas?
SELECT relname AS tabela, relrowsecurity AS rls_ligado
  FROM pg_class
 WHERE relname IN ('professores','alunos','aulas','cobrancas',
                   'aulas_recorrentes','pacotes_aulas','bloqueios_data','mensagens_enviadas')
 ORDER BY relname;

-- 6.2 Quais policies existem?
SELECT tablename, policyname, cmd, roles
  FROM pg_policies
 WHERE schemaname = 'public'
 ORDER BY tablename;

-- 6.3 As funções foram criadas?
SELECT proname, pg_get_function_identity_arguments(oid) AS args
  FROM pg_proc
 WHERE pronamespace = 'public'::regnamespace
   AND proname IN ('meu_professor_id','salvar_horarios_aluno','reagendar_aula',
                   'increment_reposicao','decrement_reposicao','usar_aula_pacote',
                   'excluir_aluno','excluir_minha_conta')
 ORDER BY proname;


-- ============================================================================
-- 6.4 VERIFICAÇÃO EM UMA QUERY SÓ
--
-- O SQL Editor do Supabase mostra apenas o resultado da ÚLTIMA query quando
-- você roda o arquivo inteiro — então as checagens 6.1 e 6.2 acima rodam mas
-- ficam invisíveis. Rode ESTA sozinha, num editor novo.
--
-- Toda linha precisa vir com resultado = OK.
-- ============================================================================

WITH tabelas AS (
  SELECT unnest(ARRAY['professores','alunos','aulas','cobrancas',
                      'aulas_recorrentes','pacotes_aulas',
                      'bloqueios_data','mensagens_enviadas']) AS nome
),
checagem AS (
  SELECT
    t.nome AS item,
    COALESCE(c.relrowsecurity, false) AS rls_ligado,
    (SELECT count(*) FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = t.nome) AS policies,
    (SELECT bool_or('authenticated' = ANY(p.roles)) FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = t.nome) AS so_autenticado
  FROM tabelas t
  LEFT JOIN pg_class c ON c.relname = t.nome
    AND c.relnamespace = 'public'::regnamespace
)
SELECT
  item,
  CASE WHEN rls_ligado AND policies > 0 AND so_autenticado
       THEN 'OK' ELSE 'FALTA CORRIGIR' END AS resultado,
  rls_ligado, policies
FROM checagem

UNION ALL

SELECT
  'FUNCOES (' || count(*) || '/8)',
  CASE WHEN count(*) = 8 THEN 'OK' ELSE 'FALTA CORRIGIR' END,
  NULL, NULL
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('meu_professor_id','salvar_horarios_aluno','reagendar_aula',
                  'increment_reposicao','decrement_reposicao','usar_aula_pacote',
                  'excluir_aluno','excluir_minha_conta')

UNION ALL

SELECT
  'COLUNAS NOVAS (' || count(*) || '/2)',
  CASE WHEN count(*) = 2 THEN 'OK' ELSE 'FALTA CORRIGIR' END,
  NULL, NULL
FROM information_schema.columns
WHERE (table_name = 'professores' AND column_name = 'dia_vencimento')
   OR (table_name = 'aulas_recorrentes' AND column_name = 'data_inicio')

ORDER BY 2 DESC, 1;
