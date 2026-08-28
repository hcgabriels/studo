# Rodada de correções — agosto/2026

66 arquivos alterados, 10 novos, 6 deletados. `tsc`, `eslint` e `build` limpos.

**Banco:** `sql/2026-08-lancamento.sql` já foi aplicado e verificado em
08/08/2026 — ver a seção "Estado do banco" no fim. Num projeto Supabase novo,
rodar esse arquivo continua sendo obrigatório antes de subir.

---

## 1. Segurança

| | |
|---|---|
| **RLS em `professores`, `alunos`, `aulas`, `cobrancas`** | Não havia policy versionada pra nenhuma das quatro. `/alunos/:id` consulta essas tabelas filtrando só por id — a separação entre professores dependia inteiramente de RLS que ninguém sabia se existia. `sql/2026-08-lancamento.sql` |
| Policies antigas endurecidas | Ganharam `TO authenticated`, `WITH CHECK` explícito e validação de coerência `aluno_id` ↔ `professor_id` (dava pra inserir pacote no aluno de terceiro) |
| **Reset de senha exigia só uma sessão** | Usuário já logado que abrisse `/reset-password` trocava a senha sem reautenticar. Agora exige evento `PASSWORD_RECOVERY`. `ResetPassword.tsx` |
| Regra de senha divergente | Cadastro pedia 8 caracteres, reset aceitava 6. Unificado em `MIN_PASSWORD`. `lib/constants.ts` |
| Erro técnico vazando | `ErrorBoundary` mostrava `error.message` cru (nome de coluna, constraint) e o onboarding chegava a instruir "rode a migration Sprint 6" pro professor. Agora vai pro console e pra telemetria |

## 2. Bugs de correção

| Bug | Consequência | Onde |
|---|---|---|
| **Colisão de `queryKey`** | `/alunos` antes de `/financeiro` fazia o botão dizer "Gerar 28 cobranças" e **criar cobrança de verdade pra aluno arquivado** | `Financeiro.tsx` |
| **Matching de aula ±60min** | Aluno com aula 14h e 15h: presença gravada no registro errado; a segunda marcação apagava a primeira | `Agenda.tsx` |
| **Aulas fantasma retroativas** | Aluno cadastrado hoje aparecia com aulas em todas as semanas passadas e inflava "previstas" nos relatórios | coluna `data_inicio` |
| **Aulas fora de 07h–22h sumiam** | Aula às 6:30 ou 23h não renderizava na grade — sem scroll, sem aviso | `buildHorasGrid` |
| **Reagendamento sem transação** | Falha entre as duas requests deixava a aula original marcada e a nova inexistente: a aula sumia | RPC `reagendar_aula` |
| **Contadores read-modify-write** | App aberto em duas telas: reposição perdida, aula de pacote grátis pro aluno | RPCs `increment/decrement_reposicao`, `usar_aula_pacote` |
| **Salvar horários destrutivo** | `DELETE` + `INSERT`; falha no insert deixava o aluno sem horário nenhum | RPC `salvar_horarios_aluno` |
| **Datas UTC** | Cobrança de janeiro não contava no "total pago no ano"; alerta de atraso disparava 3h cedo | `lib/dates.ts` |
| **Import CSV por índice** | `RETURNING` sem ordem garantida embaralhava horários entre alunos, em silêncio | casa por nome |
| **Perfil ausente** | Trigger falho levava o professor ao painel com tudo vazio e nenhuma explicação | `ProtectedRoute.tsx` |
| Contagem por visão na Agenda | Visão mensal mostrava o número da semana rotulado "este mês"; visão dia dizia "Mês ·" | `Agenda.tsx` |
| Badge "Extra" em reagendada | Aula fruto de reagendamento aparecia como "Extra" | `Agenda.tsx` |
| Lembrete sem ✓ | Invalidação disparava antes do insert; o professor reenviava | `whatsapp.ts` retorna Promise |
| Painel sugeria aula em feriado | E aula já realizada como se fosse acontecer | `Dashboard.tsx` |
| "Bom dia" às 23h | Saudação literal, sem hora | `saudacaoDoDia` |
| Config apagava o que se digitava | `refetchOnWindowFocus` re-hidratava os campos | guard de hidratação |
| Mês travado | `new Date()` no escopo do módulo | `Financeiro.tsx` |

