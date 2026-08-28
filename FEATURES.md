# Studoo — Catálogo de Features

> ⚠️ **Este documento estava desatualizado e foi parcialmente corrigido em
> agosto/2026.** Ele descrevia React 18/Router v6, fontes Syne+DM Sans, e não
> mencionava o wizard de Onboarding, a tela de Relatórios, o login com Google,
> a verificação de e-mail nem as páginas legais — todos existentes no código.
> Também dizia que a política de faltas não era usada, quando ela decide a
> concessão de reposição na Agenda.
>
> Na dúvida entre este arquivo e o código, **o código vence.** O `README.md`
> tem a visão atual e enxuta.


Estado atual do produto. Cada feature marcada com:

- ✅ **Funcional** — implementado e testado pelo build
- ⚠️ **Parcial** — funciona mas com limitação documentada
- 🚧 **Em breve** — placeholder visível na UI, sem implementação
- ❌ **Não existe** — nem na UI nem no código

---

## 1. Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Vite 8 + React 19 + TypeScript 6 (estrito) |
| Estilo | Tailwind CSS v3 + tokens próprios (dark + light) |
| UI components | shadcn/ui customizado em `src/components/ui/` |
| Backend | Supabase (Postgres + Auth + RLS) |
| State | TanStack Query v5 |
| Roteamento | React Router 7 (com lazy loading) |
| Fonts | Sora (display/UI) + JetBrains Mono (dados) |

**Bundle inicial:** ~272kb gzipped + chunks por rota (lazy). Sem deps pesadas.

---

## 2. Como rodar localmente

```bash
# 1. Configurar .env baseado em .env.example
cp .env.example .env
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# 2. Instalar e subir
npm install
npm run dev
# → http://localhost:5173 (ou 5174 se ocupada)

# 3. Antes do primeiro acesso, rodar SQL do MIGRATIONS.md no Supabase Studio
```

---

## 3. Autenticação

| Feature | Status | Onde |
|---|---|---|
| Login com email/senha | ✅ | `/login` |
| Cadastro | ✅ | `/cadastro` |
| Reset de senha por email | ✅ | `/reset-password` (link enviado por email) |
| Proteção de rotas privadas | ✅ | `ProtectedRoute.tsx` — redireciona não-logado pra `/login` |
| Criação automática do perfil em `professores` | ✅ | Trigger SQL `on_auth_user_created` (precisa rodar no Supabase) + fallback no client com upsert |
| Validação de env vars na inicialização | ✅ | `supabase.ts` lança Error claro se VITE_SUPABASE_* faltarem |
| ErrorBoundary global | ✅ | Tela amigável "Algo deu errado" + botão "Tentar novamente" / "Recarregar" |

---

## 4. Landing Page

| Feature | Status | Onde |
|---|---|---|
| Página pública em `/` | ✅ | `Index.tsx` |
| Nav sticky com Entrar/Cadastrar | ✅ | |
| Hero com headline + CTAs | ✅ | "Menos administração, mais música" |
| Seção de dores | ✅ | 4 dores ("planilha bagunçada", etc) |
| Seção de features | ✅ | 4 cards (Gestão / Agenda / Financeiro / Frequência) |
| Card de preço | ✅ | R$ 19,90/mês com 5 inclusos |
| CTA final | ✅ | |
| Footer | ✅ | |

⚠️ A landing promete "14 dias grátis sem cartão" mas hoje **não há trial nem cobrança** — app é grátis indefinidamente. Texto precisa ajustar quando ativar billing.

---

## 5. Dashboard (`/dashboard`)

