# Auditoria independente do Studoo

Data: 31 de agosto de 2026; implementação atualizada em 1º de setembro de 2026
Estado: diagnóstico concluído; Fases 0–2 em execução
Escopo: produto, UX, frontend, Supabase, autenticação, segurança, deploy e operação

## Status de implementação

- [x] Diagnóstico e backlog registrados no repositório.
- [x] Script de hardening impedido de remover as duas constraints críticas.
- [x] Supabase CLI fixada e estrutura de migrações iniciada.
- [x] Hotfix seguro criado para auditar duplicatas e restaurar as constraints.
- [x] Testes estáticos adicionados para impedir a regressão.
- [x] Importações futuras sem horário deixam de inventar segunda às 09:00.
- [x] Reset inválido deixa de travar e regras/autocomplete de senha foram alinhados.
- [x] Schema real importado do projeto remoto e versionado de forma declarativa.
- [x] Migration de reconciliação criada para substituir o histórico de SQL manual.
- [x] Migration de least privilege/RLS criada, com auditoria não destrutiva de referências cruzadas.
- [x] Sequência completa executada num PostgreSQL 17 descartável, com smoke test de isolamento.
- [x] Quinze migrations executadas do zero em PostgreSQL 17 local e testadas com duas identidades.
- [x] Presença, reposição, reagendamento e criação de aula passaram a ser transacionais.
- [x] Conversão de trial preserva a origem experimental e não duplica aluno em retry.
- [x] Cadastro/edição de aluno e grade recorrente passaram a ser uma única operação.
- [x] Importação em lote grava alunos e horários de forma set-based e tudo-ou-nada.
- [x] Suíte atual: 77 testes Vitest e 51 cenários pgTAP versionados; lint e build limpos.
- [x] Dry-run remoto confirmou exatamente dez migrations locais pendentes.
- [x] Dez migrations revisadas e aplicadas ao projeto remoto vinculado.
- [x] Histórico local/remoto alinhado: quinze migrations; novo dry-run vazio.
- [x] Validação remota: 8/8 tabelas com RLS, oito policies, zero tabela da
  aplicação exposta a `anon` e 8/8 RPCs transacionais com grants esperados.
- [x] Smoke remoto autenticado passou em 13 etapas com conta descartável:
  login, onboarding, aluno, aula, cobrança, pagamento, relatórios, mobile e
  exclusão integral da conta.
- [x] Axe integrado ao smoke autenticado: zero violações sérias/críticas nas
  rotas principais verificadas em desktop e 390 px.

O projeto Supabase foi vinculado, inspecionado e atualizado em 1º de setembro de
2026. As constraints críticas permanecem no banco real, e as quinze migrations
locais agora coincidem com o histórico remoto. O SQL também foi validado sem
Docker em PostgreSQL 17 via PGlite, incluindo RLS e operações transacionais. O
reset do stack Supabase completo (Auth/API/pgTAP) ainda depende de Docker ou de
um projeto de staging. Na verificação final, o banco registrou duas contas e
dois perfis — incluindo o usuário `codex` informado pelo proprietário — e zero
conta/perfil descartável. O smoke agora também compara os IDs existentes antes
e depois da execução e falha se qualquer conta fora da descartável mudar.

## Veredito

O Studoo tem uma proposta forte para professores particulares de música e uma
interface acima da média para um beta. O rollout eliminou os bloqueadores mais
graves de integridade e isolamento, e o caminho principal autenticado passou
ponta a ponta. O produto ainda não está pronto para usuários reais: faltam
provar confirmação, recuperação e entregabilidade de email, fechar privacidade,
completar a passagem por teclado e testar restauração.

| Dimensão | Avaliação |
| --- | --- |
| Proposta e posicionamento | Forte; manter o foco em professores de música |
| UX/UI pública | Boa, consistente e responsiva |
| Cobertura funcional | Ampla demais para o nível atual de confiabilidade |
| Integridade dos dados | Constraints e operações transacionais aplicadas no remoto |
| Reprodutibilidade do backend | Schema versionado e SQL reproduzível; stack completo pendente |
| Segurança pretendida | Boa |
| Segurança comprovada | Hardening remoto validado; matriz completa pgTAP ainda pendente |
| Prontidão para beta real | Backend crítico aplicado; validação operacional ainda pendente |

## Backlog priorizado

### P0 — bloqueadores

#### P0-01 — risco de regressão nas constraints de integridade — corrigido no código

O `sql/2026-08-hardening.sql` removia e não recriava:

- `UNIQUE (cobrancas.aluno_id, cobrancas.mes_referencia)`;
- `UNIQUE (professores.user_id)`.

