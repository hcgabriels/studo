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

Antes do primeiro acesso, rode o SQL no Supabase (próxima seção). Sem isso o
cadastro cria o usuário mas não o perfil de professor, e o app para numa tela
explicando o que houve.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | `tsc -b` + build de produção em `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Vitest — 48 testes da regra de negócio |
| `npm run preview` | Serve o `dist/` local |

---

## Banco de dados

O schema está em `MIGRATIONS.md`, organizado por sprint (1 a 9). Rode na ordem
num projeto Supabase novo.

**Depois deles, rode `sql/2026-08-lancamento.sql` — é obrigatório.** Esse arquivo:

- Liga **RLS** em `professores`, `alunos`, `aulas` e `cobrancas`. Sem ele, um
  professor autenticado que descubra um UUID lê os dados de aluno de outro
  professor. Não é opcional.
- Cria as colunas `professores.dia_vencimento` e `aulas_recorrentes.data_inicio`.
- Põe `ON DELETE CASCADE` nas FKs de aluno.
- Cria as funções transacionais que o app chama: `salvar_horarios_aluno`,
  `reagendar_aula`, `increment_reposicao`, `decrement_reposicao`,
  `usar_aula_pacote`, `excluir_aluno`, `excluir_minha_conta`.

O app funciona sem as funções (cai em fallback e loga `console.warn`), mas aí
perde a atomicidade — e a exclusão de conta simplesmente não roda.

No fim do arquivo há três queries de verificação. A primeira é a que importa:
todas as 8 tabelas precisam vir com `rls_ligado = true`.

---

## Deploy

Ainda não definido — roda só local por enquanto.

Quando for a hora, o host precisa de **rewrite de SPA**: qualquer rota que não
seja arquivo tem que servir o `index.html`. Sem isso, dar F5 em `/agenda` ou
abrir `/alunos/<id>` direto retorna 404, porque quem roteia é o React e não o
servidor. Vale pra qualquer host estático.

Variáveis de ambiente no host: as mesmas do `.env.example`.

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
| Testes de interface | Só a regra de negócio tem teste (48, em `lib/domain` e `lib/`). Componente e fluxo, nenhum |

A landing, os Termos e a Política descrevem exatamente isso — se alguma dessas
linhas mudar, os três textos mudam junto.
