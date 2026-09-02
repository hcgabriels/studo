# Studoo — emails de autenticação

Os templates oficiais ficam versionados junto do projeto:

| Fluxo | Assunto | Arquivo |
| --- | --- | --- |
| Confirmação de cadastro | `Confirme seu email para entrar no Studoo` | `supabase/templates/confirmation.html` |
| Recuperação de senha | `Redefina sua senha do Studoo` | `supabase/templates/recovery.html` |
| Convite | `Você foi convidado para o Studoo` | `supabase/templates/invite.html` |

O `supabase/config.toml` aponta para esses arquivos no ambiente local. No projeto
remoto, copie o conteúdo correspondente em **Authentication → Email Templates**
ou aplique pela configuração de Auth da sua esteira de deploy.

## Decisões de layout

- wordmark em texto, centralizado fora do card, para a marca continuar visível
  mesmo quando o cliente de email bloqueia imagens;
- card alto, conteúdo alinhado à esquerda e CTA único;
- cores, bordas e linguagem iguais às telas de autenticação;
- tabelas e estilos inline para compatibilidade com Gmail e Outlook;
- preheader curto e aviso explícito de expiração em 1 hora.

## Remetente e entregabilidade

- Sender name: `Studoo`
- Sender email: `no-reply@studoo.com.br`
- SMTP: Resend, conforme `docs/LAUNCH.md`
- tracking de links desativado para emails de autenticação;
- validar confirmação e recuperação em Gmail e Outlook/Hotmail antes do beta.

Nunca troque `{{ .ConfirmationURL }}` por uma URL fixa: o Supabase gera um link
único, com token e redirecionamento, para cada mensagem.
