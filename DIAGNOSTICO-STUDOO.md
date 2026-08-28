# Studoo — Diagnóstico completo

**Data:** 08/08/2026 · **Base:** leitura integral de `src/` (~17.4k linhas), `FEATURES.md`, `MIGRATIONS.md`, `AUTH_SETUP.md`, `_handoff-code/INSTRUCOES.md`
**Óticas:** Produto (PM) · Engenharia (Dev) · Design (UX/UI)

---

## TL;DR

Studoo é um **CRM de carteira de alunos particulares de música** — cadastro, agenda recorrente, presença com diário, mensalidades, recibo e relatório de frequência. Stack moderna (React 19, Vite 8, TS 6, Supabase, TanStack Query v5), tipagem estrita real, `tsc` e `eslint` passando limpos, bundle bem code-splitado (92 kB gzip de entrada).

**O núcleo de valor está pronto e é bom.** O que falta não é feature — é confiabilidade, honestidade de copy e infraestrutura de lançamento.

Três coisas travam tudo:

1. 🔴 **Você não sabe se o RLS está ligado** nas 4 tabelas centrais (`professores`, `alunos`, `aulas`, `cobrancas`). Não há policy versionada para nenhuma delas. Se estiver desligado, é vazamento cross-tenant de dados pessoais — inclusive de menores. **Verificar hoje.**
2. 🔴 **A landing promete um produto que não existe** (14 dias grátis, cobrança automática, PIX integrado, "cancela em 1 clique") + 4 estatísticas e 3 depoimentos fabricados. Risco de CDC art. 37 e destruição de confiança na primeira semana.
3. 🔴 **Não é um repositório git.** Sem versionamento, sem CI, sem testes, sem deploy configurado.

Estágio real: **alpha avançada**. ~2 semanas de um beta fechado honesto; 6–10 semanas de poder cobrar.

---

# PARTE 1 — Produto

## 1.1 O que é, para quem

**Job-to-be-done:** *"parar de me perder entre planilha, WhatsApp e caderno para saber quem tem aula hoje, quem faltou e quem não pagou."* Não é ensinar melhor — é reduzir carga administrativa.

**Persona:** professor independente, solo, 10–40 alunos, mensalidade + PIX, comunicação 100% WhatsApp.
**Não serve:** escolas (sem multi-professor, sem turmas, sem papéis) nem quem cobra majoritariamente por hora avulsa.

**Diferencial defensável:** vocabulário de domínio (instrumento, repertório, reposição, lição de casa, pacote, aula experimental). Está bem feito no código — e é justamente o que a landing menos vende.

## 1.2 Inventário real vs. documentação

O `FEATURES.md` está **desatualizado em ~8 pontos**. O que ele não conta:

| Existe no código, ausente do doc | Onde |
|---|---|
| Wizard de onboarding fullscreen (6 etapas, 936 linhas) | `pages/Onboarding.tsx` |
| Módulo Relatórios inteiro (frequência, donut, insights) | `pages/Relatorios.tsx` (706 l.) |
| Login com Google (OAuth) | `shared/GoogleSignInButton.tsx` |
| Verificação de e-mail | `pages/VerificarEmail.tsx` |
| Termos + Privacidade | `pages/Termos.tsx`, `Privacidade.tsx` |
| Lição de casa + resumo no WhatsApp | `Agenda.tsx` (Sprint 9) |
| Envio de lembretes do dia em lote com dedupe | `Agenda.tsx:1244-1296` |
| Nível e objetivo do aluno | Sprints 4-5 |

| Doc afirma, código diz outra coisa | Realidade |
|---|---|
| "Política de faltas: 🚧 controles desabilitados" | **Funciona** e é lida em `Agenda.tsx:208-215` para decidir concessão de reposição |
| "Fontes: Syne + DM Sans + DM Mono" | **Sora + JetBrains Mono** (`index.html:32,36`) |
| "React 18 / Router v6" | **React 19.2 / Router 7.15 / Vite 8 / TS 6** |
| "Lembrete de aula não plugado ainda" | Já existe o sheet de lembretes em lote |

**Recomendação:** o `FEATURES.md` virou passivo. Ou reescreve baseado no código, ou apaga — um doc que mente é pior que doc nenhum.

## 1.3 O que realmente não existe

| Gap | Evidência |
|---|---|
| **Billing / Stripe / assinatura / trial** | Zero linhas. "Stripe" só aparece em `Termos.tsx:46` e `Privacidade.tsx:34,86` — texto legal descrevendo algo inexistente |
| **Notificações automáticas** | Nenhuma Edge Function; único `rpc()` do projeto é `increment_reposicao` |
| **E-mails próprios** (Resend citado na Privacidade) | Nenhum envio em lugar nenhum. `alunos.email_notificacao` é campo morto |
| **Analytics / error tracking** | Zero: sem PostHog, GA, Mixpanel, Sentry, Plausible |
| **Exclusão de conta / de aluno** (LGPD) | Aluno só é arquivado (`status='inativo'`). Não há delete de conta |
| **Repositório git** | Só `.gitignore`. Sem histórico, sem branch, sem CI |
| **Config de deploy** | Sem `vercel.json` / `_redirects` → refresh em `/alunos/:id` dá 404 em host estático |
| **Testes** | `playwright` no `package.json`, zero specs, zero config |

✅ **Correção importante:** a pasta `public/` **existe** e contém os 9 favicons + `landing/{dashboard,alunos,aluno,agenda,financeiro}.png`, que batem com os caminhos usados em `Index.tsx`. Esse não é um problema (registro aqui porque uma primeira leitura sugeriu o contrário).

## 1.4 Risco legal e de confiança — o mais urgente depois do RLS

### Promessa vs. entrega

