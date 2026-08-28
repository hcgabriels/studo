import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays, format, startOfMonth, endOfMonth } from "date-fns";
import { useProfessor } from "@/hooks/useProfessor";
import { supabase } from "@/lib/supabase";
import { getCobrancaStatus } from "@/lib/cobranca";
import type { Aluno, Aula, Cobranca } from "@/types/supabase";

export type NotifSeverity = "destructive" | "warning" | "info";

export interface Notificacao {
  id: string;
  severity: NotifSeverity;
  title: string;
  description: string;
  href?: string;
}

type CobrancaComAluno = Cobranca & { alunos: { nome: string } | null };

export function useNotificacoes() {
  const { data: professor } = useProfessor();

  const { data: alunos } = useQuery({
    queryKey: ["alunos", professor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alunos")
        .select("*")
        .eq("professor_id", professor!.id);
      if (error) throw error;
      return data as Aluno[];
    },
    enabled: !!professor,
  });

  const { data: cobrancas } = useQuery({
    queryKey: ["cobrancas-dashboard", professor?.id],
    queryFn: async () => {
      const inicio = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const fim = format(endOfMonth(new Date()), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("cobrancas")
        .select("*, alunos(nome)")
        .eq("professor_id", professor!.id)
        .gte("mes_referencia", inicio)
        .lte("mes_referencia", fim);
      if (error) throw error;
      return data as CobrancaComAluno[];
    },
    enabled: !!professor,
  });

  const { data: aulas } = useQuery({
    queryKey: ["aulas-recentes", professor?.id],
    queryFn: async () => {
      const desde = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .eq("professor_id", professor!.id)
        .gte("data_hora", desde);
      if (error) throw error;
      return data as Aula[];
    },
    enabled: !!professor,
  });

  const items = useMemo<Notificacao[]>(() => {
    if (!alunos || !cobrancas || !aulas) return [];
    const agora = new Date();
    const h30diasAtras = subDays(agora, 30);
    const notifs: Notificacao[] = [];

    cobrancas
      .filter((c) => getCobrancaStatus(c) === "atrasado")
      .forEach((c) => {
        const nome = c.alunos?.nome ?? "Aluno";
        const venc = new Date(c.vencimento + "T00:00:00");
        notifs.push({
          id: `cob-${c.id}`,
          severity: "destructive",
          title: `Cobrança atrasada · ${nome}`,
          description: `R$ ${Number(c.valor).toFixed(2)} venceu em ${venc.toLocaleDateString("pt-BR")}`,
          href: "/financeiro",
        });
      });

    alunos
      .filter((a) => a.status === "ativo")
      .forEach((a) => {
        const faltas = aulas.filter(
          (au) =>
            au.aluno_id === a.id &&
            au.status === "falta_sem_aviso" &&
            new Date(au.data_hora) >= h30diasAtras,
        ).length;
        if (faltas >= 3) {
          notifs.push({
            id: `falt-${a.id}`,
            severity: "warning",
            title: `${a.nome} acumulou faltas`,
            description: `${faltas} faltas sem aviso nos últimos 30 dias`,
            href: `/alunos/${a.id}`,
          });
        }
      });

    alunos
      .filter((a) => a.data_nascimento && a.status === "ativo")
      .forEach((a) => {
        const d = new Date(a.data_nascimento + "T00:00:00");
        if (
          d.getMonth() === agora.getMonth() &&
          d.getDate() === agora.getDate()
        ) {
          notifs.push({
            id: `nasc-${a.id}`,
            severity: "info",
            title: `Aniversário hoje — ${a.nome}`,
            description: "Mande uma mensagem!",
            href: `/alunos/${a.id}`,
          });
        }
      });

    const order: Record<NotifSeverity, number> = {
      destructive: 0,
      warning: 1,
      info: 2,
    };
    return notifs.sort((a, b) => order[a.severity] - order[b.severity]);
  }, [alunos, cobrancas, aulas]);

  return { items, isLoading: !alunos || !cobrancas || !aulas };
}