O frontend depende dessas invariantes em `Financeiro.tsx` e `Cadastro.tsx`.
Sem elas, cobranças poderiam falhar ou duplicar, e mais de um perfil poderia
ser criado para o mesmo usuário. A inspeção do schema real confirmou que a
produção ainda possui `professores_user_id_key` e
`cobrancas_aluno_id_mes_referencia_key`; portanto, não houve perda dessas
invariantes no ambiente vinculado. O script foi corrigido e uma migration
defensiva agora detecta índices equivalentes e aborta em duplicatas sem apagar
dados.

Critérios de conclusão:

- [x] verificar as constraints no banco real;
- [x] restaurar as invariantes sem apagar dados em ambientes divergentes;
- [ ] verificar os dois `upsert`s com testes de integração;
- [x] impedir regressão em CI.

#### P0-02 — schema Supabase não reproduzível — mitigado no código

Historicamente, o repositório não criava integralmente as tabelas centrais.
Parte do schema e o trigger de cadastro dependiam de SQL copiado manualmente no
Dashboard. O schema remoto foi importado para `supabase/schemas`, as cinco
migrations remotas foram recuperadas e as mudanças manuais foram consolidadas
em migrations versionadas. As quinze migrations atuais executam em ordem num
PostgreSQL 17 vazio. Falta provar o reset do stack Supabase completo.

Critérios de conclusão:

- [x] adotar Supabase CLI e migrações cronológicas;
- [x] versionar schema completo, funções, triggers, grants e policies;
- [ ] subir um projeto local vazio apenas a partir do repositório;
- [ ] validar fresh install e upgrade em CI.

#### P0-03 — writes críticos não transacionais — corrigido no código

Fluxos afetados:

- aluno + horários;
- importação + recorrências;
- conclusão do onboarding + primeiro aluno;
- trial + aluno + recorrência;
- presença/falta + saldo de reposição;
- aula de reposição + consumo do crédito;
- reagendamento.

Critérios de conclusão:

- [x] presença/falta e ajuste de reposição na mesma transação;
- [x] aula de reposição só é criada se o crédito for reservado;
- [x] reagendamento materializa original e nova aula juntas;
- [x] conversão de trial cria aluno, recorrência e vínculo juntos;
- [x] cadastro/edição de aluno salva perfil e grade juntos;
- [x] importação correlaciona horários por ID gerado no banco e reverte o lote
  inteiro em caso de falha;
- [x] remover os fallbacks não atômicos desses fluxos no frontend;
- [x] concluir onboarding e primeiro aluno numa única operação idempotente;
- [x] remover o fallback não atômico restante em consumo de pacote.

#### P0-04 — isolamento RLS endurecido; matriz completa ainda pendente

A inspeção do schema real encontrou grants de tabela excessivos para `anon` e
`authenticated`, incluindo `TRUNCATE`, `REFERENCES` e `TRIGGER`. RLS ainda
protege as operações comuns da Data API, mas esses privilégios ampliam a
superfície sem necessidade. Também era possível gravar uma aula, cobrança ou
mensagem com o próprio `professor_id` e o `aluno_id` de outro professor caso o
UUID fosse conhecido. As RPCs de horários e reagendamento confiavam no
`professor_id` recebido do navegador.

A migration de hardening revoga os grants excessivos, deriva ownership de
`auth.uid()`, valida coerência entre professor e aluno e aborta se encontrar
dados históricos cruzados. Ela foi aplicada ao projeto remoto após a auditoria
confirmar zero duplicatas e zero referências entre professores. No remoto,
8/8 tabelas estão com RLS, há oito policies, `anon` não possui acesso às tabelas
da aplicação e as oito novas RPCs transacionais não são executáveis por `anon`.
Um teste com papel `authenticated` e JWT simulado enxergou exatamente o próprio
perfil. Um smoke no app real também provou o caminho do proprietário por login,
onboarding, aluno, aula, cobrança, pagamento e exclusão. A suíte pgTAP com 51
cenários está versionada, mas ainda precisa rodar no stack Supabase para cobrir
a matriz completa de CRUD e RPC com duas identidades.

Critérios de conclusão:

- [ ] testar SELECT/INSERT/UPDATE/DELETE nas oito tabelas com duas identidades;
- [ ] testar todas as RPCs como `anon`, `authenticated` proprietário e outro
  usuário autenticado;
- [x] declarar grants explícitos para a Data API na fonte versionada;
- [x] aplicar o hardening no projeto remoto;
- [x] registrar resultado dos advisors de segurança após a aplicação: nenhum
  erro; dois avisos — proteção contra senhas vazadas desativada e a RPC
  intencional `excluir_minha_conta()` como `SECURITY DEFINER`.