| A landing/FAQ promete | O app entrega |
|---|---|
| "14 dias grátis, depois R$ 19,90" | Grátis para sempre. Nenhuma contagem |
| "Cobrança automática — gera mensalidades no dia certo" | Botão manual, vencimento **fixo no dia 10** (`Financeiro.tsx:149-152`) |
| "Lembretes automáticos via WhatsApp" | Você clica e abre o `wa.me` de cada aluno, um por um |
| "PIX integrado" | Chave PIX colada como texto. Sem QR, sem baixa automática |
| "Cancela em 1 clique no painel" | Botão `disabled` |
| "Backups diários / monitoramento de acessos suspeitos" | Herdado do Supabase; nenhum processo próprio |
| "App nativo em breve" | Nenhum trabalho nessa direção |
| Card "Studoo Pro · **Ativo** · R$ 19,90" | Ninguém paga nada |
| Termos: "50% vitalício a R$ 9,95" | Conflita com R$ 19,90 do card |

### Prova social fabricada

`Index.tsx:64-110` tem hardcoded: **"200+ professores no beta"**, **"8 mil aulas registradas"**, **"R$ 380k em mensalidades"**, **"4.8 estrelas"** e três depoimentos assinados (Marina S./SP, Rafael P./RJ, Juliana M./BH).

Isso é publicidade enganosa (CDC art. 37). Independente do risco jurídico: se um professor perguntar "quem são os 200?", a confiança acaba ali.

### LGPD não operacionalizável

A Política promete exportação, anonimização e exclusão em 15 dias úteis. No app: **não existe excluir conta**, **não existe excluir aluno**, e a exportação é CSV parcial. Você seria operador de dados de menores (a própria política cita o Art. 14) sem mecanismo de eliminação.

## 1.5 Monetização — a decisão que ainda não foi tomada

R$ 19,90 é ~2–4% de **uma** mensalidade de aluno (R$ 150–350 é a faixa típica). Preço não é a objeção — **esforço de migração e confiança são**.

Mas R$ 19,90 **inviabiliza aquisição paga**: com churn realista de 8–12%/mês em B2C-micro, LTV bruto fica em R$ 170–250; CAC de mídia paga no Brasil para nicho educacional passa fácil de R$ 100–250. LTV/CAC ≈ 1. O único canal viável é orgânico: grupos de professores, Instagram, indicação, parceria com lojas de instrumento e luthiers.

O produto está preso entre duas identidades:

| | **Organizador** (o que existe) | **Recebedor** (o que a landing promete) |
|---|---|---|
| Preço | R$ 19,90 | R$ 39–59 |
| Precisa de | Polimento + copy honesta | PSP com PIX, WhatsApp Cloud API, backend de recorrência |
| Crescimento | Só orgânico | Sustenta aquisição paga |
| Prazo | 2 semanas | 2–3 meses de backend |

**Recomendação:** lance como **organizador com copy honesta em 2 semanas**, meça se o professor volta na semana 4, e só então construa a máquina de cobrança — com a certeza de que o hábito existe antes.

## 1.6 O "aha moment"

**Existe e está bem construído:** *"abri o app de manhã e em 10 segundos vi quem tem aula hoje, quem está devendo e quem sumiu."* Dashboard + Agenda + `useNotificacoes.ts` (detecta cobrança atrasada, 3+ faltas em 30 dias, aniversário) + insights automáticos do Relatórios ("Quarta é seu dia mais cheio") entregam mais que uma planilha.

O problema é **chegar até ele e não sair**:

1. **Time-to-value.** Wizard de 6 telas → 1 aluno → tela vazia → o professor precisa descobrir sozinho o import CSV. O import deveria ser o **passo 1**, com colar-da-planilha (Ctrl+V de células do Excel/Sheets), não só upload de arquivo formatado.
2. **A dor mais cara não é resolvida: receber.** O professor não larga a planilha por organização — larga porque perde mensalidade. PIX com QR dinâmico + baixa automática (via Asaas/Efí/Pagar.me, não Stripe) é o que muda a categoria do produto.
3. **O aluno não está no produto.** Zero superfície voltada ao aluno/responsável. É o que geraria loop viral (cada professor expõe a marca a 20+ alunos).
4. **Nada puxa de volta.** Sem push, sem e-mail de resumo semanal. Um resumo por WhatsApp toda segunda seria o gancho de retenção mais barato disponível.

---

# PARTE 2 — Engenharia

## 2.1 O que está bom (registro honesto)

- Tipagem estrita real: **zero `any`, zero `@ts-ignore`**, `noUnusedLocals`, `erasableSyntaxOnly`
- `tsc -b` ✅ · `eslint .` ✅ (0 erros, 0 warnings) · `vite build` ✅ (570 ms)
- Bundle: **92 kB gzip** de entrada com code-splitting por rota funcionando
- `lib/cobranca.ts` — regra de "atrasado" centralizada e usada em 7 lugares. Único pedaço com disciplina de domínio real
- `lib/csv.ts` — parser RFC4180-ish honesto (aspas, CRLF, autodetect de separador, aliases PT/EN)
- `lib/auth-errors.ts` — tradução de erros do Supabase com fallback
- `getHorariosDoAluno()` — fallback retrocompatível bem resolvido
- Os 14 `eslint-disable` do projeto são **todos justificados com comentário**. Disciplina rara
- `handle_new_user` é `SECURITY DEFINER` **com `SET search_path = public`** — correto, evita hijacking

## 2.2 🔴 Segurança — o risco nº 1

`MIGRATIONS.md` documenta policies para **4 tabelas**: `bloqueios_data`, `aulas_recorrentes`, `pacotes_aulas`, `mensagens_enviadas`.

