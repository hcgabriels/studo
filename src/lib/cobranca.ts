import { startOfDay } from "date-fns";
import type { Cobranca } from "@/types/supabase";

export type CobrancaStatus = "pago" | "pendente" | "atrasado";

export const getCobrancaStatus = (c: Pick<Cobranca, "status" | "vencimento">): CobrancaStatus => {
  if (c.status === "pago") return "pago";
  const hoje = startOfDay(new Date());
  const venc = startOfDay(new Date(c.vencimento + "T00:00:00"));
  if (venc < hoje) return "atrasado";
  return "pendente";
};

export const isAtrasada = (c: Pick<Cobranca, "status" | "vencimento">): boolean =>
  getCobrancaStatus(c) === "atrasado";
