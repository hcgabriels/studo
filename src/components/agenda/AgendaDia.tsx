import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarX, Clock } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { StatusIcon } from "@/components/shared/StatusIcon";
import { SectionCard } from "@/components/shared/SectionCard";
import { getAulaStatusMeta } from "@/lib/aulaStatus";
import { cn } from "@/lib/utils";
import type { Aluno, Aula } from "@/types/supabase";

interface Slot {
  aluno: Aluno;
  date: Date;
  existingAula?: Aula;
  isExtra?: boolean;
}

interface AgendaDiaProps {
  dayBase: Date;
  slots: Slot[];
  bloqueado: boolean;
  motivo?: string;
  onSlotClick: (slot: Slot) => void;
}

export const AgendaDia = ({
  dayBase,
  slots,
  bloqueado,
  motivo,
  onSlotClick,
}: AgendaDiaProps) => {
  const now = new Date();
  const isHoje = format(dayBase, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");

  if (bloqueado) {
    return (
      <SectionCard
        title={format(dayBase, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        description={motivo ?? "Dia bloqueado"}
        icon={CalendarX}
        iconTone="warning"
      >
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhuma aula prevista — este dia está marcado como bloqueado nas suas
          configurações.
        </p>
      </SectionCard>
    );
  }

  if (slots.length === 0) {
    return (
      <SectionCard
        title={format(dayBase, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        description={isHoje ? "Hoje" : "Sem aulas previstas"}
        icon={Clock}
      >
        <p className="text-sm text-muted-foreground py-10 text-center">
          Nenhuma aula neste dia.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={format(dayBase, "EEEE, dd 'de' MMMM", { locale: ptBR })}
      description={`${slots.length} aula${slots.length !== 1 ? "s" : ""}${
        isHoje ? " · hoje" : ""
      }`}
      icon={Clock}
      bodyPadding={false}
    >
      <div className="flex flex-col">
        {slots.map((slot, i) => {
          // Sem registro no banco a aula ainda é só "agendada" — mesmo fallback
          // do vocabulário compartilhado.
          const { iconVariant: variant, label: title } = getAulaStatusMeta(
            slot.existingAula?.status,
          );
          const passou = isPast(slot.date);
          const minsAte = Math.round(
            (slot.date.getTime() - now.getTime()) / 60000,
          );
          const proximaEmBreve =
            isHoje && minsAte > 0 && minsAte <= 60;
          const dur = slot.existingAula?.duracao_minutos ?? slot.aluno.duracao_minutos ?? 50;

          return (
            <button
              key={`${slot.aluno.id}-${slot.date.toISOString()}-${i}`}
              type="button"
              onClick={() => onSlotClick(slot)}
              className={cn(
                "grid items-center gap-4 px-[22px] py-4",
                "grid-cols-[72px_1fr_auto] text-left",
                "border-t border-border/40 first:border-t-0",
                "transition-colors hover:bg-secondary/40",
                passou && !slot.existingAula && "opacity-60",
              )}
            >
              <div className="flex flex-col">
                <span
                  className={cn(
                    "font-mono text-[16px] font-semibold tabular-nums leading-none",
                    proximaEmBreve ? "text-primary" : "text-foreground",
                  )}
                >
                  {format(slot.date, "HH:mm")}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground mt-1">
                  {dur} min
                </span>
              </div>

              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={slot.aluno.nome} size="md" />
                <div className="min-w-0">
                  <div className="text-[14.5px] font-semibold truncate">
                    {slot.aluno.nome}
                  </div>
                  <div className="text-[12.5px] text-muted-foreground truncate">
                    {slot.aluno.instrumento}
                    {slot.aluno.nivel ? ` · ${slot.aluno.nivel}` : ""}
                    {slot.existingAula?.tipo === "experimental"
                      ? " · experimental"
                      : slot.existingAula?.tipo === "avulsa"
                        ? " · avulsa"
                        : ""}
                  </div>
                </div>
              </div>

              <StatusIcon
                variant={proximaEmBreve && variant === "neutral" ? "info" : variant}
                title={proximaEmBreve ? `Em ${minsAte} min` : title}
                showLabel="always"
                className="justify-end"
              />
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
};