## 3. Design system

- **`bg-primary-soft` e `border-primary-ring` não existiam no Tailwind.** As
  variáveis CSS estavam lá, as classes nunca foram registradas — o tint âmbar
  não aparecia em nenhum KPI, section card, empty state ou chip de filtro ativo.
  Registradas, junto de `success/warning/info/destructive-soft`.
- **O variant `dark:` era código morto** — o `ThemeContext` só adicionava
  `.light`, nunca `.dark`. Corrigido no contexto e no script anti-FOUC.
- **Light mode reprovado em contraste.** Botão primário estava em 3.30:1.
  `--primary`, `--success`, `--warning`, `--info` e `--destructive` do tema claro
  foram recalculados pra ≥4.5:1. Borda de campo ganhou token próprio
  (`--border-field`, 3:1) — WCAG 1.4.11.
- **Vocabulário único de status** (`lib/aulaStatus.ts`). Existiam 5 mapas
  paralelos com rótulos divergentes ("Presente" vs "Realizada", "Falta s/ aviso"
  vs "Falta sem aviso" vs "Falta").
- **569 linhas de código morto removidas**: `PageHeader`, `MetricCard`,
  `TabsStudoo`, `Toggle`, `SegmentedButtons`, `App.css`. Estão em
  `_to_delete/codigo-morto/` — confira e apague.
- Helpers deduplicados: `lib/format.ts` (o `fmtBRL` estava em 5 arquivos),
  `lib/constants.ts` (`DIAS_SEMANA` em 6), `lib/chartPalette.ts`.
- `<h1>` duplicado por página resolvido; a prop `eyebrow` do `PageHead`, que 7
  páginas passavam e o componente ignorava, agora renderiza.
- Fontes com `display=swap` (era `block`: até 3s de texto invisível).

## 4. Mobile e acessibilidade

- **Ações primárias existem no celular.** "Nova aula", "Enviar lembretes",
  "Gerar cobranças" e "Exportar CSV" viviam só no `PageHead` desktop
  (`hidden md:flex`) — não existiam no mobile. `PageHeadMobile` agora aceita
  `actions` e `toolbar`.
- **Navegação de mês existe no desktop.** Era `md:hidden` em Financeiro e
  Relatórios: quem usava desktop ficava preso no mês corrente.
- **Modal de presença com `DialogBody`.** Sem ele o conteúdo colava na borda e o
  botão "Registrar" ficava fora da tela em aparelho baixo.
- Foco visível global tokenizado; `prefers-reduced-motion` cobrindo tudo (antes
  só a landing); skip-link; `aria-current` na navegação.
- **`FormGrid` gerava `<label>` sem `htmlFor`** — quebrava os 14 campos do
  formulário de aluno e os modais. Agora usa `useId` e propaga
  `id`/`aria-describedby`/`aria-invalid`.
- Linhas clicáveis (`<tr>`/`<div onClick>`) viraram alcançáveis por teclado;
  ações escondidas em `opacity-0` ganharam `group-focus-within`.
- `StatusIcon` aceita `showLabel` — no touch não há hover, então o tooltip
  nativo nunca aparecia e o status virava puro código de cor.
- Popover de notificações e drawer mobile com focus trap e retorno de foco.
- Área de toque de 44px nos botões `icon-sm`, sem mudar o tamanho visual.

## 5. Performance

- Tabela de alunos: índice memoizado no lugar de filter+sort por linha
  (~44 mil iterações e 40 sorts por render, a cada tecla na busca).
- Agenda: índice de aulas por dia (a visão mensal construía centenas de milhares
  de `Date` a cada troca de mês).
- `.limit(600)` nas queries que baixavam o histórico inteiro do professor.
- Bundle de entrada: 91.95 kB → **84.65 kB** gzip.

