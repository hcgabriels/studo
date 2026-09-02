# Login com Google

O frontend já usa `supabase.auth.signInWithOAuth({ provider: "google" })`. A
opção só aparece quando o endpoint público de configurações do Supabase confirma
que o provedor está ativo; assim, um botão quebrado nunca é oferecido ao usuário.

## Ativar no ambiente remoto

1. No Google Auth Platform, configure a tela de consentimento e crie um cliente
   OAuth do tipo **Web application**.
2. Em **Authorized JavaScript origins**, inclua a origem de produção do Studoo e
   a origem local usada no desenvolvimento.
3. Em **Authorized redirect URIs**, inclua exatamente a callback mostrada em
   **Supabase → Authentication → Sign In / Providers → Google**. O formato é:
   `https://<PROJECT_REF>.supabase.co/auth/v1/callback`.
4. No Supabase, abra o provedor Google, informe o Client ID e o Client Secret e
   ative-o.
5. Em **Authentication → URL Configuration**, mantenha a URL de produção como
   Site URL e permita os redirects de produção e desenvolvimento usados pelo app.

O Client Secret deve ser salvo somente no Google/Supabase. Nunca o coloque em
`.env`, `VITE_*`, Vercel ou no repositório: variáveis Vite são públicas no bundle.

## Desenvolvimento com Supabase local

Se o login social também precisar funcionar contra a stack local, use:

```toml
[auth.external.google]
enabled = true
client_id = "<client-id>"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)"
skip_nonce_check = false
```

E mantenha o secret fora do Git:

```sh
export SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET="..."
```

Callback local: `http://127.0.0.1:54321/auth/v1/callback`.

Referências oficiais:

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/redirect-urls
