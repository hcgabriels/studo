import { describe, expect, it } from "vitest";
import {
  cobraNoFimDoTeste,
  diasRestantesTeste,
  emTesteGratis,
  jaAssinou,
  temAcesso,
  testeEncerrado,
} from "./assinatura";

const agora = new Date("2026-10-19T12:00:00Z");
const daqui = (horas: number) => new Date(agora.getTime() + horas * 3600_000).toISOString();

const teste = (trial_ends_at: string | null, gateway_subscription_id: string | null = null) => ({
  status: "trialing" as const,
  trial_ends_at,
  gateway_subscription_id,
});

describe("temAcesso", () => {
  it("nega sem assinatura", () => {
    expect(temAcesso(null, agora)).toBe(false);
  });

  it("libera assinatura ativa", () => {
    expect(
      temAcesso({ status: "active", trial_ends_at: null, gateway_subscription_id: "sub_1" }, agora),
    ).toBe(true);
  });

  it("libera teste dentro do prazo e bloqueia depois", () => {
    expect(temAcesso(teste(daqui(1)), agora)).toBe(true);
    expect(temAcesso(teste(daqui(-1)), agora)).toBe(false);
  });

  it("bloqueia teste sem data de fim", () => {
    expect(temAcesso(teste(null), agora)).toBe(false);
  });

  it("bloqueia pagamento atrasado e checkout incompleto", () => {
    for (const status of ["past_due", "unpaid", "incomplete", "canceled"] as const) {
      expect(
        temAcesso({ status, trial_ends_at: daqui(48), gateway_subscription_id: null }, agora),
      ).toBe(false);
    }
  });
});

describe("teste grátis do Studoo", () => {
  it("distingue teste do Studoo de teste da Stripe", () => {
    expect(emTesteGratis(teste(daqui(24)), agora)).toBe(true);
    expect(emTesteGratis(teste(daqui(24), "sub_1"), agora)).toBe(false);
  });

  it("marca teste encerrado só quando não assinou", () => {
    expect(testeEncerrado(teste(daqui(-2)), agora)).toBe(true);
    expect(testeEncerrado(teste(daqui(-2), "sub_1"), agora)).toBe(false);
    expect(testeEncerrado(teste(daqui(2)), agora)).toBe(false);
  });

  it("conta dias arredondando pra cima", () => {
    expect(diasRestantesTeste(teste(daqui(7 * 24)), agora)).toBe(7);
    expect(diasRestantesTeste(teste(daqui(1)), agora)).toBe(1);
    expect(diasRestantesTeste(teste(daqui(-5)), agora)).toBe(0);
    expect(diasRestantesTeste(null, agora)).toBe(0);
  });
});

describe("jaAssinou", () => {
  it("bloqueia novo checkout com assinatura viva na Stripe", () => {
    expect(jaAssinou({ status: "active", trial_ends_at: null, gateway_subscription_id: "sub_1" })).toBe(true);
    expect(jaAssinou(teste(daqui(24), "sub_1"))).toBe(true);
    expect(jaAssinou({ status: "past_due", trial_ends_at: null, gateway_subscription_id: "sub_1" })).toBe(true);
  });

  it("deixa assinar no teste do Studoo, após cancelar ou se o checkout expirou", () => {
    expect(jaAssinou(teste(daqui(24)))).toBe(false);
    expect(jaAssinou({ status: "canceled", trial_ends_at: null, gateway_subscription_id: "sub_1" })).toBe(false);
    expect(jaAssinou({ status: "incomplete_expired", trial_ends_at: null, gateway_subscription_id: "sub_1" })).toBe(false);
  });
});

describe("cobraNoFimDoTeste", () => {
  it("segura a cobrança só com 48h ou mais de teste", () => {
    expect(cobraNoFimDoTeste(teste(daqui(72)), agora)).toBe(true);
    expect(cobraNoFimDoTeste(teste(daqui(47)), agora)).toBe(false);
    expect(cobraNoFimDoTeste(teste(daqui(72), "sub_1"), agora)).toBe(false);
  });
});
