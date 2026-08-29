# Studoo — checklist de lançamento

## Estado atual

- GitHub: `https://github.com/hcgabriels/studo`
- Branch principal: `main`
- CI: GitHub Actions rodando `npm ci`, `npm test`, `npm run lint`, `npm run build` e `npm audit --omit=dev`
- Supabase: projeto `studo` (`xxphlozkuklraitfrwgx`) ativo
- Banco: RLS ligado nas 8 tabelas principais e hardening aplicado em `sql/2026-08-hardening.sql`
- Deploy: pronto para Vercel via `vercel.json`; Netlify/Cloudflare Pages continuam cobertos por `public/_redirects`
- Direcao de produto: definida em `docs/PRODUCT_DIRECTION.md`

## Bloqueadores antes de convidar professores

1. Revisar template dos emails de autenticação no Supabase.
2. Melhorar entregabilidade dos emails enviados pelo Resend.
3. Revisar onboarding inicial e estados de primeira visita.
4. Revisar modal de novo aluno.
5. Criar onboarding guiado com tooltips para o primeiro acesso.
6. Ativar proteção de senha vazada no Supabase Auth, se disponível no plano.
7. Rodar QA manual em produção.

## Supabase Auth

### SMTP

O SMTP padrão do Supabase não serve para produção: envia só para membros da organização e tem limite baixo. Configure em:

`Supabase Dashboard -> Authentication -> Emails -> SMTP Settings`

Campos esperados:

- Sender email: `no-reply@studoo.com.br`
- Sender name: `Studoo`
- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: API key do Resend

O domínio `studoo.com.br` precisa estar verificado no Resend antes dos testes.

Depois de salvar, testar:

- Cadastro com email e senha
- Confirmação de email
- Reset de senha
- Login com Google, se continuar ativo

### Templates de email

Editar em:

`Supabase Dashboard -> Authentication -> Email Templates`

Templates prioritários:

- Confirm sign up
- Reset password
- Magic link / OTP, se for usado

Templates prontos: `docs/EMAIL_TEMPLATES.md`

Assunto sugerido para confirmação:

`Confirme seu email para entrar no Studoo`

O HTML deve usar `{{ .ConfirmationURL }}` no botão principal. O tom precisa ser simples, com marca Studoo, aviso de expiração e instrução para ignorar caso a pessoa não tenha criado conta.

### Entregabilidade

Checar antes do beta:

- Resend Domain: `Verified`
- SPF/DKIM/DMARC configurados e propagados
- Remetente com domínio próprio: `no-reply@studoo.com.br`
- Primeiros envios testados em Gmail e Outlook/Hotmail
- Se cair em spam, marcar como "não é spam" nas contas de teste e evitar assunto promocional

## Produto

### Onboarding inicial

Revisar antes do beta:

- Alinhamento vertical e responsividade
- Textos de boas-vindas
- Passos essenciais versus passos opcionais
- Estado de pular onboarding

### Onboarding guiado

Implementar depois que dashboard, alunos, agenda e financeiro estiverem estáveis.

Critério:

- Aparecer só no primeiro acesso ao painel
- Explicar menu, botão de novo aluno, agenda, cobrança e configurações
- Permitir pular
- Não reaparecer após conclusão
- Reabrir manualmente em Configurações ou Ajuda

### Modal de novo aluno

Revisar:

- Hierarquia visual do formulário
- Campos essenciais primeiro
- Responsividade
- Alinhamento de horários semanais
- Rodapé de ação mais limpo

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