**Não há policy versionada para `professores`, `alunos`, `aulas` nem `cobrancas`** — as 4 tabelas centrais. O `FEATURES.md:268` afirma que "todas as tabelas têm RLS", mas o próprio `MIGRATIONS.md:360` diz *"confirme que sua tabela professores está com RLS ativo"* — ou seja, o doc reconhece que não sabe.

Isso importa porque **4 queries dependem inteiramente de RLS**, sem filtro de `professor_id`:

```
AlunoDetalhe.tsx:89   .from("alunos").select("*").eq("id", id)
AlunoDetalhe.tsx:103  .from("aulas").select("*").eq("aluno_id", id)
AlunoDetalhe.tsx:118  .from("cobrancas").select("*").eq("aluno_id", id)
AlunoDetalhe.tsx:132  .from("mensagens_enviadas").select("*").eq("aluno_id", id)
```

**Cenário:** sem policy de SELECT em `alunos`/`cobrancas`, qualquer usuário autenticado que descubra um UUID acessa `/alunos/<uuid>` e lê nome, telefone, e-mail, responsável, data de nascimento, mensalidade e histórico financeiro completo de aluno de outro professor. Com a anon key (obrigatoriamente pública no bundle Vite), é explorável direto via `curl`.

**Rode hoje no SQL Editor do Supabase:**

```sql
SELECT relname, relrowsecurity FROM pg_class
 WHERE relname IN ('professores','alunos','aulas','cobrancas',
                   'aulas_recorrentes','pacotes_aulas','bloqueios_data','mensagens_enviadas');

SELECT tablename, policyname, cmd, qual, with_check
  FROM pg_policies WHERE schemaname='public';
```

E cole o resultado como um bloco novo no `MIGRATIONS.md`.

**Outros pontos de segurança:**

- `ResetPassword.tsx:19-21` — `ready` vira `true` para **qualquer** sessão, não só recovery. Usuário já logado que abra `/reset-password` troca a senha **sem reautenticação**
- Regras de senha divergentes no mesmo produto: `Cadastro.tsx` exige 8 caracteres, `ResetPassword.tsx:33` aceita 6
- Policies existentes não usam `TO authenticated` e não validam coerência `aluno_id` ↔ `professor_id`
- `Onboarding.tsx:928` mostra ao usuário final: *"Rode a migration Sprint 6 do MIGRATIONS.md"*. Debug em produção
- `whatsapp.ts:38-44` persiste o texto integral das mensagens, **incluindo a chave PIX**, sem política de retenção
- `zod`, `react-hook-form` e `@hookform/resolvers` estão no `package.json` com **zero imports**. Toda validação é `if` manual

## 2.3 🔴 Bugs de correção confirmados

### BUG-1 — Colisão de `queryKey` gera cobranças para alunos arquivados

Cinco arquivos usam `["alunos", professor?.id]` para queries **semanticamente diferentes**:

| Arquivo | Filtro |
|---|---|
| `Alunos.tsx:871`, `Dashboard.tsx:130`, `Agenda.tsx:1139`, `Relatorios.tsx:149`, `useNotificacoes.ts:25` | **todos** os alunos |
| **`Financeiro.tsx:89`** | **`.eq("status","ativo")`** ← diferente |

Quem monta primeiro define o cache, e os outros consomem por até 2 min (`staleTime` global).

- **Falha A:** professor com 20 ativos + 8 arquivados abre `/alunos` (cache = 28), vai para `/financeiro`. O botão diz **"Gerar 28 cobranças"** e o upsert **cria cobranças reais para alunos arquivados**. `metrics.prevista` também infla.
- **Falha B (inverso):** abre `/financeiro` primeiro → em `/alunos` a aba "Arquivados" mostra 0 e os arquivados somem da tela.

**Fix (30 min):** chave discriminada `["alunos", professorId, { status: "ativo" }]`, ou remover o filtro e filtrar em memória.

### BUG-2 — Presença gravada na aula errada

`Agenda.tsx:132-140` casa slot ↔ aula com tolerância de **±60 min**. Aluno com dois horários no mesmo dia (14:00 e 15:00 — cadastrável em `AlunoForm.tsx:451`) tem os **dois slots casando com a mesma aula** (diff 0 e diff 60, ambos `<= 60`). O `usedAulaIds` só protege avulsas.

Marcar presença no slot das 15:00 executa `UPDATE` no registro das 14:00. Se as duas forem marcadas, a segunda apaga a primeira. Corrompe o diário e o relatório de frequência.

**Fix:** tolerância `< duracao/2` (ou 15 min) **e** consumir a aula do pool.

### BUG-3 — Mutations multi-tabela sem transação

- `AlunoForm.tsx:232-251` — `DELETE` de todos os `aulas_recorrentes` + `INSERT`. Falha no insert deixa o aluno **sem nenhum horário**
- `Agenda.tsx:357-397` — reagendar: `UPDATE status='reagendada'` + `INSERT` da nova. Falha na segunda → **a aula desapareceu**
- `Agenda.tsx:666-709` — converter trial: 3 operações encadeadas

**Fix:** RPC plpgsql (já atômica por natureza). O projeto já usa esse padrão em `increment_reposicao`.

### BUG-4 — Race em contadores

`increment_reposicao` foi criada **exatamente** para isso, mas o padrão read-modify-write sobreviveu em: `Agenda.tsx:332-345` (decremento ao desfazer falta), `Agenda.tsx:898-913` (decremento ao criar reposição), `PacotesTab.tsx:183-193` (lê `aulas_usadas` da **prop cacheada**).

Cenário: app aberto no celular e no desktop, desconta 1 aula em cada dentro dos 2 min de `staleTime` → ambos leem 3, ambos gravam 4. **O aluno ganha uma aula grátis.**

### BUG-5 — Aulas fora de 07h–22h desaparecem