#### P0-05 — política de privacidade incompatível com PostHog

Se `VITE_POSTHOG_KEY` estiver ativa, o app carrega um script remoto, persiste
telemetria em `localStorage`, identifica o professor e envia exceções. A
política atual não lista o PostHog nem esse tratamento.

Critérios de conclusão:

- manter PostHog desligado até a regularização; ou
- documentar operador, finalidade, base legal, retenção e transferência;
- revisar propriedades e stacks para excluir dados de alunos;
- definir consentimento quando aplicável.

### P1 — curto prazo

#### P1-01 — autenticação e email

- reset inválido, regra mínima e `autocomplete` de senha foram corrigidos no
  frontend;
- custom SMTP/Resend, SPF, DKIM, DMARC e entregabilidade não estão comprovados;
- faltam CAPTCHA e proteção de senha vazada para abertura pública.

#### P1-02 — onboarding excessivo e não retomável

- wizard, checklist e tour competem entre si;
- passo atual e rascunho do aluno não persistem;
- “Pular tudo” foi corrigido para liberar o painel somente após confirmação do banco;
- perfil, conclusão e primeiro aluno agora fecham juntos, mas o aluno ainda é
  criado somente no final do wizard.

Direção: três etapas — perfil mínimo, primeiro aluno/importação e primeira aula.
PIX, recibo e política de faltas entram quando forem necessários.

#### P1-03 — importação gera horários fantasmas — corrigido no código

Aluno sem horário recebia segunda-feira às 09:00 nos campos legados e aparecia
indevidamente na agenda. A correlação dos horários também dependia de dados de
identidade. Agora alunos sem agenda persistem `NULL`, e a RPC gera o UUID antes
dos dois inserts para manter cada grade vinculada estruturalmente ao aluno.

#### P1-04 — relatórios historicamente instáveis

- aluno arquivado hoje desaparece de meses anteriores;
- alterar recorrência pode reescrever períodos passados;
- percentual de presença ignora aulas previstas sem registro;
- página do aluno limita a 50 aulas e chama o valor de total;
- “acima da média” significa apenas `>= 80%`.

#### P1-05 — financeiro sem correção e reversibilidade

Faltam:

- desfazer pagamento;
- corrigir data, valor e vencimento;
- cancelar cobrança incorreta;
- criar cobrança avulsa;
- representar responsável/pagador;
- impedir cobranças de R$ 0.

O recibo também precisa de revisão de texto, valor por extenso e identificação
do pagador.

#### P1-06 — erros aparecem como estados vazios

Queries críticas frequentemente tratam apenas loading e dados. Falha de rede,
RLS ou schema pode aparecer como “nenhum aluno” ou “sem cobranças”. Cada tela
deve diferenciar vazio, offline, permissão, incompatibilidade e erro recuperável.

#### P1-07 — acessibilidade

- tour sem foco inicial, focus trap e restauração;
- passagem completa por teclado nas rotas autenticadas ainda pendente.

Correções já aplicadas durante o smoke remoto:

- o nome na página individual do aluno agora é um `h1` real;
- o nome acessível de “Gerar cobrança” respeita singular e plural;
- a tabela de alunos não aninha mais botões dentro de uma linha com
  `role="button"`; o acesso ao perfil possui botão focável próprio;
- campos de conta, PIX, política de aulas e bloqueios receberam nomes
  acessíveis explícitos;
- tokens semânticos, badges, filtros, sidebar, checklist e toasts foram
  ajustados para contraste AA no tema claro;
- axe passou sem violações sérias/críticas em login, onboarding, dashboard,
  alunos, página individual, agenda, financeiro, relatórios e configurações,
  incluindo dashboard e agenda em 390 px.

#### P1-08 — promessas divergentes

- landing promete drag-and-drop de reagendamento, que não existe;
- histórico de WhatsApp é gravado, mas não é exibido no perfil;
- catálogo de features marca itens ausentes como funcionais;
- Configurações fala em email onde o fluxo real é WhatsApp;
- marca alterna entre `studoo.app` e `studoo.com.br`.

#### P1-09 — arquitetura e tipos

- páginas de 700–2.096 linhas misturam UI, queries e regras transacionais;
- acesso ao banco está espalhado pelos componentes;
- tipos Supabase manuais já divergiram do schema;
- query keys e invalidações são manuais;
- falta camada de casos de uso para operações críticas.

### P2 — oportunidades de produto

#### P2-01 — dashboard operacional

Priorizar uma fila com:

1. aulas de hoje;
2. registros de aula pendentes;
3. cobranças vencidas;
4. reposições sem agendamento.