| Feature | Status | Detalhes |
|---|---|---|
| Saudação personalizada com nome | ✅ | "Olá, Gabriel 👋" |
| **Onboarding checklist** | ✅ | Card dourado com 4 passos (cadastrar 1º aluno, PIX, dados de recibo, ver agenda). Some quando 100% completo. |
| **KPI: Alunos ativos** | ✅ | |
| **KPI: Aulas/semana** | ✅ | Conta corretamente múltiplos horários (corrigido pós-auditoria) |
| **KPI: Receita prevista + recebido** | ✅ | |
| **KPI: Inadimplentes** | ✅ | Status "atrasado" computado em runtime (`vencimento < hoje`) |
| **Card secundário: Reposições pendentes** | ✅ | Total agregado, clicável → `/alunos` |
| **Card secundário: Pacotes ativos** | ✅ | Count + total de aulas restantes |
| **Card secundário: Trials do mês** | ✅ | Convertidos/total + taxa de conversão |
| **Card secundário: Bloqueios próximos** | ✅ | Clicável → `/configuracoes` |
| **Seção: Aniversariantes** | ✅ | Próximos 14 dias + botão "Parabenizar" via WhatsApp |
| **Seção: Próximas aulas** | ✅ | Próximos 14 dias |
| **Seção: Cobranças pendentes** | ✅ | Do mês atual |
| **Seção: Atenção necessária** | ✅ | Alunos com faltas / cobrança atrasada / sem aulas recentes |

---

## 6. Alunos (`/alunos`)

### Listagem
| Feature | Status |
|---|---|
| Grid de cards com avatar, nome, status, contato, horário, valor, frequência | ✅ |
| Filtro por status (Todos / Ativos / Arquivados) | ✅ |
| Busca por nome ou instrumento | ✅ |
| Indicador de reposições pendentes no card | ✅ |
| Indicador "+N" quando aluno tem múltiplos horários | ✅ |
| Botão WhatsApp por card (saudação) | ✅ |
| Botão "Ver perfil" → `/alunos/:id` | ✅ |
| Dropdown: Editar / Arquivar | ✅ |
| Importação CSV (com detecção de duplicatas + múltiplos horários por aluno) | ✅ |
| Exportação CSV | ✅ |
| Empty state pra professor novo | ✅ |

### Formulário (modal)
| Campo | Status |
|---|---|
| Nome (obrigatório) | ✅ |
| Instrumento (select com 17 opções) | ✅ |
| Telefone (com máscara) | ✅ |
| Email pra notificações | ✅ |
| Responsável | ✅ |
| Data de nascimento | ✅ |
| **Múltiplos horários recorrentes** (add/remove dinâmico) | ✅ |
| Mensalidade (com máscara R$) | ✅ |
| Observações (até 200 chars) | ✅ |

### Página dedicada (`/alunos/:id`)
| Feature | Status |
|---|---|
| Hero com avatar grande + nome + status + dados-chave | ✅ |
| Botões: WhatsApp / Editar / Arquivar | ✅ |
| **Tab Diário** — timeline cronológica com observações por aula | ✅ |
| **Tab Financeiro** — total pago no ano + lista de cobranças + botão Recibo | ✅ |
| **Tab Pacotes** — vender e gerenciar pacotes do aluno | ✅ |
| **Tab Mensagens** — histórico de WhatsApp enviado | ✅ |
| Sidebar com horários semanais, reposições, aniversário, observações | ✅ |
| Botão Editar abre o `AlunoForm` no lugar (sem navegação) | ✅ |

---

## 7. Agenda (`/agenda`)

| Feature | Status | Detalhes |
|---|---|---|
| **Visão semanal** (mobile lista, desktop grid horário × dia) | ✅ | |
| Navegação anterior/próxima + botão "Hoje" | ✅ | |
| Slots gerados a partir dos horários recorrentes | ✅ | Suporta múltiplos horários por aluno |
| Toque/clique no slot abre **Modal de Presença** | ✅ | |
| Status: Presente / Falta justificada / Falta sem aviso | ✅ | |
| Campo observação/repertório por aula | ✅ | Visível no Diário do aluno |
| **Reagendamento** dentro do modal | ✅ | Cria aula "reagendada" cinza/riscada + nova aula |
| **Aula avulsa/extra** fora da grade | ✅ | Botão "+ Nova aula" |
| **Aula experimental/trial** (sem cadastro) | ✅ | Toggle no modal de nova aula |
| Conversão de trial em aluno cadastrado | ✅ | Botão "Cadastrar como aluno" no slot experimental |
| **Bloqueio de datas** (feriados/férias) | ✅ | Configurado em Configurações; dias bloqueados ficam cinza |
| **Reposições automáticas** | ✅ | +1 ao registrar falta justificada; consume ao agendar avulsa marcada como reposição |
| Painel lateral: Visão da semana (KPIs) + Próximas aulas pendentes | ✅ | |

---

## 8. Financeiro (`/financeiro`)