`HORAS_GRID = Array.from({length:16}, (_,i) => i+7)` (`Agenda.tsx:79`). Aula às 06:30 ou 23:00 — perfeitamente cadastrável (input `time` livre) — **não é renderizada** na grade semanal desktop. Sem scroll, sem aviso, sem indicador.

### BUG-6 — Aulas fantasma retroativas

`buildSlotsForDay` só compara `dia_semana`. Não existe `data_inicio` em `aulas_recorrentes`. **Aluno cadastrado hoje aparece com aulas em todas as semanas passadas**, e o Relatórios infla "Previstas" de meses anteriores. O primeiro professor que abrir o relatório do mês passado vai desconfiar do número — e número em que não se confia mata a feature.

### BUG-7 — Datas: `new Date(dateStr)` sem `T00:00:00`

O código adotou o padrão correto em ~14 lugares, mas escapou em três:

| Local | Efeito em BRT (UTC-3) |
|---|---|
| `Alunos.tsx:287` e `AlunoDetalhe.tsx:185` | `"2026-01-01"` → 31/12/2025 local → **a cobrança de janeiro não conta no "Total pago no ano"** |
| `Dashboard.tsx:381` | Alerta "Cobrança atrasada" dispara ~3h cedo |

### BUG-8 — Import CSV assume ordem do `RETURNING`

`Alunos.tsx:628-645` casa `validRows[i]` com `created[i]` **por posição**. PostgREST não garante ordem em multi-row INSERT. Se divergir, os horários vão para o **aluno errado**, silenciosamente. Com 30 alunos importados, a agenda inteira embaralha.
**Fix:** `created.find(c => c.nome === r.nome)` — o `nome` já vem no select.

### Outros confirmados

- `Agenda.tsx:1310/1323/1331` — visão mensal mostra **contagem da semana** rotulada "este mês"; visão dia exibe eyebrow "Mês ·"
- `Agenda.tsx:1296` — invalidação de `lembretes-hoje` dispara **antes** do INSERT fire-and-forget resolver → o ✓ "Lembrado" não aparece e o professor reenvia
- `Configuracoes.tsx:81-91` — `refetchOnWindowFocus` sobrescreve o que o usuário está digitando. E `onBlur` grava + toast **mesmo sem alteração**
- `Financeiro.tsx:40` — `const today = new Date()` no escopo do módulo → aba aberta virando o mês fica travada
- `ProtectedRoute.tsx:60` — se `professor` for `null` (trigger falhou), cai no `return children` e o usuário chega ao Dashboard com todas as queries `enabled: false`: telas vazias sem mensagem de erro
- `Dashboard.tsx:55-83` — "Próximas aulas" lista dias **bloqueados** e aulas **já realizadas** (`useBloqueios` está importado mas não é passado)

## 2.4 Dívida técnica estrutural

**A camada de acesso a dados não existe.** 22 `select("*")` e ~30 mutations escritos inline dentro de componentes JSX. Sem repositório, sem service, sem `queryOptions()` compartilhado. É a causa-raiz do BUG-1, do BUG-3 e das regras de negócio divergentes.

**Monolitos:**

| Arquivo | Linhas | Conteúdo |
|---|---|---|
| `Agenda.tsx` | **2063** | 3 modais completos + 2 geradores de slots + política de reposição + 4 queries + 5 mutations + 3 views + 2 sheets |
| `Alunos.tsx` | 1201 | `AlunoCard` + `AlunoSheet` (307 l.) + `ImportarCsvModal` (289 l.) + página |
| `Onboarding.tsx` | 936 | 6 steps + preview + 4 helpers de parsing de erro Postgres |
| `Dashboard.tsx` | 854 | 6 queries + 9 `useMemo` de agregação |

**Duplicação medida:**

- `fmtBRL` copiado literalmente em **5 arquivos**, com mais 2 variantes divergentes
- `DIAS_SEMANA` em **6 lugares** + 3 variantes `SHORT`
- Read-modify-write de `reposicoes_disponiveis` copiado 3×
- Cálculo "total pago no ano" duplicado — **e as duas cópias têm o mesmo bug de data**
- O status de aula tem **5 representações paralelas** com rótulos divergentes ("Presente" vs "Realizada", "Falta" vs "Falta s/ aviso" vs "Falta sem aviso")

**Tipos escritos à mão** (`types/supabase.ts`), não gerados por `supabase gen types`, com todo `select` fazendo cast cego (`as Aluno[]`). Já há divergência: `Aula.repertorio` nunca é lido nem escrito — a UI grava repertório em `observacao` (`Agenda.tsx:518`).

## 2.5 Performance

Bundle está bom, não mexer. O problema é query e render:

| Local | Problema |
|---|---|
| `Alunos.tsx:886,900` | Baixa **todas** as aulas e **todas** as cobranças, sem `limit`. Em 3 anos: ~4.300 + ~1.100 registros ao abrir a lista |
| `AlunosTable.tsx:66` | `getCobrancaStatusForAluno` faz filter+sort no array **inteiro** por linha, sem memo. 40 alunos × 1.100 cobranças = **44k iterações + 40 sorts por render**, a cada tecla na busca |
| `AgendaMensal.tsx:103-130` | ~**327k** construções de `Date` ao trocar de mês. Perceptível no mobile |
| `Dashboard.tsx:364-399` | ~27k iterações com `new Date()` no cálculo de alertas |
| `Alunos.tsx:1128` | Rodapé com `"Página 1 / 1"` **hardcoded**. Sem paginação nem virtualização |

Nenhum `React.memo`/`useCallback` em listas. `PageContext` cria objeto novo a cada render.

## 2.6 Tooling

