# Studoo — pagamentos e lançamento

## Decisão principal

O Studoo tem dois domínios de pagamento diferentes:

1. **Billing do Studoo** — o professor paga para usar o SaaS.
2. **Cobranças dos alunos** — o professor cobra mensalidades/aulas dos próprios alunos.

Para o lançamento, a prioridade recomendada é implementar **billing do Studoo** e manter as cobranças dos alunos no modelo atual: geração de cobrança + WhatsApp + PIX manual. Cobrança integrada de alunos deve entrar depois, porque transforma o produto em uma camada financeira/marketplace: split, KYC, repasse, conciliação, suporte a estorno, chargeback, antifraude e disputas.

## Recomendação de gateway

### Fase de lançamento: Stripe Billing

Melhor caminho para cobrar assinatura do professor:

- Checkout hospedado, sem cartão passando pelo Studoo.
- Customer Portal para trocar cartão, cancelar e baixar invoices.
- Webhooks maduros para ativar, bloquear e reativar acesso.
- PIX recorrente para assinaturas no Brasil já é suportado pela Stripe.
- Menor superfície de compliance no app.

### Alternativa brasileira: Asaas

Boa opção se a prioridade comercial for PIX/boleto local desde o dia 1 ou se o Studoo quiser evoluir para cobrança dos alunos com checkout, PIX dinâmico, boleto, assinatura, split e subcontas. É mais aderente ao Brasil, mas aumenta a quantidade de regras operacionais dentro do produto.

### Não recomendado para agora

- Cobrança integrada dos alunos dentro do Studoo.
- Split/marketplace.
- Receber dinheiro dos alunos em nome do Studoo.
- Pix Automático como primeira versão.
- Gateway direto no frontend.

## Plano técnico — billing do Studoo

### 1. Modelo de dados

Adicionar campos em `professores` ou criar tabela `assinaturas`.

Recomendação: criar tabela separada:

```sql
assinaturas
├─ id uuid pk
├─ professor_id uuid unique references professores(id)
├─ gateway text -- stripe | asaas
├─ gateway_customer_id text
├─ gateway_subscription_id text
├─ status text -- active | past_due | canceled | unpaid | incomplete
├─ plano text -- mensal | anual
├─ trial_ends_at timestamptz -- legado/compatibilidade, sem teste grátis no produto atual
├─ current_period_end timestamptz
├─ cancel_at_period_end boolean
├─ created_at timestamptz
├─ updated_at timestamptz
```

Motivo: separar identidade do professor de estado financeiro. Isso reduz risco em migrações futuras e facilita trocar gateway se necessário.

### 2. Estados de acesso

Regra sugerida:

| Status | Acesso |
|---|---|
| `active` | acesso completo |
| `past_due` | acesso bloqueado, mantendo Configurações e suporte |
| `unpaid` | acesso bloqueado, mantendo exportação LGPD |
| `canceled` com período vigente | acesso até `current_period_end` |
| `canceled` vencido | bloqueado |
| sem assinatura | mandar para Configurações/checkout |

Nunca apagar dados por falta de pagamento. Bloquear uso, manter login, exportação e contato de suporte.

### 3. Backend obrigatório

Implementar via Supabase Edge Functions:

- `create-checkout-session`
  - recebe usuário autenticado;
  - localiza `professores.id`;
  - cria/recupera customer no gateway;
  - cria checkout session;
  - retorna URL.

- `create-billing-portal-session`
  - recebe usuário autenticado;
  - abre portal do cliente.

- `payment-webhook`
  - endpoint público;
  - valida assinatura do gateway;
  - idempotente;
  - atualiza `assinaturas`.

