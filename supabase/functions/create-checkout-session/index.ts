import Stripe from "npm:stripe@^22";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Plano = "mensal" | "anual";

const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
const supabaseUrl = requiredEnv("SUPABASE_URL");
const supabaseAnonKey = requiredEnv("SUPABASE_ANON_KEY");
const supabaseServiceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const appBaseUrl = requiredEnv("APP_BASE_URL").replace(/\/$/, "");

const priceByPlano: Record<Plano, string | undefined> = {
  mensal: Deno.env.get("STRIPE_PRICE_ID_MENSAL"),
  anual: Deno.env.get("STRIPE_PRICE_ID_ANUAL"),
};

const corsHeaders = (req: Request) => {
  const origin = req.headers.get("origin") ?? appBaseUrl;
  const allowed =
    origin === appBaseUrl ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:");

  return {
    "Access-Control-Allow-Origin": allowed ? origin : appBaseUrl,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405, cors);

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Sessão ausente" }, 401, cors);

    const body = await req.json().catch(() => ({}));
    const plano = body?.plano === "anual" ? "anual" : "mensal";
    const price = priceByPlano[plano];
    if (!price) return json({ error: `Preço ${plano} não configurado` }, 500, cors);

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Sessão inválida" }, 401, cors);

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: professor, error: professorError } = await admin
      .from("professores")
      .select("id,nome,email,user_id")
      .eq("user_id", userData.user.id)
      .single();

    if (professorError || !professor) {
      return json({ error: "Perfil de professor não encontrado" }, 404, cors);
    }

    const { data: assinatura } = await admin
      .from("assinaturas")
      .select("*")
      .eq("professor_id", professor.id)
      .maybeSingle();

    const customerId =
      assinatura?.gateway_customer_id ??
      (await createStripeCustomer({
        email: professor.email || userData.user.email || undefined,
        name: professor.nome || undefined,
        professorId: professor.id,
        userId: userData.user.id,
      }));

    if (!assinatura?.gateway_customer_id) {
      await admin.from("assinaturas").upsert(
        {
          professor_id: professor.id,
          gateway: "stripe",
          gateway_customer_id: customerId,
          status: assinatura?.status ?? "incomplete",
          plano,
        },
        { onConflict: "professor_id" },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      success_url: `${appBaseUrl}/configuracoes?billing=success`,
      cancel_url: `${appBaseUrl}/configuracoes?billing=cancelled`,
      client_reference_id: professor.id,
      allow_promotion_codes: true,
      locale: "pt-BR",
      metadata: {
        professor_id: professor.id,
        user_id: userData.user.id,
        plano,
      },
      subscription_data: {
        metadata: {
          professor_id: professor.id,
          user_id: userData.user.id,
          plano,
        },
      },
    });

    return json({ url: session.url }, 200, cors);
  } catch (error) {
    console.error("[create-checkout-session]", safeError(error));
    return json({ error: "Não foi possível iniciar o checkout" }, 500, cors);
  }
});

async function createStripeCustomer(input: {
  email?: string;
  name?: string;
  professorId: string;
  userId: string;
}) {
  const customer = await stripe.customers.create({
    email: input.email,
    name: input.name,
    metadata: {
      professor_id: input.professorId,
      user_id: input.userId,
    },
  });
  return customer.id;
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function json(payload: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function safeError(error: unknown) {
  return error instanceof Error ? { name: error.name, message: error.message } : String(error);
}
