BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(51);

SELECT ok(
  (
    SELECT bool_and(relrowsecurity)
      FROM pg_class
     WHERE oid = ANY (ARRAY[
       'public.professores'::regclass,
       'public.alunos'::regclass,
       'public.aulas'::regclass,
       'public.cobrancas'::regclass,
       'public.bloqueios_data'::regclass,
       'public.aulas_recorrentes'::regclass,
       'public.pacotes_aulas'::regclass,
       'public.mensagens_enviadas'::regclass
     ])
  ),
  'RLS está ativo nas oito tabelas do produto'
);

SELECT is(
  (
    SELECT count(*)::integer
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
       AND roles = ARRAY['authenticated']::name[]
  ),
  8,
  'há uma policy canônica para authenticated por tabela'
);

SELECT ok(
  (
    SELECT bool_and(
      NOT has_table_privilege('anon', format('public.%I', table_name), privilege)
    )
      FROM unnest(ARRAY[
        'professores',
        'alunos',
        'aulas',
        'cobrancas',
        'bloqueios_data',
        'aulas_recorrentes',
        'pacotes_aulas',
        'mensagens_enviadas'
      ]) AS app_table(table_name)
      CROSS JOIN unnest(ARRAY[
        'SELECT',
        'INSERT',
        'UPDATE',
        'DELETE',
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER'
      ]) AS app_privilege(privilege)
  ),
  'anon não acessa tabelas do produto'
);

SELECT ok(
  (
    SELECT bool_and(
      has_table_privilege('authenticated', format('public.%I', table_name), privilege)
    )
      FROM unnest(ARRAY[
        'professores',
        'alunos',
        'aulas',
        'cobrancas',
        'bloqueios_data',
        'aulas_recorrentes',
        'pacotes_aulas',
        'mensagens_enviadas'
      ]) AS app_table(table_name)
      CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'])
        AS app_privilege(privilege)
  ),
  'authenticated recebe somente o CRUD necessário'
);

SELECT ok(
  (
    SELECT bool_and(
      NOT has_table_privilege('authenticated', format('public.%I', table_name), privilege)
    )
      FROM unnest(ARRAY[
        'professores',
        'alunos',
        'aulas',
        'cobrancas',
        'bloqueios_data',
        'aulas_recorrentes',
        'pacotes_aulas',
        'mensagens_enviadas'
      ]) AS app_table(table_name)
      CROSS JOIN unnest(ARRAY['TRUNCATE', 'REFERENCES', 'TRIGGER'])
        AS app_privilege(privilege)
  ),
  'authenticated não recebe privilégios administrativos'
);

SELECT ok(
  has_function_privilege('authenticated', 'private.meu_professor_id()', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'private.meu_professor_id()', 'EXECUTE'),
  'helper privado só é executável por papel autenticado'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.reagendar_aula(uuid,uuid,uuid,timestamp with time zone,timestamp with time zone,integer)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.registrar_aula(uuid,uuid,uuid,timestamp with time zone,integer,text,text,text)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.criar_aula_avulsa(uuid,uuid,timestamp with time zone,integer,text,text,boolean)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.converter_aula_experimental(uuid,uuid,text,text,text,integer,time without time zone,integer,numeric)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.salvar_aluno_com_horarios(uuid,uuid,text,text,text,text,text,text,text,date,numeric,text,jsonb)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.importar_alunos(uuid,jsonb)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.usar_aula_pacote(uuid)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.finalizar_onboarding(uuid,boolean,text,text,text,boolean,integer,jsonb)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.excluir_minha_conta()',
    'EXECUTE'
  ),
  'RPCs sensíveis não são executáveis por anon'
);

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    'rls-professor-1@example.test',
    '{"nome":"Professor RLS 1"}'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'rls-professor-2@example.test',
    '{"nome":"Professor RLS 2"}'::jsonb
  );

INSERT INTO public.alunos (id, professor_id, nome, dia_semana, horario)
VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
    'Aluno RLS 1',
    NULL,
    NULL
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000002'),
    'Aluno RLS 2',
    NULL,
    NULL
  );