| Feature | Status |
|---|---|
| Navegação por mês (anterior/atual/próximo) | ✅ |
| KPIs: receita prevista, recebido, a receber, inadimplentes | ✅ |
| **Geração de cobranças mensais** (com confirmação de quantos × valor total) | ✅ |
| Botão "Marcar pago" por linha | ✅ |
| **Status "atrasado" automático** | ⚠️ Computado só no frontend; coluna `status` no banco continua `'pendente'` |
| **Filtros por status** (Todos / Pago / Pendente / Atrasado) com contagem em cada pill | ✅ |
| Busca por nome de aluno | ✅ |
| **Recibo PDF** (modal + window.print → Salvar como PDF) | ✅ |
| **Botão WhatsApp** com template de cobrança + chave PIX | ✅ |
| Exportação CSV das cobranças do mês | ✅ |

---

## 9. Pacotes de Aulas

| Feature | Status |
|---|---|
| Vender pacote (quantidade + valor + validade + observação) | ✅ |
| Validade padrão de 3 meses | ✅ |
| Visual: barra de progresso (usadas/total) | ✅ |
| Alerta visual quando vence em ≤14 dias ou venceu | ✅ |
| Botão "Usar 1 aula" (decrementa manual) | ✅ |
| Status: ativo / concluído (auto ao zerar) / cancelado | ✅ |
| Onde gerenciar | Tab "Pacotes" no `/alunos/:id` |

⚠️ Pacotes **não decrementam automaticamente** quando você marca aula avulsa — é decisão consciente. Professor controla manualmente.

---

## 10. WhatsApp

| Feature | Status |
|---|---|
| Helper `openWhatsApp(phone, message, opts)` que abre wa.me | ✅ |
| Template: saudação | ✅ |
| Template: lembrete de aula (cobrança futura — não plugado ainda) | ✅ |
| Template: cobrança com PIX | ✅ |
| Template: parabéns (aniversário) | ✅ |
| **Histórico** de mensagens enviadas (tabela `mensagens_enviadas`) | ✅ |
| Visualização do histórico no perfil do aluno (tab Mensagens) | ✅ |

Botões disponíveis: Card de aluno (saudação) · Sheet/Detalhe do aluno (saudação) · Cobrança no Financeiro (cobrança+PIX) · Aniversariante no Dashboard (parabéns).

---

## 11. Configurações (`/configuracoes`)

Organizado em 4 tabs + card de Plano fixo abaixo.

### Tab Conta
| Feature | Status |
|---|---|
| Nome e email do perfil | ✅ |
| Dados pra recibo: CPF/CNPJ + endereço opcional | ✅ |

### Tab Pagamento
| Feature | Status |
|---|---|
| Chave PIX com detecção de tipo (CPF/email/celular/aleatória) | ✅ |
| Indicador "Configurada" | ✅ |

### Tab Aulas
| Feature | Status |
|---|---|
| **Política de faltas** (cobrar falta sem aviso + horas mínimas de aviso) | ✅ Salva e **usada**: decide se a falta vira +1 reposição (`Agenda.tsx`, `grantsReposicao`) |
| Bloqueios e folgas (datas) | ✅ |

### Tab Notificações
| Feature | Status |
|---|---|
| Lembrete de aula automático (24h antes) | 🚧 **Em breve** — badge + box de aviso |
| Aviso de vencimento automático (3d antes) | 🚧 **Em breve** |

### Card Plano (fora das tabs)
| Feature | Status |
|---|---|
| Card do plano | ✅ Agora diz "Beta aberto · R$ 0" com badge "Gratuito". Não há Stripe, cobrança nem trial — e o card não finge mais que há |
| Gerenciar assinatura / Histórico de pagamentos | ❌ Removidos (eram botões `disabled`, pareciam bug) |

---

## 12. UI / Acessibilidade / Polish