## 6. Fluxos

**Onboarding** — salva a cada etapa (fechar a aba no passo 4 perdia tudo);
ordem invertida pra começar pelo aluno, não pelo endereço do recibo; o
aluno-fantasma acabou (preencher só o nome dava "sucesso" sem criar aluno);
duração de aula ganhou UI; navegação por seta que pulava etapa sem validar foi
removida; preview existe no mobile; primeiro aluno vai pra `aulas_recorrentes`.

**Formulário de aluno** — Ctrl/Cmd+Enter agora funciona de verdade (o hint
prometia e não havia handler nenhum); grid de horários não estoura em 390px;
um estilo de campo só; instrumento obrigatório; confirmação ao descartar.

**Checklist do painel** — "conferir a agenda" marcava sozinho junto com
"cadastrar aluno". Agora depende de o professor abrir a agenda.

## 7. Copy e legal

- Removidos os 4 números fabricados ("200+ professores", "8 mil aulas",
  "R$ 380k", "4.8 estrelas") e os 3 depoimentos assinados falsos. **Isso era
  risco de CDC art. 37.**
- "14 dias grátis" → "beta gratuito" (não havia trial no código).
  "Cobrança automática" → "em um clique". "Lembretes automáticos" → "lembrete
  pronto pra enviar". FAQ reescrito.
- Termos e Política reescritos pro produto real: sem Stripe, sem Resend, sem
  read-only de 30 dias, sem "50% vitalício". Subprocessadores reais.
- Card do plano: "Studoo Pro · R$ 19,90 · Ativo" com botões `disabled` →
  "Beta aberto · R$ 0 · Gratuito".

## 8. Features novas

- **Dia de vencimento configurável** (era fixo no 10).
- **LGPD**: exportação completa em JSON, exclusão de conta (com confirmação por
  digitação) e exclusão definitiva de aluno — antes só existia arquivar.
- **Telemetria** (`lib/analytics.ts`): funil de ativação + captura de erro.
  Sem `VITE_POSTHOG_KEY` é no-op total e nada é baixado. Sem dependência npm.
- **Deploy**: não definido; o app roda local por enquanto. O host que for
  escolhido precisa de rewrite de SPA, senão F5 em `/agenda` dá 404.

---

## O que continua não existindo

Billing, trial, lembrete automático, PIX com QR, e-mail do produto, portal do
aluno, aulas em grupo, testes automatizados.

A landing, os Termos e a Política agora descrevem exatamente isso. Se alguma
dessas linhas mudar, os três textos mudam junto.

## Estado do banco (aplicado e verificado em 08/08/2026)

`sql/2026-08-lancamento.sql` rodou. As 8 tabelas estão com RLS ligado e **1
policy canônica em cada** (`FOR ALL`, `TO authenticated`, filtrando por
`meu_professor_id()`).

No caminho apareceram duas coisas que valem registro:

**19 policies antigas conviviam com as novas.** Eram a versão granular (uma por
operação: Select/Insert/Update/Delete own alunos, own aulas, own cobrancas, own
professor) do que a canônica faz com `FOR ALL`. Todas filtravam corretamente por
`auth.uid()`, então não houve exposição — mas foram removidas: `professores`
chegou a ter 8 policies pra uma regra só, e cópia da mesma lógica é convite pra
uma divergir numa alteração futura sem ninguém notar.

**Policy de RLS é permissiva e se soma por OR.** Ter a policy certa não protege
se sobrar uma larga do lado. Sempre que criar policy pela UI do Supabase, rode
`sql/2026-08-auditoria-policies.sql` depois — ele classifica cada uma como
canônica / redundante / PERIGO e já devolve o `DROP` pronto.

Um detalhe que engana: policy sem cláusula `TO` vale pro papel `public`, que
inclui `anon`. Parece grave e quase nunca é — pra quem não logou, `auth.uid()`
é NULL, então `user_id = auth.uid()` nunca dá true. O que importa é a
expressão, não o papel.