SELECT set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::integer FROM public.alunos),
  1,
  'professor autenticado enxerga somente o próprio aluno'
);

SELECT is(
  (
    SELECT count(*)::integer
      FROM public.alunos
     WHERE id = '20000000-0000-4000-8000-000000000002'
  ),
  0,
  'professor autenticado não lê aluno de outro tenant'
);

SELECT throws_ok(
  $sql$
    INSERT INTO public.aulas (
      aluno_id,
      professor_id,
      data_hora,
      duracao_minutos
    )
    VALUES (
      '20000000-0000-4000-8000-000000000002',
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      now(),
      60
    )
  $sql$,
  '42501',
  'new row violates row-level security policy for table "aulas"',
  'não cria aula própria vinculada ao aluno de outro professor'
);

SELECT throws_ok(
  $sql$
    INSERT INTO public.cobrancas (
      aluno_id,
      professor_id,
      valor,
      mes_referencia,
      vencimento
    )
    VALUES (
      '20000000-0000-4000-8000-000000000002',
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      100,
      DATE '2099-01-01',
      DATE '2099-01-10'
    )
  $sql$,
  '42501',
  'new row violates row-level security policy for table "cobrancas"',
  'não cria cobrança própria vinculada ao aluno de outro professor'
);

SELECT throws_ok(
  $sql$
    SELECT public.salvar_horarios_aluno(
      '20000000-0000-4000-8000-000000000001',
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000002'),
      '[]'::jsonb
    )
  $sql$,
  'P0001',
  'Professor não autorizado',
  'RPC de horários ignora professor_id forjado pelo navegador'
);

SELECT throws_ok(
  $sql$
    SELECT public.reagendar_aula(
      NULL,
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      '20000000-0000-4000-8000-000000000002',
      now(),
      now() + interval '1 day',
      60
    )
  $sql$,
  'P0001',
  'Aluno não pertence ao professor autenticado',
  'RPC de reagendamento rejeita aluno de outro professor'
);

SELECT lives_ok(
  $sql$
    SELECT public.registrar_aula(
      NULL,
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      '20000000-0000-4000-8000-000000000001',
      '2099-02-01 12:00:00+00',
      60,
      'falta_justificada',
      'Escalas',
      'Estudar arpejos'
    )
  $sql$,
  'registro de falta e crédito de reposição executam juntos'
);

SELECT is(
  (
    SELECT reposicoes_disponiveis
      FROM public.alunos
     WHERE id = '20000000-0000-4000-8000-000000000001'
  ),
  1,
  'primeira falta justificada concede uma reposição'
);

SELECT ok(
  EXISTS (
    SELECT 1
      FROM public.aulas
     WHERE aluno_id = '20000000-0000-4000-8000-000000000001'
       AND data_hora = '2099-02-01 12:00:00+00'
       AND status = 'falta_justificada'
       AND observacao = 'Escalas'
       AND licao_casa = 'Estudar arpejos'
  ),
  'registro de presença persiste aula, observação e lição'
);

SELECT lives_ok(
  $sql$
    SELECT public.registrar_aula(
      (
        SELECT id
          FROM public.aulas
         WHERE aluno_id = '20000000-0000-4000-8000-000000000001'
           AND data_hora = '2099-02-01 12:00:00+00'
      ),
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      '20000000-0000-4000-8000-000000000001',
      '2099-02-01 12:00:00+00',
      60,
      'realizada',
      'Escalas corrigidas',
      NULL
    )
  $sql$,
  'correção do status da aula e reversão do crédito executam juntas'
);

SELECT is(
  (
    SELECT reposicoes_disponiveis
      FROM public.alunos
     WHERE id = '20000000-0000-4000-8000-000000000001'
  ),
  0,
  'corrigir falta para presença reverte a reposição'
);

UPDATE public.alunos
   SET reposicoes_disponiveis = 1
 WHERE id = '20000000-0000-4000-8000-000000000001';