| Item | Estado |
|---|---|
| **Git** | ❌ **Não é um repositório.** Só `.gitignore` |
| CI | ❌ |
| Testes (unit ou E2E) | ❌ zero. `playwright` instalado sem config nem specs |
| Lint / typecheck / build | ✅ todos passam limpos |
| Prettier / pre-commit | ❌ |
| Types do Supabase | ⚠️ manuais |

A config de ESLint **não inclui** `typescript-eslint` type-aware, então `no-floating-promises` não roda — o que explica o `openWhatsApp` fire-and-forget passar limpo. Também não há `eslint-plugin-jsx-a11y`.

---

# PARTE 3 — Design (UX/UI)

## 3.1 Design system — a verdade

**O handoff está certo, o `FEATURES.md` mente.** Fontes reais: **Sora + JetBrains Mono** (`index.html:32,36`, `tailwind.config.ts:10-13`). Nenhum vestígio de Syne/DM Sans.

**Implementado com fidelidade:** escala completa de tokens hex (`--bg-0..5`, `--fg-1..4`, radius, shadows, timing, densidade), mapa shadcn em HSL dark+light, anti-FOUC no `index.html:42-53`, sidebar 240px, topbar 64px, bottom nav floating pill com `safe-area-inset`, `StudooMark` + `Wordmark`, `StatusIcon` circular 22px com 5 variantes, notif popover com click-outside + Esc.

## 3.2 🔴 `bg-primary-soft` e `border-primary-ring` não existem no Tailwind

`tailwind.config.ts:21-24` define só `primary.DEFAULT` e `primary.foreground`. As variáveis CSS `--primary-soft` e `--primary-ring` existem em `index.css:35-37` — **mas nunca foram registradas no Tailwind**. As classes não compilam e são silenciosamente ignoradas.

Ou seja: o tint âmbar **não aparece** em:

| Onde | Efeito |
|---|---|
| `KpiCard.tsx:28` | **Todos os KPIs** do Painel/Financeiro/Relatórios |
| `SectionCard.tsx:21` | Ícone de **todos os section cards** |
| `EmptyState.tsx:38` | Círculo de **todos os empty states** |
| `FilterBar.tsx:78` | **Estado ativo dos chips de filtro** |
| `Configuracoes.tsx:196` | Item ativo da side-nav (fica sem indicação visual) |
| `AuthLayout.tsx:129,142` | Pill e hover do switcher de auth |

**É a correção de maior retorno visual do relatório inteiro. Duas linhas:**

```ts
primary: {
  DEFAULT: "hsl(var(--primary))",
  foreground: "hsl(var(--primary-foreground))",
  soft: "var(--primary-soft)",
  ring: "var(--primary-ring)",
},
```

O próprio checklist do handoff pede *"build sem classes Tailwind inexistentes"*.

## 3.3 Outras divergências do design system

- **O variant `dark:` do Tailwind é código morto.** `darkMode: ["class"]` no config, mas `ThemeContext.tsx:23-27` só adiciona/remove `.light` — a classe `.dark` nunca chega ao `<html>`. Os tokens funcionam (porque `index.css:12` usa `:root, .dark`), mas qualquer `dark:` escrito no futuro é ignorado. Já afeta `NivelBadge.tsx:40`
- **Escala tipográfica declarada e não adotada:** `.t-h3`, `.t-body`, `.t-small`, `.t-caption` têm **0 usos**. Em contrapartida há **213 ocorrências de `text-[Npx]` em 24 tamanhos distintos** (`10px`×52, `11px`×27, `13px`×18, `13.5px`×18, `10.5px`×13…). Três réguas paralelas, e a oficial é a menos usada
- **Faltam componentes shadcn** que o handoff pediu: `card.tsx`, `popover.tsx`, `tooltip.tsx`, `checkbox.tsx`, `form.tsx`. Sem `Card`, ~30 divs reimplementam o mesmo card com paddings diferentes (20px / 22px / `p-5` / `px-6 pt-[22px] pb-6`)
- **7 opacidades diferentes** para o mesmo papel "âmbar suave": `/5`, `/8`, `/10`, `/12`, `/15`, `/20`, `primary-soft`. Sem regra
- **4 alturas de campo** (38px / 40px / 46px) e **4 raios** para o mesmo controle
- **Notif popover incompleto:** o handoff pede filtros segmentados com badge âmbar + "Marcar todas como lidas". Nenhum dos dois existe
- **Densidade sem UI:** `.density-compact` e `--row-h` existem e são consumidos, mas não há controle em Configurações
- `index.html:32,36` usa `display=block` em vez de `swap` → até 3s de texto invisível (FOIT), pior LCP

## 3.4 Código morto — 569 linhas

**Componentes com zero imports:** `PageHeader.tsx` (35), `MetricCard.tsx` (151), `TabsStudoo.tsx` (79), `Toggle.tsx` (50), `SegmentedButtons.tsx` (70) = **385 linhas**. Mais `App.css` (184 linhas de boilerplate do Vite, não importado por ninguém).

Detalhe irônico: `skeleton.tsx:11` ainda exporta um `MetricCardSkeleton` que referencia um componente morto. E `SegmentedButtons` existe enquanto **três telas reimplementam o segmented à mão** (`Agenda.tsx:1405`, `Agenda.tsx:461`, `Configuracoes.tsx:185`).

**Props ignoradas:** `PageHead.tsx:4-10` declara `eyebrow?: string` mas **não desestrutura nem renderiza**. Sete páginas passam a prop — 10 strings mortas.

**Título duplicado:** `TopBar.tsx:25` renderiza `<h1>{title}</h1>` e `PageHead.tsx:30` renderiza **outro** `<h1>` com o mesmo texto, ambos `hidden md:flex`. **No desktop, "Alunos" aparece duas vezes, empilhado** — e são dois `<h1>` na mesma página.

