# Studoo — templates de email

Use em:

`Supabase Dashboard -> Authentication -> Email Templates`

Remetente recomendado:

- Sender name: `Studoo`
- Sender email: `no-reply@studoo.com.br`

## Confirm sign up

Subject:

```text
Confirme seu email para entrar no Studoo
```

Body:

```html
<div style="margin:0;padding:0;background:#0a0807;font-family:Arial,Helvetica,sans-serif;color:#f5f1ea;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0807;margin:0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#13110e;border:1px solid #2a2620;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px;">
              <img src="https://studoo.com.br/favicon-192.png" width="40" height="40" alt="Studoo" style="display:block;border:0;border-radius:10px;margin:0 0 10px;">
              <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#f5f1ea;">Studoo</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 8px;">
              <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;color:#f5f1ea;">
                Confirme seu email
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#c7bfb1;">
                Falta só confirmar este endereço para ativar sua conta no Studoo e começar a organizar alunos, aulas e cobranças em um só lugar.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#e7a13a;color:#14110d;text-decoration:none;font-size:15px;font-weight:700;padding:13px 18px;border-radius:10px;">
                Confirmar email
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#8a8275;">
                Se você não criou uma conta no Studoo, ignore este email.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#5a5347;">
                O link expira por segurança. Se precisar, solicite um novo acesso pelo site.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

## Reset password

Subject:

```text
Redefina sua senha do Studoo
```

Body:

```html
<div style="margin:0;padding:0;background:#0a0807;font-family:Arial,Helvetica,sans-serif;color:#f5f1ea;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0807;margin:0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#13110e;border:1px solid #2a2620;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px;">
              <img src="https://studoo.com.br/favicon-192.png" width="40" height="40" alt="Studoo" style="display:block;border:0;border-radius:10px;margin:0 0 10px;">
              <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#f5f1ea;">Studoo</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 8px;">
              <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;color:#f5f1ea;">
                Redefina sua senha
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#c7bfb1;">
                Recebemos uma solicitação para trocar a senha da sua conta no Studoo.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#e7a13a;color:#14110d;text-decoration:none;font-size:15px;font-weight:700;padding:13px 18px;border-radius:10px;">
                Criar nova senha
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#8a8275;">
                Se você não pediu essa alteração, ignore este email. Sua senha atual continua valendo.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#5a5347;">
                O link expira por segurança.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

## Invite user

Subject:

```text
Você foi convidado para o Studoo
```

Body:

```html
<div style="margin:0;padding:0;background:#0a0807;font-family:Arial,Helvetica,sans-serif;color:#f5f1ea;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0807;margin:0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#13110e;border:1px solid #2a2620;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px;">
              <img src="https://studoo.com.br/favicon-192.png" width="40" height="40" alt="Studoo" style="display:block;border:0;border-radius:10px;margin:0 0 10px;">
              <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#f5f1ea;">Studoo</div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 8px;">
              <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;color:#f5f1ea;">
                Seu convite chegou
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#c7bfb1;">
                Você foi convidado para criar sua conta no Studoo e organizar sua rotina de alunos, aulas e cobranças.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#e7a13a;color:#14110d;text-decoration:none;font-size:15px;font-weight:700;padding:13px 18px;border-radius:10px;">
                Aceitar convite
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8a8275;">
                Se você não esperava esse convite, pode ignorar este email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

## Entregabilidade

- Evite palavras promocionais no assunto.
- Teste em Gmail e Outlook/Hotmail.
- No Resend, mantenha tracking de links desativado para emails de autenticação.
- Se cair em spam no teste inicial, marque como "não é spam" para ajudar a reputação do domínio.
