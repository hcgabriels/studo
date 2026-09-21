import Stripe from "npm:stripe@^22";
import { createClient } from "jsr:@supabase/supabase-js@2";

type AssinaturaStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const webhookSecret = requiredEnv("STRIPE_WEBHOOK_SECRET");
const admin = createClient(
  requiredEnv("SUPABASE_URL"),
  requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
);

const mensalPriceId = Deno.env.get("STRIPE_PRICE_ID_MENSAL");
const anualPriceId = Deno.env.get("STRIPE_PRICE_ID_ANUAL");

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método não permitido", { status: 405 });

  let event: Stripe.Event;
  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) return new Response("Assinatura ausente", { status: 400 });

    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (error) {
    console.error("[stripe-webhook] assinatura inválida", safeError(error));
    return new Response("Webhook inválido", { status: 400 });
  }

  const inserted = await markEventStarted(event);
  if (!inserted) return new Response(JSON.stringify({ received: true, duplicate: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  try {
    await handleEvent(event);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    await admin.from("stripe_webhook_events").delete().eq("id", event.id);
    console.error("[stripe-webhook] erro ao processar", {
      eventId: event.id,
      type: event.type,
      error: safeError(error),
    });
    return new Response("Erro ao processar webhook", { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await syncFromCheckoutSession(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncFromSubscription(event.data.object as Stripe.Subscription);
      break;
    case "invoice.payment_succeeded":
    case "invoice.payment_failed":
      await syncFromInvoice(event.data.object as Stripe.Invoice);
      break;
    default:
      break;
  }
}

async function syncFromCheckoutSession(session: Stripe.Checkout.Session) {
  const subscriptionId = toId(session.subscription);
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncFromSubscription(subscription);
}

async function syncFromInvoice(invoice: Stripe.Invoice) {
  const subscriptionId = toId((invoice as Stripe.Invoice & { subscription?: unknown }).subscription);
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncFromSubscription(subscription);
}

async function syncFromSubscription(subscription: Stripe.Subscription) {
  const anySub = subscription as Stripe.Subscription & {
    current_period_end?: number;
    cancel_at_period_end?: boolean;
    trial_end?: number | null;
  };
  const customerId = toId(subscription.customer);
  const professorId = subscription.metadata?.professor_id || await professorIdByCustomer(customerId);

  if (!professorId) {
    throw new Error(`Professor não encontrado para customer ${customerId}`);
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const plano = subscription.metadata?.plano || planoFromPrice(priceId);

  const { error } = await admin.from("assinaturas").upsert(
    {
      professor_id: professorId,
      gateway: "stripe",
      gateway_customer_id: customerId,
      gateway_subscription_id: subscription.id,
      status: normalizeStatus(subscription.status),
      plano,
      trial_ends_at: secondsToIso(anySub.trial_end),
      current_period_end: secondsToIso(anySub.current_period_end),
      cancel_at_period_end: Boolean(anySub.cancel_at_period_end),
    },
    { onConflict: "professor_id" },
  );

  if (error) throw error;
}

async function professorIdByCustomer(customerId: string | null) {
  if (!customerId) return null;
  const { data, error } = await admin
    .from("assinaturas")
    .select("professor_id")
    .eq("gateway_customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  return data?.professor_id ?? null;
}

async function markEventStarted(event: Stripe.Event) {
  const { error } = await admin.from("stripe_webhook_events").insert({
    id: event.id,
    type: event.type,
  });

  if (!error) return true;
  if (error.code === "23505") return false;
  throw error;
}

function planoFromPrice(priceId?: string) {
  if (priceId && priceId === anualPriceId) return "anual";
  if (priceId && priceId === mensalPriceId) return "mensal";
  return "mensal";
}

function normalizeStatus(status: string): AssinaturaStatus {
  if (
    status === "trialing" ||
    status === "active" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete" ||
    status === "incomplete_expired" ||
    status === "paused"
  ) {
    return status;
  }
  return "incomplete";
}

function secondsToIso(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function toId(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id;
  }
  return null;
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function safeError(error: unknown) {
  return error instanceof Error ? { name: error.name, message: error.message } : String(error);
}
