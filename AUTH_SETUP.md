# Configurações de Autenticação — Studoo

Tudo que o **código** precisa já está implementado. Este documento lista as configurações **externas** (Supabase Dashboard + Google Cloud Console) que precisam ser feitas pra ativar:

1. Email de confirmação em PT-BR
2. Google OAuth
3. Trigger SQL atualizado pra cobrir Google

Rode na ordem.

---

## 1. Atualizar trigger SQL pra suportar Google OAuth

Quando o usuário entra com Google, o Supabase preenche `raw_user_meta_data` com `full_name`/`name` (não `nome` como o formulário do app manda). O trigger precisa cobrir ambos.

**Cole no SQL Editor do Supabase e Run:**

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.professores (user_id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'nome',         -- form do app
      NEW.raw_user_meta_data->>'full_name',    -- Google OAuth
      NEW.raw_user_meta_data->>'name',         -- alguns providers
      split_part(NEW.email, '@', 1)            -- fallback
    ),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
```

Função é idempotente — pode rodar quantas vezes quiser. O `CREATE OR REPLACE` substitui a versão antiga.

---

## 2. Ativar confirmação de email (recomendado pra produção)

Por padrão no Supabase, novos cadastros **já entram autenticados** sem confirmar email. Em produção isso é ruim — qualquer pessoa pode criar conta com email falso.

**Como ativar:**

1. Abra o **Supabase Dashboard** do seu projeto
2. Vá em **Authentication** → **Providers** → **Email**
3. Marque **"Confirm email"** ✅
4. Save

A partir daí, novos cadastros são redirecionados pra `/verificar-email` (a página dedicada que criamos) até confirmarem.

---

## 3. Customizar email de confirmação em PT-BR

Hoje o email vem em inglês padrão Supabase. Pra customizar:

1. Supabase Dashboard → **Authentication** → **Email Templates**
2. Selecione **"Confirm signup"**
3. Cole o template abaixo no campo HTML:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Bem-vindo ao Studoo</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0a0a; color: #f5f5f5; padding: 40px 20px; max-width: 600px; margin: 0 auto;">
    <div style="background: #141414; border: 1px solid #222; border-radius: 16px; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #d4a843; font-size: 28px; margin: 0; letter-spacing: -0.02em;">studoo</h1>
      </div>

      <h2 style="font-size: 22px; margin: 0 0 12px;">Bem-vindo, professor! 🎵</h2>

      <p style="color: #b5b5b5; line-height: 1.6; margin: 0 0 24px;">
        Obrigado por se cadastrar no Studoo. Clique no botão abaixo para
        confirmar seu email e começar a organizar sua escola de música.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="{{ .ConfirmationURL }}"
           style="background: #d4a843; color: #0a0a0a; padding: 12px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; display: inline-block;">
          Confirmar email
        </a>
      </div>

      <p style="color: #888; font-size: 12px; line-height: 1.5; margin: 24px 0 0;">
        Se você não criou essa conta, pode ignorar este email.
        Ou copie e cole esse link no navegador:<br />
        <span style="color: #d4a843; word-break: break-all;">{{ .ConfirmationURL }}</span>
      </p>
    </div>

    <p style="text-align: center; color: #555; font-size: 11px; margin-top: 24px;">
      © Studoo · Gestão para professores de música
    </p>
  </body>
</html>
```

4. Edite também:
   - **"Subject heading"** → `Confirme seu cadastro no Studoo`
5. Save

**Repita pra os outros templates** que você usar (Reset Password, Magic Link). Use a mesma estrutura visual.

---

## 4. Google OAuth — configuração

### 4.1. Criar credenciais no Google Cloud Console

1. Acesse https://console.cloud.google.com/
2. Crie um **novo projeto** (ou selecione um existente) — nome: "Studoo"
3. No menu lateral: **APIs & Services** → **OAuth consent screen**
4. Tipo de usuário: **External**, click "Create"
5. Preencha:
   - **App name**: Studoo
   - **User support email**: seu email
   - **Logo**: opcional (sem logo ainda funciona)
   - **App domain → Application home page**: `https://seusite.com` (ou `http://localhost:5174` por enquanto)
   - **Authorized domains**: adicione seu domínio + `supabase.co`
   - **Developer contact**: seu email
6. **Save and continue**
7. **Scopes**: adicione `email`, `profile`, `openid` → Save and continue
8. **Test users**: adicione seu próprio email (enquanto está em modo de teste)
9. **Summary** → Back to dashboard

Agora as credenciais:

10. Menu lateral: **APIs & Services** → **Credentials**
11. **+ Create Credentials** → **OAuth client ID**
12. Application type: **Web application**
13. Name: "Studoo Web"
14. **Authorized JavaScript origins**:
    - `http://localhost:5173`
    - `http://localhost:5174`
    - `https://seusite.com` (quando tiver)
15. **Authorized redirect URIs**:
    - **Importante:** Use a URL exata do seu projeto Supabase. Pega em:
      Supabase Dashboard → Authentication → Providers → Google → **Callback URL (for OAuth)**
    - Algo tipo `https://xxphlozkuklraitfrwgx.supabase.co/auth/v1/callback`
16. **Create**
17. Copia o **Client ID** e **Client Secret** que aparecem (vai precisar no próximo passo)

### 4.2. Habilitar Google no Supabase

1. Supabase Dashboard → **Authentication** → **Providers**
2. Encontre **Google** e click pra expandir
3. Habilite o toggle **"Enable Sign in with Google"**
4. Cole o **Client ID** e o **Client Secret** que copiou
5. Save

### 4.3. Testar

1. Acesse `/cadastro` ou `/login` no app
2. Click em **"Continuar com Google"**
3. Deve abrir o popup de login Google
4. Após autorizar, você volta pro app autenticado direto no Dashboard

⚠️ **Se der erro "redirect_uri_mismatch":** a URL de callback no Google Console não bate com a do Supabase. Confira no passo 4.1.15.

---

## 5. Site URL no Supabase

Pra que os emails de confirmação/reset apontem pra URL certa:

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL**: `https://seudominio.com` (ou `http://localhost:5174` em dev)
3. **Redirect URLs** (lista permitida): adicione todos os domínios onde o app vai rodar (localhost + produção)

---

## 6. Resumo do que mudou no fluxo

```
ANTES                                    DEPOIS
─────                                    ──────
Cadastro com email+senha                 Cadastro com Google OU email+senha
↓                                        ↓
toast "Verifique email"                  /verificar-email (tela dedicada
                                          com botão Reenviar + dicas)
↓                                        ↓
/login                                   Email custom em PT-BR
↓                                        ↓
Erros em inglês confusos                 Erros traduzidos em PT-BR
                                         ↓
                                         Click no link confirma → Dashboard
                                         (ou OAuth pula direto pra cá)
```

---

## 7. Checklist final

Marque conforme for fazendo:

- [ ] Rodei o SQL atualizado do `handle_new_user()` (item 1)
- [ ] Ativei "Confirm email" no Supabase (item 2)
- [ ] Customizei email template em PT-BR (item 3)
- [ ] Criei OAuth Client no Google Console (item 4.1)
- [ ] Habilitei Google provider no Supabase (item 4.2)
- [ ] Testei login com Google (item 4.3)
- [ ] Configurei Site URL (item 5)

Quando todos estiverem ✅, o fluxo de auth está completo e profissional.