Reduzir KPIs, cards secundários e onboarding redundante.

#### P2-02 — timeline única do aluno

Unificar aulas, anotações, mensagens, pagamentos, pacotes e reposições em ordem
cronológica, com responsável/pagador modelado separadamente.

#### P2-03 — fechamento mensal guiado

Mostrar cobranças ausentes, valores divergentes, pagamentos pendentes e recibos
antes de encerrar o mês.

#### P2-04 — Assistente do Dia com IA

Não começar com chat genérico. Combinar regras determinísticas com IA para:

- priorizar aulas, registros, cobranças e reposições;
- redigir mensagens de cobrança em diferentes tons;
- estruturar anotações em resumo, tarefa e próximo passo;
- gerar fechamento semanal revisável pelo professor.

Guardrails:

- nada é enviado automaticamente;
- professor revisa e confirma;
- execução server-side, sem segredo em `VITE_*`;
- contexto mínimo, especialmente para menores;
- trilha de auditoria, limites de custo e política de retenção.

### P3 — depois do MVP

- envio automático de WhatsApp;
- processamento de pagamentos e conciliação PIX;
- sincronização bidirecional de calendário;
- aplicativo nativo;
- escolas, turmas e múltiplos professores;
- marketplace;
- previsões de churn ou inadimplência;
- billing próprio do SaaS;
- agente de IA autônomo.

## Roadmap

| Fase | Objetivo | Entregas |
| --- | --- | --- |
| 0 — Contenção | Eliminar risco imediato | Constraints, auditoria do banco, PostHog e bloqueio de deploy incompatível |
| 1 — Banco confiável | Backend reproduzível | Schema completo, migrações, grants, tipos gerados, testes RLS |
| 2 — Core correto | Corrigir operações | RPCs transacionais, importação, agenda, reposições, financeiro e relatórios |
| 3 — Ativação | Simplificar uso inicial | Onboarding em três passos, dashboard operacional, estados de erro |
| 4 — Beta fechado | Validar com uso real | 5–10 professores, observabilidade, suporte e restore drill |
| 5 — Diferenciação | Aumentar valor | Assistente do Dia, resumo de aula e fechamento semanal |

## Critérios objetivos para o MVP

### Reprodutibilidade

- projeto Supabase vazio provisionado pelo repositório;
- fresh install e upgrade em CI;
- zero configuração essencial dependente de SQL manual.

### Integridade

- uma cobrança por aluno/mês e um perfil por usuário;
- operações multi-write transacionais ou idempotentes;
- nenhuma falha deixa estado parcial;
- aluno sem horário não aparece na agenda;
- cobrança de R$ 0 não é gerada inadvertidamente.

### Segurança e privacidade

- RLS e RPCs testadas com dois professores;
- grants explícitos e advisors sem bloqueador;
- confirmação de email, CAPTCHA e proteção de senha configurados;
- política corresponde à telemetria ativa;
- CSP e headers equivalentes nos hosts suportados.

### Fluxos ponta a ponta

- cadastro, confirmação, reenvio, OAuth e reset;
- onboarding e primeiro valor;
- criar/importar aluno;
- presença, falta, reagendamento e reposição;
- gerar, corrigir e pagar cobrança;
- recibo, exportação e exclusão.

### UX e acessibilidade

- erro de query nunca aparece como vazio;
- axe sem violações sérias/críticas nas rotas principais;
- fluxos críticos completos por teclado;
- sem overflow entre 320 px e desktop.

### Operação

- monitoramento sem dados pessoais indevidos;
- backup e restauração testados;
- canal de suporte funcionando;
- duas semanas com pelo menos cinco professores, sem P0/P1 aberto e sem
  divergências de agenda, reposição ou financeiro.

## Baseline técnico verificado

- `npm test`: 77/77 testes passaram;
- `npm run lint`: passou;
- `npm run build`: passou;
- `npm audit`: zero vulnerabilidades conhecidas;
- `npm run test:e2e:live`: 13/13 etapas passaram contra o Supabase remoto; a
  conta e todos os dados descartáveis foram removidos; o fluxo também executou
  axe nas rotas principais e não encontrou violações sérias/críticas;
- cobertura exibida: 74,43% das linhas carregadas, limitada a utilitários e
  domínio; páginas, autenticação, banco e UI não estão cobertos;
- landing, cadastro, login e reset inspecionados em desktop e 390 px;
- login, onboarding, dashboard, alunos, página individual, agenda, financeiro,
  relatórios e exclusão foram percorridos com sessão real após o rollout;
- confirmação de email, recuperação por email, OAuth, presença e reposição
  ainda não foram percorridos ponta a ponta pela interface.
