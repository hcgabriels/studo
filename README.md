# Studoo

Gestão pra professor particular de música: alunos, agenda, presença com diário,
mensalidades, pacotes e relatório de frequência. Um lugar só, no lugar de
planilha + WhatsApp + caderno.

**Estado:** beta gratuito. Sem cobrança, sem trial, sem gateway de pagamento.

---

## Rodar local

```bash
cp .env.example .env      # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev               # http://localhost:5173
```

O backend é versionado com Supabase CLI. Consulte a próxima seção antes de
apontar o app para um projeto existente.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | `tsc -b` + build de produção em `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Vitest — regras de negócio e invariantes versionadas do schema |
| `npm run test:e2e:live` | Smoke autenticado contra um projeto Supabase de teste |
| `npm run preview` | Serve o `dist/` local |
| `npm run db:start` | Inicia o Supabase local |
| `npm run db:reset` | Recria o banco local e reaplica todas as migrations |
| `npm run db:lint` | Valida funções do Postgres local |
| `npm run db:test` | Executa testes pgTAP locais |

Os comandos `db:*` locais exigem Docker Desktop em execução. O frontend pode
usar o projeto remoto sem Docker, mas isso não substitui o `db:reset` antes de
publicar migrations.

O smoke live cria uma conta descartável, percorre onboarding, aluno, agenda,
financeiro, relatórios e exclusão, e limpa todos os registros ao final. Execute
somente contra um projeto de teste, com o frontend já aberto, definindo
`SUPABASE_SERVICE_ROLE_KEY` apenas no processo e
`E2E_ALLOW_REMOTE_MUTATION=1`. Nunca salve a service-role numa variável
`VITE_*` ou em arquivo consumido pelo frontend. O mesmo fluxo executa axe nas
rotas principais em desktop e 390 px e falha diante de violações sérias ou
críticas de WCAG 2 A/AA e 2.1 A/AA.

---

## Banco de dados

`supabase/migrations/` é a única trilha executável de mudanças. O schema
declarativo completo fica em `supabase/schemas/`. `MIGRATIONS.md` e `sql/*.sql`
foram preservados apenas como histórico: não os cole no SQL Editor e não os use
para provisionar um projeto.

As migrations versionadas, aplicadas ao projeto remoto vinculado em 1º de
setembro de 2026:

- auditam um perfil por `user_id` e uma cobrança por `aluno_id + mês`;
- permitem alunos sem horário semanal inventado;
- reconciliam as mudanças que antes só existiam no projeto remoto;
- aplicam grants explícitos e ownership de professor/aluno em RLS e RPCs.

Elas não apagam nem mesclam inconsistências encontradas: abortam com um
diagnóstico para revisão explícita. Depois do rollout, o histórico local e
remoto ficou alinhado em quinze migrations e o novo dry-run ficou vazio. Para
mudanças futuras, sempre execute `npm run db:reset`, `npm run db:lint` e os
testes de isolamento antes de `db push` em produção.

O diagnóstico completo e a ordem de implementação estão em
`docs/AUDITORIA-INDEPENDENTE-2026-08-31.md`.

---

## Deploy

O projeto está pronto para deploy estático. A configuração da Vercel fica em
`vercel.json`; Netlify/Cloudflare Pages usam `public/_redirects`.

O host precisa de **rewrite de SPA**: qualquer rota que não seja arquivo tem
que servir o `index.html`. Sem isso, dar F5 em `/agenda` ou abrir
`/alunos/<id>` direto retorna 404, porque quem roteia é o React e não o
servidor.

Variáveis de ambiente no host: as mesmas do `.env.example`.

Checklist completo: `docs/LAUNCH.md`.
Direcao de produto e IA: `docs/PRODUCT_DIRECTION.md`.
Templates de email: `docs/EMAIL_TEMPLATES.md`.
Login com Google: `docs/GOOGLE_OAUTH.md`.

---

## Telemetria (opcional)

`src/lib/analytics.ts` é uma casca fina sobre o PostHog. Sem
`VITE_POSTHOG_KEY`, tudo vira no-op silencioso e o SDK nem entra no bundle.

Com a key preenchida, o funil de ativação passa a ser mensurável:
`signup_concluido` → `onboarding_etapa_vista` → `primeiro_aluno_criado` →
`presenca_marcada`. Erros de runtime também sobem (o `ErrorBoundary` chama
`capturarErro`).

Métrica-norte sugerida pro beta: **5+ alunos cadastrados e 1 presença marcada em
7 dias**.

---

## Stack

React 19 · Vite 8 · TypeScript 6 (estrito) · Tailwind 3 · shadcn/ui ·
Supabase (Postgres + Auth + RLS) · TanStack Query v5 · React Router 7

Fontes: **Sora** (display e UI) e **JetBrains Mono** (números, timestamps,
eyebrows). Dark é o tema padrão; light é secundário.

---

## Estrutura

```
src/
├── pages/        uma por rota (Index é a landing)
├── components/
│   ├── ui/       shadcn customizado com os tokens do Studoo
│   ├── shared/   componentes de domínio reusados entre telas
│   ├── layout/   shell autenticado (sidebar, topbar, bottom nav)
│   ├── alunos/   tabela de alunos
│   ├── agenda/   lista do dia
│   └── dashboard/ linhas do painel
├── contexts/     Auth, Theme, Page (título do TopBar)
├── hooks/        useProfessor, useAulasRecorrentes, useBloqueios, usePacotes…
├── lib/
│   ├── domain/   regra de negócio pura, sem React nem Supabase (testada)
│   └── …         utilitários (ver abaixo)
└── types/        interfaces do schema
```

### `src/lib` — o que mora onde

| Arquivo | Responsabilidade |
|---|---|
| `dates.ts` | `parseDateOnly` e afins. **Use sempre** em coluna `date` do Postgres — `new Date("2026-01-01")` é meia-noite UTC e vira 31/12 no Brasil |
| `format.ts` | `fmtBRL`, `fmtBRLCompacto`, `fmtNumero` |
| `constants.ts` | `DIAS_SEMANA`, `MIN_PASSWORD` |
| `aulaStatus.ts` | Vocabulário único de status de aula (rótulo, badge, ícone) |
| `cobranca.ts` | `getCobrancaStatus` — "atrasado" é computado no front, o banco guarda "pendente" |
| `analytics.ts` | `track`, `identificar`, `capturarErro` |
| `exportarDados.ts` | Exportação LGPD (JSON com tudo do professor) |
| `whatsapp.ts` | Templates + `openWhatsApp` (retorna a Promise do log) |
| `support.ts` | Destino de suporte: WhatsApp configurável, com fallback por email |
| `maps.ts` | URL segura para conferir endereços no Google Maps |
| `csv.ts` / `csvExport.ts` | Import (arquivo e colagem) e export de alunos |
| `domain/agenda.ts` | Slots da agenda, casamento slot↔aula, faixa de horas, política de reposição |
| `domain/frequencia.ts` | `calcFrequencia` — o número que o professor usa pra cobrar falta |
| `domain/horarios.ts` | `getHorariosDoAluno`, `nextAulaAfter` |

---

## Convenções que vale conhecer

- **Coluna `date` nunca passa por `new Date(string)` direto.** Use
  `parseDateOnly` de `lib/dates.ts`.
- **`queryKey` precisa discriminar o filtro.** `["alunos", professorId]` e
  `["alunos", professorId, { status: "ativo" }]` são caches diferentes de
  propósito — misturar os dois já gerou cobrança pra aluno arquivado.
- **Mutação que toca mais de uma tabela vai por RPC**, não por duas chamadas do
  client. Sem transação, uma falha no meio deixa dado inconsistente.
- **Contador nunca é read-modify-write.** Use as RPCs de incremento.
- **Modal `variant="studoo"` exige `<DialogBody>`** — o `DialogContent` não tem
  padding e é `overflow-hidden`; sem o body o conteúdo cola na borda e o botão
  de ação some em tela baixa.
- **Ação de tela vai no `PageHead` E no `PageHeadMobile`.** Os dois aceitam
  `actions` e `toolbar`. O professor usa o app no celular entre as aulas.
- **Cor só nunca comunica estado.** `StatusIcon` aceita `showLabel` — no touch
  não existe hover, então o tooltip nativo não aparece.
- **Regra de negócio mora em `lib/domain/`, não na página.** Nada lá importa
  React ou Supabase, e tudo lá tem teste. Cálculo novo que o professor vê
  entra por ali.

---

## O que ainda não existe

| | |
|---|---|
| Billing, trial, assinatura | Nada. Nem tabela, nem gateway |
| Lembretes automáticos | O app monta a mensagem e abre o WhatsApp; quem envia é o professor |
| PIX integrado | A chave entra como texto na mensagem. Sem QR, sem baixa automática |
| E-mails do produto | Nenhum envio próprio |
| Portal do aluno | Nenhuma superfície voltada ao aluno |
| Aulas em grupo | 1 aula = 1 aluno |
| Testes de interface locais | Não há suíte de componentes isolados; os fluxos críticos são cobertos pelo smoke Playwright contra um projeto Supabase de teste |

A landing, os Termos e a Política descrevem exatamente isso — se alguma dessas
linhas mudar, os três textos mudam junto.
