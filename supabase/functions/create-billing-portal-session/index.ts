import Stripe from "npm:stripe@^22";
import { createClient } from "jsr:@supabase/supabase-js@2";

const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
const supabaseUrl = requiredEnv("SUPABASE_URL");
const supabaseAnonKey = requiredEnv("SUPABASE_ANON_KEY");
const supabaseServiceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const appBaseUrl = requiredEnv("APP_BASE_URL").replace(/\/$/, "");

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

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Sessão inválida" }, 401, cors);

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: professor, error: professorError } = await admin
      .from("professores")
      .select("id")
      .eq("user_id", userData.user.id)
      .single();

    if (professorError || !professor) {
      return json({ error: "Perfil de professor não encontrado" }, 404, cors);
    }

    const { data: assinatura } = await admin
      .from("assinaturas")
      .select("gateway_customer_id")
      .eq("professor_id", professor.id)
      .maybeSingle();

    if (!assinatura?.gateway_customer_id) {
      return json({ error: "Assinatura ainda não configurada" }, 404, cors);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: assinatura.gateway_customer_id,
      return_url: `${appBaseUrl}/configuracoes`,
    });

    return json({ url: session.url }, 200, cors);
  } catch (error) {
    console.error("[create-billing-portal-session]", safeError(error));
    return json({ error: "Não foi possível abrir o portal de assinatura" }, 500, cors);
  }
});

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
