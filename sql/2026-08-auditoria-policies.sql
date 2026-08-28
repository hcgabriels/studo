-- ============================================================================
-- Studoo · Auditoria de policies (agosto/2026)
--
-- POR QUE ISSO EXISTE
--
-- Policies de RLS são PERMISSIVAS por padrão e se somam por OR. Ter a policy
-- certa não protege nada se sobrar uma antiga larga do lado — basta UMA com
-- `USING (true)` pra liberar a tabela inteira, e o Postgres não avisa.
--
-- A migration de lançamento removeu as policies pelo nome que ela mesma usa.
-- Policies criadas antes com OUTRO nome (pela UI do Supabase, por sprints
-- anteriores, pelo template "Enable read access for all users") continuam lá,
-- valendo.
--
-- COMO USAR
--
-- É UMA query só, de propósito: o SQL Editor do Supabase exibe apenas o
-- resultado da última instrução, então arquivo com várias queries esconde as
-- anteriores. Selecione tudo abaixo e rode.
--
-- A coluna `veredito` ordena o resultado por gravidade:
--
--   3. PERIGO ...          → buraco aberto. Remova AGORA. Se aparecer aqui,
--                            considere que o dado esteve exposto.
--                            ATENCAO: o criterio e a EXPRESSAO, nao o papel.
--                            Policy sem `TO` vale pro papel `public` (que
--                            inclui `anon`), mas se o filtro for
--                            `user_id = auth.uid()` ela nao libera nada pra
--                            quem nao logou: `auth.uid()` e NULL, e a
--                            comparacao nunca da true. Verificado na pratica.
--   3. CONFERIR MANUALMENTE→ não reconheci o filtro; leia a `expressao`.
--   2. redundante          → filtra certo, mas a canônica já faz o mesmo.
--                            Pode remover: menos policy, menos chance de uma
--                            delas divergir sem ninguém notar.
--   1. MANTER (canonica)   → as 8 da migration. Não remova.
--
-- A coluna `comando_para_remover` já vem com o DROP pronto e o nome escapado.
-- Copie as linhas que quiser aplicar.
--
-- No fim, rode a verificação da seção 6.4 de `2026-08-lancamento.sql`:
-- as 8 tabelas precisam continuar OK, agora com policies = 1 em cada.
-- ============================================================================

SELECT
  tablename AS tabela,
  policyname AS policy,
  cmd AS operacao,
  CASE
    WHEN policyname IN (
      'Professor gerencia o proprio perfil','Professor gerencia seus alunos',
      'Professor gerencia suas aulas','Professor gerencia suas cobrancas',
      'Professor gerencia seus bloqueios','Professor gerencia suas aulas recorrentes',
      'Professor gerencia seus pacotes','Professor gerencia suas mensagens'
    ) THEN '1. MANTER (canonica)'

    -- A EXPRESSAO vem primeiro, e nao o papel.
    --
    -- Uma policy sem `TO` vale pro papel `public`, o que inclui `anon`. Isso
    -- parece grave e quase nunca e: pra quem nao fez login, `auth.uid()` e
    -- NULL, entao `user_id = auth.uid()` nunca da true e a policy nao libera
    -- linha nenhuma. So e buraco de verdade quando o filtro tambem e frouxo.
    WHEN permissive = 'PERMISSIVE'
     AND coalesce(qual,'true') = 'true'
     AND cmd IN ('SELECT','ALL')
      THEN '3. PERIGO: leitura sem filtro (USING true)'
    WHEN permissive = 'PERMISSIVE'
     AND qual IS NULL
     AND coalesce(with_check,'true') = 'true'
     AND cmd IN ('INSERT','UPDATE','ALL')
      THEN '3. PERIGO: escrita sem filtro (WITH CHECK true)'

    -- Filtra por dono: inofensiva mesmo alcancando `public`.
    WHEN coalesce(qual,'') || coalesce(with_check,'') ILIKE '%auth.uid()%'
      OR coalesce(qual,'') || coalesce(with_check,'') ILIKE '%meu_professor_id%'
      THEN CASE
             WHEN 'authenticated' = ANY(roles)
               THEN '2. redundante (filtra certo, a canonica ja cobre)'
             ELSE '2. redundante (sem TO authenticated, mas o filtro protege)'
           END
    ELSE '3. CONFERIR MANUALMENTE'
  END AS veredito,
  CASE
    WHEN policyname IN (
      'Professor gerencia o proprio perfil','Professor gerencia seus alunos',
      'Professor gerencia suas aulas','Professor gerencia suas cobrancas',
      'Professor gerencia seus bloqueios','Professor gerencia suas aulas recorrentes',
      'Professor gerencia seus pacotes','Professor gerencia suas mensagens'
    ) THEN '—'
    ELSE format('DROP POLICY IF EXISTS %I ON public.%I;', policyname, tablename)
  END AS comando_para_remover,
  coalesce(qual, with_check, '(sem filtro)') AS expressao
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY 4 DESC, 1, 2;


-- ============================================================================
-- TESTE DE ISOLAMENTO (opcional, mas é a única prova que vale)
--
-- Contar policy não prova nada — o que prova é tentar ler o dado do outro.
-- Descomente, troque os dois UUIDs por valores reais do seu banco, e rode.
-- O esperado é 0 nas três contagens.
-- ============================================================================

-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = 'user_id-de-OUTRA-conta-de-teste';
--
-- SELECT
--   (SELECT count(*) FROM alunos    WHERE id       = 'id-de-um-aluno-que-NAO-e-dessa-conta') AS alunos,
--   (SELECT count(*) FROM cobrancas WHERE aluno_id = 'id-de-um-aluno-que-NAO-e-dessa-conta') AS cobrancas,
--   (SELECT count(*) FROM aulas     WHERE aluno_id = 'id-de-um-aluno-que-NAO-e-dessa-conta') AS aulas;
--
-- RESET ROLE;