SELECT lives_ok(
  $sql$
    SELECT public.criar_aula_avulsa(
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      '20000000-0000-4000-8000-000000000001',
      '2099-02-03 12:00:00+00',
      60,
      'avulsa',
      NULL,
      true
    )
  $sql$,
  'aula de reposição e consumo do crédito executam juntos'
);

SELECT ok(
  (
    SELECT reposicoes_disponiveis = 0
      FROM public.alunos
     WHERE id = '20000000-0000-4000-8000-000000000001'
  )
  AND EXISTS (
    SELECT 1
      FROM public.aulas
     WHERE aluno_id = '20000000-0000-4000-8000-000000000001'
       AND data_hora = '2099-02-03 12:00:00+00'
       AND eh_reposicao
  ),
  'aula de reposição salva somente após reservar o crédito'
);

SELECT throws_ok(
  $sql$
    SELECT public.criar_aula_avulsa(
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      '20000000-0000-4000-8000-000000000001',
      '2099-02-04 12:00:00+00',
      60,
      'avulsa',
      NULL,
      true
    )
  $sql$,
  'P0001',
  'Aluno não possui reposição disponível',
  'não agenda reposição quando o saldo está zerado'
);

SELECT is(
  (
    SELECT count(*)::integer
      FROM public.aulas
     WHERE aluno_id = '20000000-0000-4000-8000-000000000001'
       AND data_hora = '2099-02-04 12:00:00+00'
  ),
  0,
  'falha ao reservar crédito não deixa aula órfã'
);

SELECT lives_ok(
  $sql$
    SELECT public.reagendar_aula(
      NULL,
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      '20000000-0000-4000-8000-000000000001',
      '2099-02-05 12:00:00+00',
      '2099-02-06 12:00:00+00',
      60
    )
  $sql$,
  'reagendamento materializa original e nova aula na mesma transação'
);

SELECT ok(
  EXISTS (
    SELECT 1
      FROM public.aulas AS nova
      JOIN public.aulas AS original ON original.id = nova.reagendada_de
     WHERE original.aluno_id = '20000000-0000-4000-8000-000000000001'
       AND original.data_hora = '2099-02-05 12:00:00+00'
       AND original.status = 'reagendada'
       AND nova.data_hora = '2099-02-06 12:00:00+00'
       AND nova.status = 'agendada'
  ),
  'nova aula preserva vínculo com a ocorrência original'
);

SELECT lives_ok(
  $sql$
    SELECT public.criar_aula_avulsa(
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      NULL,
      '2099-02-07 12:00:00+00',
      45,
      'experimental',
      'Aluno Trial',
      false
    )
  $sql$,
  'professor agenda aula experimental sem aluno pré-cadastrado'
);

SELECT lives_ok(
  $sql$
    SELECT public.converter_aula_experimental(
      (
        SELECT id
          FROM public.aulas
         WHERE data_hora = '2099-02-07 12:00:00+00'
           AND tipo = 'experimental'
      ),
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      'Aluno Trial',
      'Piano',
      '(11) 99999-9999',
      2,
      '15:00:00',
      45,
      350
    )
  $sql$,
  'conversão cria aluno, recorrência e vínculo em uma transação'
);

SELECT ok(
  EXISTS (
    SELECT 1
      FROM public.aulas AS trial
      JOIN public.alunos AS aluno ON aluno.id = trial.aluno_id
      JOIN public.aulas_recorrentes AS recorrente ON recorrente.aluno_id = aluno.id
     WHERE trial.data_hora = '2099-02-07 12:00:00+00'
       AND trial.tipo = 'experimental'
       AND trial.aluno_experimental_nome IS NULL
       AND aluno.nome = 'Aluno Trial'
       AND aluno.telefone = '11999999999'
       AND recorrente.dia_semana = 2
       AND recorrente.horario = '15:00:00'
  ),
  'trial convertido preserva origem e ganha aluno e horário recorrente'
);

