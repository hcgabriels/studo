import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const readProjectFile = (path: string) =>
  readFileSync(join(projectRoot, path), "utf8");

const billingMigrationName = readdirSync(
  join(projectRoot, "supabase/migrations"),
).find((name) => name.endsWith("_add_stripe_billing.sql"));

if (!billingMigrationName) {
  throw new Error("Migração add_stripe_billing não encontrada");
}

const billingMigration = readProjectFile(
  `supabase/migrations/${billingMigrationName}`,
);

describe("Stripe Billing", () => {
  it("mantém secrets da Stripe fora do frontend", () => {
    const srcFiles = readdirSync(join(projectRoot, "src"), { recursive: true })
      .filter((path) => String(path).endsWith(".ts") || String(path).endsWith(".tsx"))
      .map((path) => readProjectFile(join("src", String(path))))
      .join("\n");

    expect(srcFiles).not.toContain("STRIPE_SECRET_KEY");
    expect(srcFiles).not.toContain("STRIPE_WEBHOOK_SECRET");
    expect(srcFiles).not.toContain("STRIPE_PRICE_ID");
    expect(readProjectFile(".env.example")).not.toContain("VITE_STRIPE_SECRET");
  });

  it("cria assinatura com RLS e sem escrita direta pelo cliente", () => {
    expect(billingMigration).toMatch(/create\s+table\s+if\s+not\s+exists\s+public\.assinaturas/i);
    expect(billingMigration).toMatch(/alter\s+table\s+public\.assinaturas\s+enable\s+row\s+level\s+security/i);
    expect(billingMigration).toMatch(/grant\s+select\s+on\s+table\s+public\.assinaturas\s+to\s+authenticated/i);
    expect(billingMigration).not.toMatch(
      /grant\s+select\s*,\s*insert\s*,\s*update\s*,\s*delete\s+on\s+table\s+public\.assinaturas\s+to\s+authenticated/i,
    );
  });

  it("webhook valida assinatura da Stripe e roda sem JWT do Supabase", () => {
    const webhook = readProjectFile("supabase/functions/stripe-webhook/index.ts");
    const config = readProjectFile("supabase/config.toml");

    expect(webhook).toContain("constructEventAsync");
    expect(webhook).toContain("STRIPE_WEBHOOK_SECRET");
    expect(webhook).toContain("Stripe.createSubtleCryptoProvider");
    expect(config).toMatch(/\[functions\.stripe-webhook\][\s\S]*verify_jwt\s*=\s*false/);
  });

  it("checkout usa price id server-side e modo subscription", () => {
    const checkout = readProjectFile("supabase/functions/create-checkout-session/index.ts");

    expect(checkout).toContain('mode: "subscription"');
    expect(checkout).toContain("STRIPE_PRICE_ID_MENSAL");
    expect(checkout).toContain("STRIPE_PRICE_ID_ANUAL");
    expect(checkout).toContain("stripe.checkout.sessions.create");
  });
});