| Feature | Status |
|---|---|
| **Dark mode** | ✅ Padrão |
| **Light mode** | ✅ Toggle sol/lua no TopBar (persiste em localStorage) |
| **Mobile bottom nav** (4 itens fixos + "Mais") | ✅ |
| **TopBar** com título da página + relógio + theme toggle | ✅ |
| **Sidebar desktop** com perfil + menu + conta | ✅ |
| **Sheet drawer** pra detalhe rápido de aluno (alternativa à página dedicada) | ✅ |
| Toasts (Sonner) com cores ricas, top-right | ✅ |
| Skeleton loaders em todas as queries | ✅ |
| Empty states padronizados | ✅ |
| Confirmações em ações destrutivas (Sair, Arquivar, Gerar cobranças, Reposições) | ✅ |
| DialogDescription em todos os modais (acessibilidade) | ✅ |
| Lazy loading das rotas (`React.lazy`) | ✅ |
| ErrorBoundary global | ✅ |

---

## 13. Schema do banco (resumo)

Todas as tabelas com **RLS habilitado**, isolando por `professor_id`.

```
professores
├─ id, user_id (FK auth.users, UNIQUE), nome, email
├─ chave_pix, cpf_cnpj, endereco
├─ cobrar_falta_sem_aviso, horas_antecedencia_aviso  ⚠️ salvos mas não usados
├─ lembrete_aula_ativo, lembrete_cobranca_ativo      ⚠️ salvos mas não usados
└─ created_at, updated_at

alunos
├─ id, professor_id, nome, instrumento
├─ telefone, email_notificacao, nome_responsavel, data_nascimento
├─ dia_semana, horario, duracao_minutos    ⚠️ legados, mantidos por compat
├─ valor_mensalidade, status, observacoes
├─ reposicoes_disponiveis
└─ created_at, updated_at

aulas_recorrentes        ← múltiplos horários por aluno
├─ id, aluno_id, professor_id
├─ dia_semana, horario, duracao_minutos, ativo
└─ created_at, updated_at

aulas                    ← ocorrências individuais
├─ id, aluno_id (nullable pra experimental), professor_id
├─ data_hora, duracao_minutos
├─ status (agendada/realizada/falta_justificada/falta_sem_aviso/cancelada_professor/reagendada)
├─ tipo (recorrente/avulsa/experimental)
├─ reagendada_de (FK aulas), aluno_experimental_nome
├─ eh_reposicao, observacao, repertorio
└─ created_at, updated_at

cobrancas
├─ id, professor_id, aluno_id
├─ valor, mes_referencia, vencimento
├─ status (pendente/pago/atrasado*)
├─ data_pagamento
└─ created_at, updated_at
* "atrasado" hoje é computado no frontend; banco mantém "pendente"

pacotes_aulas
├─ id, aluno_id, professor_id
├─ total_aulas, aulas_usadas, valor_total
├─ status (ativo/concluido/cancelado)
├─ observacao, data_compra, data_validade
└─ created_at, updated_at

bloqueios_data
├─ id, professor_id, data (UNIQUE por professor), motivo
└─ created_at

mensagens_enviadas
├─ id, professor_id, aluno_id (nullable), tipo
├─ texto, telefone, enviada_em
└─ índice em (aluno_id, enviada_em DESC)
```

**SQL completo:** veja `MIGRATIONS.md` (organizado por sprint).

---

## 14. Decisões técnicas importantes

1. **Múltiplos horários ficam em tabela separada** (`aulas_recorrentes`) com fallback automático pros campos legados em `alunos`. Retrocompat preservada.

2. **Status "atrasado" é computado no frontend** (`lib/cobranca.ts`), não materializado. Sem cron job. Trade-off: queries SQL diretas não enxergam "atrasado".

3. **Reposições são contador agregado** em `alunos.reposicoes_disponiveis`, não tabela individual. Não há validade individual; só botão manual "Limpar".

4. **Recibo PDF via `window.print()`** com CSS `@media print`. Zero deps, usa "Salvar como PDF" nativo do browser.

5. **Trigger SQL `on_auth_user_created`** cria registro em `professores` automaticamente após cadastro. Fallback explícito no `Cadastro.tsx` via upsert. Backfill incluído no SQL pra usuários órfãos.

6. **Validação de env vars na inicialização** (`supabase.ts` lança Error claro) → captado pelo ErrorBoundary.

7. **Lazy loading das rotas** → bundle inicial saiu de 810kb monolítico pra 272kb principal + chunks.

8. **Status "Em breve"** com badge consistente em features não implementadas (Política de faltas, Notificações automáticas) — honestidade visual em vez de promessa quebrada.

---

## 15. O que NÃO existe (gaps reconhecidos)