SELECT throws_ok(
  $sql$
    SELECT public.converter_aula_experimental(
      (
        SELECT id
          FROM public.aulas
         WHERE data_hora = '2099-02-07 12:00:00+00'
           AND tipo = 'experimental'
      ),
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      'Aluno Trial',
      'Piano',
      '11999999999',
      2,
      '15:00:00',
      45,
      350
    )
  $sql$,
  'P0001',
  'Aula experimental já foi convertida',
  'repetir a conversão não duplica o aluno'
);

SELECT is(
  (
    SELECT count(*)::integer
      FROM public.alunos
     WHERE nome = 'Aluno Trial'
  ),
  1,
  'tentativa repetida mantém somente um aluno convertido'
);

SELECT lives_ok(
  $sql$
    SELECT public.salvar_aluno_com_horarios(
      NULL,
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      'Aluno Atômico',
      'Violão',
      'Iniciante',
      'Preparar repertório',
      '(11) 98888-7777',
      'aluno@example.test',
      'Responsável Teste',
      '2010-05-10',
      420,
      'Observação inicial',
      '[
        {"dia_semana": 1, "horario": "10:00:00", "duracao_minutos": 60, "data_inicio": "2099-03-01"},
        {"dia_semana": 3, "horario": "11:00:00", "duracao_minutos": 45, "data_inicio": "2099-03-01"}
      ]'::jsonb
    )
  $sql$,
  'cadastro salva aluno e todos os horários em uma transação'
);

SELECT ok(
  EXISTS (
    SELECT 1
      FROM public.alunos AS aluno
     WHERE aluno.nome = 'Aluno Atômico'
       AND aluno.telefone = '11988887777'
       AND aluno.dia_semana = 1
       AND aluno.horario = '10:00:00'
       AND (
         SELECT count(*)
           FROM public.aulas_recorrentes AS recorrente
          WHERE recorrente.aluno_id = aluno.id
       ) = 2
  ),
  'cadastro mantém campos legados alinhados ao primeiro dos dois horários'
);

SELECT lives_ok(
  $sql$
    SELECT public.salvar_aluno_com_horarios(
      (SELECT id FROM public.alunos WHERE nome = 'Aluno Atômico'),
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      'Aluno Atômico Editado',
      'Violão',
      'Intermediário',
      NULL,
      '11988887777',
      NULL,
      NULL,
      NULL,
      450,
      NULL,
      '[
        {"dia_semana": 5, "horario": "16:00:00", "duracao_minutos": 90, "data_inicio": "2099-03-02"}
      ]'::jsonb
    )
  $sql$,
  'edição troca perfil e grade recorrente em uma transação'
);

SELECT ok(
  EXISTS (
    SELECT 1
      FROM public.alunos AS aluno
     WHERE aluno.nome = 'Aluno Atômico Editado'
       AND aluno.nivel = 'Intermediário'
       AND aluno.valor_mensalidade = 450
       AND aluno.dia_semana = 5
       AND aluno.horario = '16:00:00'
       AND (
         SELECT count(*)
           FROM public.aulas_recorrentes AS recorrente
          WHERE recorrente.aluno_id = aluno.id
            AND recorrente.dia_semana = 5
            AND recorrente.horario = '16:00:00'
       ) = 1
  ),
  'edição não deixa horários antigos nem perfil pela metade'
);

SELECT throws_ok(
  $sql$
    SELECT public.salvar_aluno_com_horarios(
      '20000000-0000-4000-8000-000000000002',
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      'Tentativa cruzada',
      'Piano',
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      100,
      NULL,
      '[{"dia_semana": 1, "horario": "10:00:00", "duracao_minutos": 60}]'::jsonb
    )
  $sql$,
  'P0001',
  'Aluno não encontrado para o professor autenticado',
  'edição transacional rejeita aluno de outro professor'
);