## Rodada 2 — teste ponta a ponta e fundação (09/08/2026)

**Teste ponta a ponta no app real**, contra o Supabase de produção, com conta
de teste criada e apagada no fim. Percorreu cadastro → onboarding → aluno →
presença → cobrança → relatórios → ajustes → exclusão da conta. Zero erro de
RLS, zero fallback de RPC, zero exceção no console. Confirmou na prática:
`data_inicio` segurando aula fantasma, RPCs de reposição nos dois sentidos,
duração de 45min persistindo, checklist não auto-marcando, saudação por hora,
nav de mês no desktop, modal de presença com botão alcançável, light mode
legível e a exclusão LGPD funcionando.

**Achados do teste, todos corrigidos:** promessa de "mensagens automáticas no
WhatsApp" sobrevivendo dentro do onboarding (mais duas do mesmo tipo);
CPF/CNPJ salvo e exibido sem máscara (`formatCpfCnpj` novo — o antigo só
tratava 11 dígitos); `capitalize` do Tailwind escrevendo "Segunda-Feira, 10 De
Agosto" em 12 pontos (trocado por `first-letter:uppercase`, com `inline-block`
onde o elemento era inline); singular/plural nos KPIs; warning de Select
uncontrolled→controlled; título duplicado no desktop (o TopBar agora mostra
seção + contexto, e o `<h1>` fica só no PageHead); redirect pós-exclusão caindo
em `/login` em vez da landing.

**Import por colagem** (`lib/csv.ts` + `components/alunos/ColarAlunos.tsx`).
O import antigo exigia baixar modelo, preencher e subir arquivo — e rejeitava
linha sem mensalidade. O novo aceita Ctrl+V direto do Excel/Sheets: detecta TAB,
`;` ou `,`, descobre se há cabeçalho e **infere o papel de cada coluna pelo
conteúdo**, então a ordem não importa. Só o nome é obrigatório. Quando a
inferência erra, o professor corrige a coluna num select em vez de reformatar a
planilha. Está no onboarding (alternador "Cadastrar um" / "Colar minha lista")
e como caminho principal do modal de import.

**Regra de negócio extraída pra `src/lib/domain/`** — `agenda.ts` (slots,
matching, faixa de horas, política de reposição), `frequencia.ts` e
`horarios.ts`. Nenhum deles importa React ou Supabase. O `getHorariosDoAluno`
era função pura morando no arquivo do hook, o que arrastava a validação de env
pra dentro de qualquer teste; o hook agora reexporta, sem quebrar call-site.

**48 testes** (`npm test`, Vitest). Não são decorativos: cada caso marcado como
`REGRESSÃO` reproduz uma falha real desta sessão — o slot das 15h casando com a
aula das 14h, a recorrência gerando aula antes da data de início, a grade
escondendo aula às 6h, a frequência contando feriado, a cobrança vencendo hoje
já aparecendo atrasada, e `toDateOnly` voltando um dia às 22h30. Rodam em
`America/Sao_Paulo` com relógio fixado, porque os bugs de data só aparecem
fora de UTC.

## Próximo passo sugerido

1. ~~Rodar `sql/2026-08-lancamento.sql`~~ — feito e verificado.
2. ~~Testar cadastro → onboarding → 1º aluno → presença → cobrança~~ — feito no app real em 09/08.
3. **SMTP próprio** (Resend, Postmark, SES ou Brevo). O serviço padrão do
   Supabase entrega 2 emails/hora e só pra membros da organização — hoje
   NENHUM professor consegue confirmar o cadastro. É o único bloqueador real.
   Se plugar o Resend, ele volta pra Política de Privacidade como
   subprocessador.
4. Preencher `VITE_POSTHOG_KEY` antes de convidar alguém, senão o beta não ensina nada.
5. Beta fechado com 10–20 professores. Medir se voltam na semana 4 — só depois decidir billing.

### Ainda sem cobertura de teste manual
Recibo, WhatsApp, import/export CSV por arquivo, pacotes e a visão mobile.
A colagem foi testada no parser (12 casos), não na interface.