## 3.5 🔴 Light mode reprovado em contraste

Funciona mecanicamente (tokens completos, toggle, anti-FOUC), mas os números não passam:

| Combinação | Ratio | AA (4.5) |
|---|---|---|
| **`text-primary-foreground` sobre `bg-primary`** | **3.30** | ❌ **o botão primário inteiro** |
| `text-primary` sobre card | 3.30 | ❌ |
| `success` sobre card | 3.42 | ❌ |
| `warning` sobre card | 3.06 | ❌ |
| `info` sobre card | 4.20 | ❌ |
| `destructive` sobre card | 4.84 | ⚠️ borderline |
| border sobre card (light) | 1.48 | ❌ (mínimo 3:1 para UI) |

E `text-primary` é usado como **texto de verdade** em eyebrows, nav ativa, chips, links e botões.

**Fix (`index.css:163-195`):** `--primary` light para ~`33 80% 36%`, `--success` ~`142 60% 30%`, `--warning` ~`33 90% 34%`, `--info` ~`213 80% 40%`; `--border` light para ≥3:1.

**Hardcodes que quebram no light:** `dialog.tsx:50` (overlay `rgba(10,8,7,0.72)` fixo — modal escurece com marrom do dark), `sheet.tsx:18` (`bg-black/60`), `Avatar.tsx:44` (`text-white/95` sobre gradiente âmbar = **2.0:1**, ilegível nos dois modos), `badge.tsx:96` (variant `info` com HSL hardcoded ignorando o token), `Onboarding.tsx:845` (confetti quase branco, invisível no light).

**No dark**, um caso importa: `dialog.tsx:202` define o corpo do modal como `bg-secondary`, e `DialogDescription` é `text-muted-foreground` a 13px = **4.28:1**. **Toda descrição de modal falha AA.**

## 3.6 Acessibilidade

- **Foco visível em ~30% dos interativos.** Sem estilo de foco: NavItem da Sidebar, **bottom nav inteira**, busca e chips do `FilterBar`, view switch e **todos os slots de aula** da Agenda, side-nav de Configurações, "Pular tudo" do Onboarding
- 🔴 **Ações invisíveis com foco de teclado:** `AlunosTable.tsx:114` e `AulaRow.tsx:57` usam `opacity-0 group-hover:opacity-100` sem `group-focus-within`. Editar/Arquivar são **inalcançáveis sem mouse**
- 🔴 **Linhas clicáveis não são interativos:** `<tr onClick>` (`AlunosTable.tsx:71`) e `<div onClick>` (`AulaRow.tsx:31`, `CobrRow.tsx:88`) sem `tabIndex`, `role` ou handler de teclado
- 🔴 **`title=""` como tooltip em 73 lugares.** O handoff prescreveu isso, mas é ruim num produto usado no celular: no touch **não existe hover**, então o status de cobrança/aula vira **puro código de cor** (falha WCAG 1.4.1)
- **Botões só-ícone sem `aria-label`:** nav de mês do Financeiro (nem `title` tem), ações da `AlunosTable`, nav da Agenda
- 🔴 **`FormGrid.tsx:49` — `<label>` sem `htmlFor`.** Como `Field` é o wrapper padrão, isso quebra **todo o `AlunoForm`** (14 campos) e os modais da Agenda. `FilterBar.tsx:37` — busca principal sem label nem `aria-label`
- **`NotificacoesPopover`** (implementação manual): sem `aria-expanded`/`aria-haspopup`, sem `role="dialog"`, **sem focus trap**, foco não volta ao sino ao fechar
- Hierarquia: **2× `<h1>`** por página, salto h1 → h3
- Sem skip-link. `prefers-reduced-motion` cobre só as classes da landing — o confetti de **50 partículas**, os `animate-ping` e o shimmer do skeleton ignoram
- Alvos de toque de 32px (`size="icon-sm"`), abaixo dos 44px recomendados

**Lighthouse A11y ≥ 95 (meta do handoff): improvável hoje.**

## 3.7 Fluxos — onde o usuário trava

### Onboarding (`Onboarding.tsx`)

6 telas, das quais só 4 pedem dados. **O tamanho está bom** e o preview live lado a lado é excelente. Os problemas são outros:

- 🔴 **Nada é salvo até o último clique.** Tudo em `useState`; a única escrita é `finalizarMutation`. **Fechar a aba no passo 4 perde os 4 passos**
- 🔴 **Aluno-fantasma:** `:200` decide criar o aluno se `aluno_nome` não estiver vazio, mas `:139` só insere se `nome && instrumento`. Quem preenche **só o nome** (instrumento não tem asterisco) vê "Pronto. Bora começar." com toast de sucesso e **nenhum aluno criado**
- 🟠 **Ordem invertida em termos de valor.** O primeiro campo é *"Onde você atende? (opcional)"* — endereço para rodapé de recibo. O passo de maior valor (cadastrar aluno) é o último, quando a energia acabou. **Inverter:** aluno → PIX → política → endereço
- 🟠 `aluno_duracao` é campo fantasma: enviado ao banco, **sem UI para editar**. Aluno de 30min vira 60
- 🟠 Setas ←/→ globais pulam de etapa **sem validar nada**
- 🟠 O preview — o melhor da tela — é `hidden md:flex`
- 🟠 O wizard grava o 1º aluno nas **colunas legadas** (`alunos.dia_semana/horario`), não em `aulas_recorrentes`. Só funciona pelo fallback

### Agenda — o modelo mental **não** está claro

**O conceito de "slot" é invisível.** Uma aula na tela pode ser um registro real **ou** uma projeção virtual — visualmente idênticas. Aula sem registro mostra `StatusIcon` neutro com title "Agendada", sem nenhuma dica de que ainda não foi confirmada.