Segredos ficam apenas nas Edge Functions:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_MENSAL`
- `STRIPE_PRICE_ID_ANUAL`

Nunca usar `VITE_STRIPE_SECRET`, service role ou chave privada no frontend.

### 4. Frontend

Adicionar no app:

- Card de plano em `Configurações`.
- CTA “Assinar agora” quando sem assinatura.
- CTA “Gerenciar assinatura” para portal.
- Botão “Cancelar assinatura” abrindo portal da Stripe.
- Bloqueio de acesso quando não há assinatura ativa.
- Tela de bloqueio para `unpaid/canceled`.

### 5. Modelo comercial vigente

- Produto pago desde o início.
- Sem teste grátis e sem plano gratuito.
- R$ 39/mês ou R$ 390/ano.
- Cobrança no momento da assinatura.
- Garantia de reembolso por 14 dias nos dois planos.

## Cobranças dos alunos — fase posterior

Quando for evoluir:

### Versão 1 — link/QR por cobrança

- botão “Gerar link de pagamento” em cada cobrança;
- salvar `gateway_payment_id`, `payment_url`, `pix_qr_code`, `expires_at`;
- webhook marca cobrança como paga automaticamente;
- professor ainda recebe direto na conta do gateway.

### Versão 2 — assinatura do aluno

- assinatura recorrente por aluno;
- pausa/cancelamento por aluno;
- retry automático;
- inadimplência refletida no dashboard.

### Versão 3 — marketplace/split

Somente se houver razão estratégica forte. Exige KYC, termos específicos, repasse, suporte financeiro e conciliação robusta.

## Processos faltantes para lançamento

### Operação

- Preço mensal/anual definido: R$ 39/mês ou R$ 390/ano. ✅
- Política comercial definida: sem teste grátis, sem plano gratuito, reembolso em 14 dias. ✅
- Criar processo operacional de reembolso no suporte.
- Criar canal de suporte oficial.
- Criar página curta de status/contato.

### Legal/LGPD

- Atualizar Termos e Privacidade para cobrança real.
- Informar gateway como operador/subprocessador.
- Explicar dados financeiros armazenados.
- Garantir exportação e exclusão de conta.

### Infra

- Configurar secrets na Vercel/Supabase.
- Configurar webhooks em produção e homologação.
- Ativar proteção de senha vazada no Supabase, se disponível.
- Confirmar SMTP/Resend e templates reais.
- Rodar smoke test de cadastro, email, onboarding, cobrança e exclusão.

### Métricas

Eventos mínimos:

- `signup_started`
- `signup_completed`
- `onboarding_completed`
- `checkout_started`
- `subscription_created`
- `subscription_past_due`
- `subscription_canceled`
- `first_student_created`
- `first_charge_generated`

## Roadmap recomendado

### Fase 0 — decisão comercial

Resultado esperado:

- gateway escolhido;
- preço definido;
- política de acesso pago decidida;
- plano mensal/anual criado no gateway.

### Fase 1 — billing SaaS

Resultado esperado:

- tabela `assinaturas`; ✅
- Edge Functions de checkout, portal e webhook; ✅
- card de plano em Ajustes; ✅
- bloqueio suave por status;
- testes de webhook e acesso.

### Fase 2 — lançamento controlado

Resultado esperado:

- 5–20 professores reais;
- suporte manual próximo;
- métricas de ativação e retenção;
- sem cobrança integrada dos alunos ainda.

### Fase 3 — cobrança integrada dos alunos

Resultado esperado:

- gateway brasileiro ou Stripe/PIX definido para cobranças dos alunos;
- link/QR por cobrança;
- baixa automática por webhook;
- conciliação simples no Financeiro.

### Fase 4 — automações

Resultado esperado:

- lembretes automáticos;
- cobrança recorrente por aluno;
- alertas inteligentes;
- assistente de IA para resumo, cobrança e acompanhamento.

## Critério para lançar

O Studoo pode abrir para usuários reais quando:

- cadastro, email, login, onboarding e exclusão passarem em produção;
- billing do Studoo ativar e bloquear acesso corretamente;
- webhook for idempotente e validado por assinatura;
- secrets não estiverem no frontend;
- Termos/Privacidade refletirem cobrança real;
- suporte e processo de reembolso estiverem definidos;
- houver pelo menos um smoke test completo com conta paga/teste.
