# Studoo — integração Stripe Billing

## O que foi implementado

- Checkout hospedado da Stripe para assinatura mensal/anual.
- Customer Portal para gerenciar assinatura.
- Webhook assinado da Stripe para sincronizar status no Supabase.
- Tabela `assinaturas` com RLS: professor só lê a própria assinatura.
- Tabela `stripe_webhook_events` com RLS e acesso apenas via `service_role` para idempotência de webhook.
- Card de plano em `Configurações`.

## Secrets necessários no Supabase

Configure nas Edge Functions:

```bash
supabase secrets set APP_BASE_URL=https://studoo.com.br
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_ID_MENSAL=price_...
supabase secrets set STRIPE_PRICE_ID_ANUAL=price_...
```

Para teste, use chaves e prices de modo teste.

Nunca coloque `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` ou `STRIPE_PRICE_ID_*` em `VITE_*`.

## Produto criado na Stripe

Conta: `ghzstudio.com.br`

- Produto: `Studoo Pro`
- Product ID: `prod_VIWdOHIm6WAduK`
- Mensal: `R$ 39,00/mês`
- `STRIPE_PRICE_ID_MENSAL=price_1UHvaQ1YDP6xATLv9zKYGWni`
- Anual: `R$ 390,00/ano`
- `STRIPE_PRICE_ID_ANUAL=price_1UHvaQ1YDP6xATLvjpI9NdXS`

Modelo comercial vigente:

- Produto pago desde o início.
- Sem plano gratuito e sem teste grátis.
- Cobrança no momento da assinatura.
- Garantia de reembolso por 14 dias nos planos mensal e anual.

## Deploy das functions

```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-billing-portal-session
supabase functions deploy stripe-webhook --no-verify-jwt
```

`stripe-webhook` precisa ficar sem JWT porque a Stripe não envia token do Supabase; ela assina o payload com `STRIPE_WEBHOOK_SECRET`.

## Endpoint do webhook na Stripe

Use:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook
```

Eventos mínimos:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Depois de criar o webhook na Stripe, copie o signing secret `whsec_...` e rode:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

## Customer Portal

Antes de liberar em produção, configure o portal em:

Stripe Dashboard → Settings → Billing → Customer portal.

Permitir no mínimo:

- atualizar forma de pagamento;
- cancelar assinatura;
- visualizar invoices.

## Fluxo esperado

1. Professor abre `Configurações`.
2. Clica em `Assinar mensal` ou `Assinar anual`.
3. Edge Function cria `Checkout Session`.
4. Stripe redireciona para Checkout.
5. Depois do pagamento, Stripe envia webhook.
6. Webhook atualiza `public.assinaturas`.
7. Card de plano passa para `active`, `past_due`, etc.
8. Usuário sem assinatura ativa fica restrito a `Configurações` para assinar ou gerenciar pagamento.

## Status tratados

- `active`
- `past_due`
- `canceled`
- `unpaid`
- `incomplete`
- `incomplete_expired`
- `paused`

O app bloqueia acesso às áreas principais quando não há assinatura ativa, mantendo `Configurações` acessível para assinar, trocar pagamento ou cancelar.