**Reagendamento cria dois registros** e a nova aula recebe `tipo: "avulsa"` → borda tracejada + badge **"Extra"**. O professor vê "Extra" onde deveria ler "Reagendada". A grade acumula fantasmas riscados, e `resumo` conta as duas (total da semana infla).

**Reposição é a mecânica mais confusa do produto.** Regra assimétrica (falta justificada sempre dá +1; falta sem aviso só se a política for flexível), explicada **depois** de escolher o status, em texto de 11px com "(Política rigorosa em Ajustes)" a 70% de opacidade. Não há tela onde o professor veja "onde estão minhas reposições" e as agende — só um contador.

🔴 **Modal de presença sem padding e sem scroll.** Usa `DialogContent` variant `studoo` (que **não tem padding**) sem `DialogBody`. Conteúdo colado nas bordas, e como o variant é `overflow-hidden max-h-[calc(100vh-48px)]` com ~620px de conteúdo, **num iPhone SE/8 o botão "Registrar" fica fora da tela e é inalcançável**. É o modal mais usado do app.

### 🔴 Ações primárias somem no mobile

`PageHead` é `hidden md:flex` e `PageHeadMobile` **não aceita `actions`**. Portanto, no celular **não existem**:

- "Nova aula" e "Enviar lembretes" (Agenda)
- "Gerar cobranças" (Financeiro) — a ação central do módulo
- "Exportar CSV" (Relatórios)

Só `Alunos.tsx:1016` contornou isso com um botão mobile dedicado. É um produto para professor particular — que usa celular **entre aulas**.

### 🔴 E o inverso: navegação de mês some no desktop

`Financeiro.tsx:316` e `Relatorios.tsx:423` marcam a nav de mês como **`md:hidden`**. Em telas ≥768px o professor fica **preso no mês corrente** — não consegue ver histórico nem fechar o mês anterior — enquanto o subtítulo exibe o mês, sugerindo que dá para mudar.

### Outros

- **"Bom dia" às 23h** — `Dashboard.tsx:435` tem a saudação literal, sem `getHours()`
- **Checklist se auto-completa:** `OnboardingChecklist.tsx:121` define `explorouAgenda = alunos.some(a => a.status === "ativo")` — praticamente idêntico a `temAluno`. Dois dos quatro passos marcam ✓ juntos, e a barra pula de 0% para 50% sem o professor abrir a agenda
- **`AlunoForm.tsx:559`** promete "⌘ + Enter pra salvar" — **não há nenhum `onKeyDown` no arquivo**. E `⌘` é o símbolo errado num produto BR
- **Grid de horários estoura no mobile:** `grid-cols-[1fr_110px_110px_auto]` sem fallback. Em 390px o select de dia fica com ~30px
- **Configurações tem 3 modelos de persistência na mesma tela:** switch salva no `onChange`, horas no `onBlur`, nome/PIX/CPF exigem 3 botões "Salvar" separados
- **Aba "Notificações" é inacessível:** o `TabsContent` existe mas foi removida do menu (comentário: `// "Lembretes" oculto até a feature ficar funcional`)
- `window.confirm()` nativo em `Alunos.tsx:358` e `DashboardLayout.tsx:399`, apesar de existir `ConfirmDialog` usado em 5 outros pontos

---

# PARTE 4 — Plano de ação

## Sprint 0 — Esta semana (crítico, ~2 dias)

| # | Ação | Esforço |
|---|---|---|
| 1 | **Auditar RLS** de `professores`, `alunos`, `aulas`, `cobrancas` no Supabase e versionar o resultado no `MIGRATIONS.md` | 1h |
| 2 | **`git init`** + primeiro commit + remote | 15 min |
| 3 | **Registrar `primary.soft` e `primary.ring`** no `tailwind.config.ts` | 5 min |
| 4 | **Corrigir a colisão de `queryKey`** de `Financeiro.tsx:89` (cria cobranças para arquivados) | 30 min |
| 5 | **Corrigir o matching de `existingAula`** (`Agenda.tsx:132`) — presença na aula errada | 1h |
| 6 | **`ResetPassword.tsx:19`** exigir `PASSWORD_RECOVERY`, não qualquer sessão | 15 min |
| 7 | **`lib/dates.ts`** com `parseDateOnly()` + substituir os 3 `new Date(str)` restantes | 1h |

## Sprint 1 — 2 semanas: beta fechado honesto (grátis, 10–20 professores)

> Objetivo: um professor real usa por 4 semanas sem você segurar a mão dele.

**Confiança e legal (o mais urgente depois do RLS)**

1. **Alinhar copy à realidade:** remover "14 dias grátis" de landing/`Cadastro.tsx`/FAQ → "Beta gratuito"; **remover os 4 stats fabricados e os 3 depoimentos falsos**; "cobrança automática" → "cobranças em um clique"; "lembrete automático" → "lembrete pronto pra enviar"
2. **Reescrever Termos e Privacidade** para o produto real: sem Stripe, sem Resend, sem read-only de 30 dias, sem "50% vitalício". Declarar beta gratuito e subprocessadores reais (~3h, elimina o passivo)
3. **Card "Seu plano":** "Studoo Pro · Ativo · R$ 19,90" → "Beta gratuito · sem cobrança"; remover botões `disabled`

**Infra**

4. **Deploy na Vercel** com rewrite SPA (`vercel.json`) + `.env` de produção; commitar lockfile; **rodar as 9 migrations num projeto Supabase limpo** e testar cadastro→onboarding→1º aluno→presença→cobrança de ponta a ponta
5. **PostHog + Sentry** (~1 dia). Hoje o `ErrorBoundary` mostra tela amigável e **descarta a informação** — você não saberia se alguém travou

