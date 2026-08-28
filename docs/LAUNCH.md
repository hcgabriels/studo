# Studoo — checklist de lançamento

## Estado atual

- GitHub: `https://github.com/hcgabriels/studo`
- Branch principal: `main`
- CI: GitHub Actions rodando `npm ci`, `npm test`, `npm run lint`, `npm run build` e `npm audit --omit=dev`
- Supabase: projeto `studo` (`xxphlozkuklraitfrwgx`) ativo
- Banco: RLS ligado nas 8 tabelas principais e hardening aplicado em `sql/2026-08-hardening.sql`
- Deploy: pronto para Vercel via `vercel.json`; Netlify/Cloudflare Pages continuam cobertos por `public/_redirects`

## Bloqueadores antes de convidar professores

1. Configurar SMTP próprio no Supabase Auth.
2. Ativar proteção de senha vazada no Supabase Auth.
3. Escolher domínio de produção e configurar redirects do Supabase.
4. Configurar variáveis de ambiente no host.
5. Rodar QA manual em produção.

## Supabase Auth

### SMTP

O SMTP padrão do Supabase não serve para produção: envia só para membros da organização e tem limite baixo. Configure em:

`Supabase Dashboard -> Authentication -> Emails -> SMTP Settings`

Campos esperados:

- Sender email: `no-reply@SEU_DOMINIO`
- Sender name: `Studoo`
- Host: fornecido pelo provedor SMTP
- Port: geralmente `587`
- Username: fornecido pelo provedor SMTP
- Password: senha/token SMTP do provedor
- Secure connection: conforme instrução do provedor

Provedores compatíveis: Resend, Postmark, AWS SES, SendGrid, ZeptoMail ou Brevo.

Depois de salvar, testar:

- Cadastro com email e senha
- Confirmação de email
- Reset de senha
- Login com Google, se continuar ativo

### Segurança de senha

Ativar:

`Supabase Dashboard -> Authentication -> Sign In / Providers -> Password protection`

Controle esperado:

- Leaked password protection: enabled

### URL e redirects

Depois de escolher o domínio final, configurar:

`Supabase Dashboard -> Authentication -> URL Configuration`

Campos:

- Site URL: `https://SEU_DOMINIO`
- Redirect URLs:
  - `https://SEU_DOMINIO/*`
  - `http://localhost:5173/*`

Fluxos que dependem disso:

- Confirmação de cadastro
- Reset de senha
- OAuth Google

## Deploy

### Vercel

Configuração já versionada em `vercel.json`.

Build settings:

- Framework: Vite
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`

Environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_POSTHOG_KEY`
- `VITE_POSTHOG_HOST`

### Netlify ou Cloudflare Pages

O arquivo `public/_redirects` garante rewrite de SPA:

- `/agenda`
- `/alunos/:id`
- `/financeiro`
- `/relatorios`
- `/configuracoes`

## QA manual de produção

1. Abrir landing.
2. Criar conta nova.
3. Confirmar email.
4. Fazer onboarding.
5. Criar aluno individual.
6. Colar lista de alunos.
7. Criar aula recorrente.
8. Marcar presença.
9. Marcar falta com reposição.
10. Reagendar aula.
11. Criar cobrança.
12. Marcar cobrança como paga.
13. Enviar lembrete via WhatsApp.
14. Gerar recibo.
15. Exportar dados LGPD.
16. Excluir aluno.
17. Excluir conta.
18. Testar F5 em `/agenda` e `/alunos/:id`.
19. Testar mobile.

## Critério para beta fechado

- CI verde no GitHub.
- SMTP funcionando com email externo à organização Supabase.
- RLS e advisors sem bloqueador anônimo.
- Deploy em HTTPS.
- Cadastro, reset de senha e onboarding funcionando em produção.
- Pelo menos 1 teste completo com conta criada e excluída no fim.