SELECT lives_ok(
  $sql$
    SELECT public.importar_alunos(
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      '[
        {
          "nome": "Aluno Importado Com Agenda",
          "instrumento": "Bateria",
          "telefone": "11977776666",
          "valor_mensalidade": 300,
          "horarios": [
            {"dia_semana": 2, "horario": "09:00:00", "duracao_minutos": 60, "data_inicio": "2099-04-01"},
            {"dia_semana": 4, "horario": "10:30:00", "duracao_minutos": 45, "data_inicio": "2099-04-01"}
          ]
        },
        {
          "nome": "Aluno Importado Sem Agenda",
          "instrumento": "",
          "telefone": null,
          "valor_mensalidade": 0,
          "horarios": []
        }
      ]'::jsonb
    )
  $sql$,
  'importação grava um lote com horários opcionais em uma transação'
);

SELECT ok(
  (
    SELECT count(*) = 2
      FROM public.alunos
     WHERE nome IN ('Aluno Importado Com Agenda', 'Aluno Importado Sem Agenda')
  )
  AND EXISTS (
    SELECT 1
      FROM public.alunos AS aluno
     WHERE aluno.nome = 'Aluno Importado Com Agenda'
       AND aluno.dia_semana = 2
       AND aluno.horario = '09:00:00'
       AND (
         SELECT count(*)
           FROM public.aulas_recorrentes AS recorrente
          WHERE recorrente.aluno_id = aluno.id
       ) = 2
  )
  AND EXISTS (
    SELECT 1
      FROM public.alunos AS aluno
     WHERE aluno.nome = 'Aluno Importado Sem Agenda'
       AND aluno.dia_semana IS NULL
       AND aluno.horario IS NULL
       AND NOT EXISTS (
         SELECT 1
           FROM public.aulas_recorrentes AS recorrente
          WHERE recorrente.aluno_id = aluno.id
       )
  ),
  'lote mantém cada grade com o aluno correto e aceita aluno sem agenda'
);

SELECT throws_ok(
  $sql$
    SELECT public.importar_alunos(
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      '[
        {"nome": "Lote Deve Reverter 1", "horarios": []},
        {
          "nome": "Lote Deve Reverter 2",
          "horarios": [
            {"dia_semana": 1, "horario": "10:00:00", "duracao_minutos": 60, "data_inicio": "data-invalida"}
          ]
        }
      ]'::jsonb
    )
  $sql$,
  '22007',
  'invalid input syntax for type date: "data-invalida"',
  'falha numa recorrência aborta a importação inteira'
);

SELECT is(
  (
    SELECT count(*)::integer
      FROM public.alunos
     WHERE nome LIKE 'Lote Deve Reverter%'
  ),
  0,
  'importação com erro não deixa alunos parciais'
);

SELECT throws_ok(
  $sql$
    SELECT public.importar_alunos(
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000002'),
      '[{"nome": "Importação cruzada", "horarios": []}]'::jsonb
    )
  $sql$,
  'P0001',
  'Professor não autorizado',
  'importação rejeita professor forjado pelo navegador'
);

INSERT INTO public.pacotes_aulas (
  id,
  aluno_id,
  professor_id,
  total_aulas,
  aulas_usadas,
  valor_total,
  status,
  data_compra
)
VALUES (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
  2,
  0,
  200,
  'ativo',
  CURRENT_DATE
);

SELECT lives_ok(
  $sql$
    SELECT * FROM public.usar_aula_pacote('30000000-0000-4000-8000-000000000001')
  $sql$,
  'primeiro uso do pacote consome um crédito'
);

SELECT lives_ok(
  $sql$
    SELECT * FROM public.usar_aula_pacote('30000000-0000-4000-8000-000000000001')
  $sql$,
  'último uso conclui o pacote'
);

SELECT ok(
  EXISTS (
    SELECT 1
      FROM public.pacotes_aulas
     WHERE id = '30000000-0000-4000-8000-000000000001'
       AND aulas_usadas = 2
       AND status = 'concluido'
  ),
  'pacote nunca ultrapassa o total e conclui no último crédito'
);