**Produto**

6. **`data_inicio` em `aulas_recorrentes`** + filtro nos geradores de slot e no cálculo de "previstas" — mata as aulas fantasma retroativas
7. **Dia de vencimento configurável** (`professores.dia_vencimento`, default 10) — 2h, destrava o Financeiro para quem cobra dia 5
8. **Import CSV como passo 1 do onboarding**, com "colar da planilha" (Ctrl+V de células do Excel/Sheets)
9. **Persistir o onboarding por etapa** + corrigir o aluno-fantasma
10. **Canal de suporte no app** — botão flutuante abrindo o WhatsApp do fundador. Em beta fechado, o suporte 1:1 é a principal fonte de aprendizado

**UX/UI**

11. **Ações primárias no mobile** — dar `actions` ao `PageHeadMobile` (ou FAB acima da bottom nav)
12. **Navegação de mês no desktop** — remover `md:hidden` de Financeiro e Relatórios
13. **`DialogBody` no `PresencaModal`** — hoje o botão "Registrar" é inalcançável em telas baixas
14. **Contraste do light mode** — ajustar os 4 tokens semânticos + border

**Não fazer agora:** billing, notificações automáticas, app nativo, aulas em grupo.

## Sprint 2 — 1–2 meses: provar retenção e ligar a receita

1. **Billing real + trial de 14 dias** — só depois disso a copy de "14 dias" pode voltar. Considere PSP local com PIX recorrente em vez de Stripe
2. **Cron diário (Edge Function)** que materializa `status='atrasado'` + **resumo semanal** ("seu domingo: 12 aulas, 3 cobranças vencendo, 2 alunos sumidos"). É o mecanismo de retenção mais barato que existe, e desbloqueia métricas agregadas
3. **Exclusão de conta e de aluno + exportação completa** (JSON/ZIP) — requisito LGPD e de confiança para migrar a carteira inteira
4. **Link público de cadastro de aluno** (`/p/:slug`) — corta pela metade o custo de onboarding e cria a primeira superfície voltada ao aluno
5. **Extrair `lib/domain/`** das páginas: `agenda.ts` (slots, matching), `reposicoes.ts`, `frequencia.ts`, `format.ts`, `constants.ts`. Reduz `Agenda.tsx` de 2063 para ~600 linhas e cria superfície testável
6. **Vitest + testes nas 4 funções de negócio:** `getCobrancaStatus`, `buildSlotsForDay`, `calcFrequencia`, `parseAlunoRows`. São a fonte de **todos** os números que o professor vê
7. **RPCs atômicas** para as 3 mutations multi-tabela
8. **Recibo PDF de verdade** (server-side ou lib client) em vez de `window.print()`
9. **Faxina do design system:** deletar as 569 linhas mortas, extrair `ui/card.tsx` e `ui/popover.tsx`, unificar o vocabulário de status em `lib/aulaStatus.ts`, padronizar em 3 tints de primary

## Sprint 3 — 3–6 meses: virar produto que traz dinheiro

1. **PIX com QR dinâmico + baixa automática** (Asaas/Efí/Pagar.me). É o que muda a categoria: de "organizador" para "recebedor". Justifica R$ 39–49 e dá o melhor argumento de venda possível — *"o Studoo se paga com uma mensalidade que você não perdeu"*
2. **Lembretes automáticos via WhatsApp Cloud API** — exige verificação de negócio, templates aprovados, custo por conversa **e** materializar aulas futuras no servidor (hoje a recorrência só existe em TS no cliente). É o item mais caro
3. **Portal do aluno** (magic link): próximas aulas, lição de casa, histórico, 2ª via de PIX. Loop de distribuição — cada professor expõe a marca a 20+ alunos
4. **Turmas / aulas em grupo** e cobrança por pacote/hora como modelos de primeira classe — amplia TAM para teoria, coral, banda
5. **Multi-professor (mini-escola)** — plano de R$ 79–149, único caminho para ARPU que sustenta aquisição paga
6. **PWA com push** — substitui o "app nativo em breve" a custo baixo

---

## Métricas que precisam existir (hoje: zero)

**Ativação (o que mais importa agora)**
`signup_started/completed` · `onboarding_step_viewed` (você não sabe em qual das 6 telas as pessoas desistem, e há um "Pular tudo" provavelmente muito usado) · `onboarding_skipped` vs `completed` · `first_aluno_created` (fonte: wizard/manual/CSV) · `csv_import_started/completed`
**Métrica-norte sugerida:** *5+ alunos cadastrados e 1 presença marcada em 7 dias*

**Engajamento** — `presenca_marcada` · `agenda_viewed` · **dias-ativos-por-semana** (3+ = virou hábito) · `whatsapp_opened` por tipo (o dado já está em `mensagens_enviadas`, ninguém agrega)

**Valor entregue** — `cobrancas_geradas` · `cobranca_marcada_paga` · **% de cobranças pagas até o vencimento** (é a única prova de que o Studoo faz o professor ganhar dinheiro — e o número que vende o produto)

**Saúde** — erros de front (Sentry) · erros de Supabase por tabela (detecta migration faltando) · retenção por coorte semanal

---

## A decisão que precisa ser tomada antes de tudo

A landing vende **automação**. O app entrega **organização com assistência manual de WhatsApp**. As duas são negócios legítimos — com preços, custos e roadmaps diferentes.

Enquanto a escolha não for feita, cada semana de desenvolvimento aumenta o gap entre a promessa e o produto.

**Recomendação:** lançar como organizador com copy honesta em 2 semanas, medir se o professor volta na semana 4, e só então investir os 2–3 meses de backend do "recebedor" — com a certeza de que o hábito existe antes de construir a máquina de cobrança em cima dele.