| Gap | Impacto | Bloqueia lançamento? |
|---|---|---|
| **Billing real (Stripe)** | Usuário cadastra e fica grátis pra sempre | Sim, se quiser cobrar |
| **Lógica de trial real** | Texto da landing promete 14 dias grátis, app não enforça | Sim, ou ajustar landing |
| **Notificações automáticas** (cron + Edge Function) | Toggles dizem "em breve" | Não |
| **Política de faltas funcional** | Campos salvos mas não usados | Não |
| **Auto-cadastro de aluno via link público** | Onboarding manual de cada aluno | Não |
| **Aulas em grupo / turmas** | 1 aula = 1 aluno | Não, mas limita TAM |
| **Calendário de feriados BR automático** | Professor bloqueia manualmente | Não |
| **Realtime / multi-device sync** | Refresh ou navegação dispara reload | Não |
| **Gráficos no Dashboard** (evolução temporal) | Só números atuais | Não |
| **Mensagens recebidas via WhatsApp** | Só logamos saídas | Não |
| **Pagamento integrado** (PIX via API) | Hoje template + copy-paste | Não |

---

## 16. Estrutura de pastas

```
src/
├─ App.tsx                  ← rotas + providers + lazy loading
├─ main.tsx
├─ index.css                ← tokens (dark + light) + utilities
│
├─ components/
│  ├─ ui/                   ← shadcn customizado
│  └─ shared/
│     ├─ AlunoForm.tsx      ← form de cadastro/edição (reutilizado)
│     ├─ ErrorBoundary.tsx
│     ├─ MetricCard.tsx
│     ├─ OnboardingChecklist.tsx
│     ├─ PacotesTab.tsx
│     ├─ ReciboModal.tsx
│     ├─ SectionCard.tsx
│     ├─ StatusBadge.tsx
│     └─ ProtectedRoute.tsx
│
├─ components/layout/
│  ├─ AuthLayout.tsx        ← shell pras telas de auth
│  ├─ DashboardLayout.tsx   ← shell autenticado
│  ├─ Sidebar.tsx
│  └─ TopBar.tsx
│
├─ contexts/
│  ├─ AuthContext.tsx
│  ├─ PageContext.tsx       ← título dinâmico no TopBar
│  └─ ThemeContext.tsx      ← dark/light mode
│
├─ hooks/
│  ├─ useProfessor.ts
│  ├─ useAulasRecorrentes.ts
│  ├─ useBloqueios.ts
│  └─ usePacotes.ts
│
├─ lib/
│  ├─ supabase.ts           ← client + validação env
│  ├─ cobranca.ts           ← getCobrancaStatus
│  ├─ csv.ts                ← parser + import
│  ├─ csvExport.ts          ← gerador
│  ├─ masks.ts              ← phone, cpf, currency, pix
│  ├─ whatsapp.ts           ← templates + log
│  └─ utils.ts              ← cn()
│
├─ pages/
│  ├─ Index.tsx             ← landing
│  ├─ Login.tsx
│  ├─ Cadastro.tsx
│  ├─ ResetPassword.tsx
│  ├─ Dashboard.tsx
│  ├─ Alunos.tsx
│  ├─ AlunoDetalhe.tsx
│  ├─ Agenda.tsx
│  ├─ Financeiro.tsx
│  └─ Configuracoes.tsx
│
└─ types/
   └─ supabase.ts           ← Professor, Aluno, Aula, Cobranca, PacoteAulas, etc
```

---

## 17. Próximos passos sugeridos (não ordenados)

**Pra lançar beta**
- Decidir billing: lançar grátis OU implementar Stripe + trial
- Ajustar texto da landing se for grátis (remover "14 dias")
- Deploy (Vercel/Netlify) + rodar migrations SQL em produção
- Testar fluxo de cadastro novo end-to-end com banco limpo

**Débitos técnicos**
- Materializar `status='atrasado'` via cron job ou Supabase Function
- Terminar refactor de `Alunos.tsx` (extrair `AlunoSheet` e `ImportarCsvModal`)
- Passada visual no light mode (procurar cores hardcoded)

**Features pós-MVP**
- Notificações automáticas reais (Edge Function + cron)
- Link público de cadastro de aluno
- Aulas em grupo
- Gráficos de evolução no Dashboard
- Feriados BR automáticos