SELECT throws_ok(
  $sql$
    SELECT * FROM public.usar_aula_pacote('30000000-0000-4000-8000-000000000001')
  $sql$,
  'P0001',
  'Pacote indisponível ou sem aulas restantes',
  'cliente com cache obsoleto não consome pacote esgotado'
);

UPDATE public.professores
   SET onboarding_completo = false
 WHERE user_id = '10000000-0000-4000-8000-000000000001';

SELECT lives_ok(
  $sql$
    SELECT public.finalizar_onboarding(
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      false,
      'Rua do Teste, 10',
      'pix@example.test',
      '123.456.789-00',
      true,
      24,
      '[
        {
          "nome": "Aluno do Onboarding",
          "instrumento": "Piano",
          "valor_mensalidade": 250,
          "horarios": [
            {"dia_semana": 3, "horario": "14:00:00", "duracao_minutos": 60, "data_inicio": "2099-05-01"}
          ]
        }
      ]'::jsonb
    )
  $sql$,
  'onboarding conclui perfil e primeiro aluno juntos'
);

SELECT ok(
  EXISTS (
    SELECT 1
      FROM public.professores
     WHERE user_id = '10000000-0000-4000-8000-000000000001'
       AND onboarding_completo
       AND endereco = 'Rua do Teste, 10'
  )
  AND EXISTS (
    SELECT 1
      FROM public.alunos AS aluno
      JOIN public.aulas_recorrentes AS recorrente ON recorrente.aluno_id = aluno.id
     WHERE aluno.nome = 'Aluno do Onboarding'
       AND recorrente.dia_semana = 3
       AND recorrente.horario = '14:00:00'
  ),
  'flag de conclusão só existe junto com perfil, aluno e horário'
);

SELECT lives_ok(
  $sql$
    SELECT public.finalizar_onboarding(
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000001'),
      false,
      'Rua do Teste, 10',
      'pix@example.test',
      '123.456.789-00',
      true,
      24,
      '[{"nome": "Aluno do Onboarding", "horarios": []}]'::jsonb
    )
  $sql$,
  'retry do onboarding concluído é seguro'
);

SELECT is(
  (
    SELECT count(*)::integer
      FROM public.alunos
     WHERE nome = 'Aluno do Onboarding'
  ),
  1,
  'retry não duplica o primeiro aluno'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

SELECT throws_ok(
  $sql$
    SELECT public.finalizar_onboarding(
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000002'),
      false,
      'Endereço não deve persistir',
      NULL,
      NULL,
      true,
      24,
      '[
        {
          "nome": "Aluno Inválido do Onboarding",
          "horarios": [
            {"dia_semana": 1, "horario": "10:00:00", "duracao_minutos": 60, "data_inicio": "data-invalida"}
          ]
        }
      ]'::jsonb
    )
  $sql$,
  '22007',
  'invalid input syntax for type date: "data-invalida"',
  'falha no primeiro aluno aborta também a conclusão do onboarding'
);

SELECT ok(
  EXISTS (
    SELECT 1
      FROM public.professores
     WHERE user_id = '10000000-0000-4000-8000-000000000002'
       AND NOT onboarding_completo
       AND endereco IS NULL
  )
  AND NOT EXISTS (
    SELECT 1
      FROM public.alunos
     WHERE nome = 'Aluno Inválido do Onboarding'
  ),
  'onboarding com erro não deixa perfil ou aluno parcial'
);

SELECT lives_ok(
  $sql$
    SELECT public.finalizar_onboarding(
      (SELECT id FROM public.professores WHERE user_id = '10000000-0000-4000-8000-000000000002'),
      true,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      '[]'::jsonb
    )
  $sql$,
  'pular onboarding confirma a decisão no servidor'
);

SELECT ok(
  EXISTS (
    SELECT 1
      FROM public.professores
     WHERE user_id = '10000000-0000-4000-8000-000000000002'
       AND onboarding_completo
  ),
  'pular só libera o painel depois de persistir a conclusão'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
