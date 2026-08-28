import { useMemo } from "react";
import { Lock } from "lucide-react";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  getMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { cn } from "@/lib/utils";
import type { Aluno, Aula, AulaRecorrente } from "@/types/supabase";

const DIAS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export interface MonthSlot {
  alunoNome: string;
  alunoIniciais: string;
  alunoId: string;
  status:
    | "agendada"
    | "realizada"
    | "falta_justificada"
    | "falta_sem_aviso"
    | "cancelada_professor"
    | "reagendada";
  tipo: "recorrente" | "avulsa" | "experimental";
  date: Date;
}

interface AgendaMensalProps {
  monthBase: Date;
  alunos: Aluno[];
  recorrentes: AulaRecorrente[];
  aulas: Aula[];
  buildSlotsForDay: (
    day: Date,
    alunos: Aluno[],
    aulas: Aula[],
    recorrentes: AulaRecorrente[]
  ) => Array<{
    aluno: Aluno;
    date: Date;
    existingAula?: Aula;
    isExtra?: boolean;
  }>;
  isDiaBloqueado: (d: Date) => boolean;
  motivoBloqueio: (d: Date) => string | null | undefined;
  onDayClick: (day: Date) => void;
}

const statusColor = (status?: string): string => {
  switch (status) {
    case "realizada":
      return "bg-success";
    case "falta_sem_aviso":
      return "bg-destructive";
    case "falta_justificada":
      return "bg-warning";
    case "reagendada":
      return "bg-muted-foreground/40";
    case "cancelada_professor":
      return "bg-muted-foreground/30";
    default:
      return "bg-primary"; // agendada / sem registro ainda
  }
};

export const AgendaMensal = ({
  monthBase,
  alunos,
  recorrentes,
  aulas,
  buildSlotsForDay,
  isDiaBloqueado,
  motivoBloqueio,
  onDayClick,
}: AgendaMensalProps) => {
  const gridStart = useMemo(
    () => startOfWeek(startOfMonth(monthBase), { weekStartsOn: 0 }),
    [monthBase]
  );
  const gridEnd = useMemo(
    () => endOfWeek(endOfMonth(monthBase), { weekStartsOn: 0 }),
    [monthBase]
  );

  const days = useMemo(() => {
    const out: Date[] = [];
    let cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      out.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    return out;
  }, [gridStart, gridEnd]);

  const currentMonth = getMonth(monthBase);

  // Pré-computa slots por dia (Map yyyy-MM-dd → slots)
  const slotsByDay = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        alunoNome: string;
        alunoIniciais: string;
        alunoId: string;
        status: string;
        tipo: string;
      }>
    >();
    for (const day of days) {
      if (isDiaBloqueado(day)) continue;
      const key = format(day, "yyyy-MM-dd");
      const dailySlots = buildSlotsForDay(day, alunos, aulas, recorrentes);
      map.set(
        key,
        dailySlots.map((s) => ({
          alunoNome: s.aluno.nome,
          alunoIniciais: s.aluno.nome.charAt(0).toUpperCase(),
          alunoId: s.aluno.id,
          status: s.existingAula?.status ?? "agendada",
          tipo: s.existingAula?.tipo ?? "recorrente",
        }))
      );
    }
    return map;
  }, [days, alunos, recorrentes, aulas, buildSlotsForDay, isDiaBloqueado]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header dos dias da semana */}
      <div className="grid grid-cols-7 border-b border-border">
        {DIAS_SHORT.map((d) => (
          <div
            key={d}
            className="px-2 py-2.5 text-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const isCurrentMonth = getMonth(day) === currentMonth;
          const bloqueado = isDiaBloqueado(day);
          const motivo = motivoBloqueio(day);
          const today = isToday(day);
          const slots = slotsByDay.get(dayKey) ?? [];
          const visibleSlots = slots.slice(0, 3);
          const extras = slots.length - visibleSlots.length;
          // Última coluna da linha (sábado) e última linha → sem border-r/b
          const isLastCol = (idx + 1) % 7 === 0;
          const isLastRow = idx >= days.length - 7;

          return (
            <button
              key={dayKey}
              onClick={() => onDayClick(day)}
              className={cn(
                "relative text-left min-h-[80px] sm:min-h-[110px] p-1.5 sm:p-2 transition-colors group",
                !isLastCol && "border-r border-border/50",
                !isLastRow && "border-b border-border/50",
                !isCurrentMonth && "bg-muted/20 opacity-60",
                bloqueado && "bg-muted/40",
                today && !bloqueado && "bg-warning/5 ring-1 ring-warning/40 ring-inset",
                "hover:bg-accent/30"
              )}
              aria-label={`${format(day, "dd 'de' MMMM")} - ${slots.length} aula${slots.length !== 1 ? "s" : ""}`}
            >
              {/* Número do dia */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs sm:text-sm font-semibold tabular-nums",
                    today && "text-warning",
                    !isCurrentMonth && "text-muted-foreground/60"
                  )}
                >
                  {format(day, "d")}
                </span>
                {bloqueado && (
                  <Lock
                    className="h-3 w-3 text-muted-foreground"
                    aria-label={motivo ?? "Bloqueado"}
                  />
                )}
              </div>

              {/* Chips de aulas */}
              {bloqueado ? (
                motivo && (
                  <p className="hidden sm:block text-[10px] text-muted-foreground italic truncate">
                    {motivo}
                  </p>
                )
              ) : slots.length === 0 ? null : (
                <>
                  {/* Desktop: chips com nome */}
                  <div className="hidden sm:block space-y-0.5">
                    {visibleSlots.map((s, i) => (
                      <div
                        key={`${s.alunoId}-${i}`}
                        className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] truncate",
                          s.status === "realizada"
                            ? "bg-success/15 text-success"
                            : s.status === "falta_sem_aviso"
                            ? "bg-destructive/15 text-destructive"
                            : s.status === "falta_justificada"
                            ? "bg-warning/15 text-warning"
                            : s.status === "reagendada"
                            ? "bg-muted text-muted-foreground line-through"
                            : "bg-primary/15 text-primary"
                        )}
                      >
                        <span className="truncate font-medium">
                          {s.alunoNome.split(" ")[0]}
                        </span>
                      </div>
                    ))}
                    {extras > 0 && (
                      <div className="text-[10px] text-muted-foreground px-1.5 font-medium">
                        +{extras} mais
                      </div>
                    )}
                  </div>

                  {/* Mobile: só dots coloridos */}
                  <div className="sm:hidden flex flex-wrap gap-0.5 mt-1">
                    {slots.slice(0, 8).map((s, i) => (
                      <span
                        key={i}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          statusColor(s.status)
                        )}
                      />
                    ))}
                    {slots.length > 8 && (
                      <span className="text-[9px] text-muted-foreground leading-none">
                        +{slots.length - 8}
                      </span>
                    )}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
