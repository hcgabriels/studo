import { useMemo } from "react";
import { MoreHorizontal, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { StatusIcon, type StatusVariant } from "@/components/shared/StatusIcon";
import { Button } from "@/components/ui/button";
import { getCobrancaStatus } from "@/lib/cobranca";
import { parseDateOnly } from "@/lib/dates";
import { fmtBRLCompacto } from "@/lib/format";
import { DIAS_SEMANA_SHORT } from "@/lib/constants";
import { getHorariosDoAluno } from "@/hooks/useAulasRecorrentes";
import type { Aluno, AulaRecorrente, Cobranca } from "@/types/supabase";
import { cn } from "@/lib/utils";

interface AlunosTableProps {
  alunos: Aluno[];
  cobrancas: Cobranca[];
  /** Horários recorrentes. Sem isso a tabela cai nos campos legados do aluno. */
  recorrentes?: AulaRecorrente[];
  onClick: (aluno: Aluno) => void;
  onEdit: (aluno: Aluno) => void;
  onToggleStatus: (aluno: Aluno) => void;
}

type CobrStatus = { variant: StatusVariant; title: string };

const statusDaCobranca = (cobranca?: Cobranca): CobrStatus => {
  if (!cobranca) return { variant: "neutral", title: "Sem cobrança" };
  const st = getCobrancaStatus(cobranca);
  if (st === "pago") return { variant: "ok", title: "Em dia" };
  if (st === "atrasado") return { variant: "danger", title: "Atrasada" };
  return { variant: "warn", title: "Pendente" };
};

/**
 * Tabela densa de alunos (`.alunos-table`).
 * Especificação `studoo-screens.css` linhas 212-254.
 */
export const AlunosTable = ({
  alunos,
  cobrancas,
  recorrentes,
  onClick,
  onEdit,
  onToggleStatus,
}: AlunosTableProps) => {
  /**
   * Índice aluno → cobrança mais recente, calculado UMA vez.
   *
   * Antes cada linha filtrava + ordenava o array inteiro de cobranças: com 40
   * alunos e ~1.100 cobranças isso era ~44 mil iterações e 40 sorts por render,
   * repetidos a cada tecla digitada na busca.
   */
  const cobrancaPorAluno = useMemo(() => {
    const map = new Map<string, Cobranca>();
    for (const c of cobrancas) {
      const atual = map.get(c.aluno_id);
      if (
        !atual ||
        parseDateOnly(c.mes_referencia).getTime() >
          parseDateOnly(atual.mes_referencia).getTime()
      ) {
        map.set(c.aluno_id, c);
      }
    }
    return map;
  }, [cobrancas]);

  return (
    <table className="w-full bg-card border border-border rounded-xl rounded-b-none overflow-hidden border-separate border-spacing-0">
      <thead>
        <tr>
          <Th width="32%">Aluno</Th>
          <Th>Instrumento</Th>
          <Th>Nível</Th>
          <Th>Mensalidade</Th>
          <Th>Próxima aula</Th>
          <Th>Cobrança</Th>
          <Th align="right">Ações</Th>
        </tr>
      </thead>
      <tbody>
        {alunos.map((aluno) => {
          const cobr = statusDaCobranca(cobrancaPorAluno.get(aluno.id));
          // Usa os horários recorrentes reais. Com os campos legados, um aluno
          // com dois horários (ou criado via CSV) mostrava dia diferente do
          // que aparecia no card mobile.
          const horarios = getHorariosDoAluno(aluno, recorrentes ?? []);
          const principal = horarios[0];
          const horarioLabel = principal?.horario
            ? `${DIAS_SEMANA_SHORT[principal.dia_semana]} ${principal.horario.slice(0, 5)}`
            : "—";
          const extras = horarios.length - 1;
          const arquivado = aluno.status === "inativo";

          return (
            <tr
              key={aluno.id}
              // Linha clicável precisa ser alcançável por teclado — antes era
              // um <tr onClick> puro, então a tabela inteira era inacessível.
              tabIndex={0}
              role="button"
              aria-label={`Abrir perfil de ${aluno.nome}`}
              onClick={() => onClick(aluno)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick(aluno);
                }
              }}
              className={cn(
                "group cursor-pointer transition-colors hover:bg-secondary/40",
                "focus-visible:outline-none focus-visible:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--ring))]",
                arquivado && "opacity-60",
              )}
            >
              <Td>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={aluno.nome} size="md" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-foreground truncate">
                      {aluno.nome}
                    </span>
                    {aluno.email_notificacao && (
                      <span className="font-mono text-[11.5px] text-muted-foreground truncate">
                        {aluno.email_notificacao}
                      </span>
                    )}
                  </div>
                </div>
              </Td>
              <Td>
                <span className="text-foreground/90">
                  {aluno.instrumento || "—"}
                </span>
              </Td>
              <Td>
                <span className="text-muted-foreground">
                  {aluno.nivel ?? "—"}
                </span>
              </Td>
              <Td>
                <span className="font-mono font-semibold tabular-nums tracking-[-0.02em]">
                  {fmtBRLCompacto(Number(aluno.valor_mensalidade))}
                </span>
              </Td>
              <Td>
                <span className="font-mono text-muted-foreground/90 tabular-nums">
                  {horarioLabel}
                  {extras > 0 && (
                    <span className="ml-1 text-primary">+{extras}</span>
                  )}
                </span>
              </Td>
              <Td>
                <StatusIcon variant={cobr.variant} title={cobr.title} />
              </Td>
              <Td align="right">
                {/* group-focus-within: sem isso, quem navega por teclado tabula
                    pra dentro de botões invisíveis (opacity-0). */}
                <div className="flex justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title="Editar"
                    aria-label={`Editar ${aluno.nome}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(aluno);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title={arquivado ? "Reativar" : "Arquivar"}
                    aria-label={`${arquivado ? "Reativar" : "Arquivar"} ${aluno.nome}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStatus(aluno);
                    }}
                  >
                    {arquivado ? (
                      <ArchiveRestore className="h-3.5 w-3.5" />
                    ) : (
                      <Archive className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title="Mais opções"
                    aria-label={`Mais opções de ${aluno.nome}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick(aluno);
                    }}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const Th = ({
  children,
  align,
  width,
}: {
  children: React.ReactNode;
  align?: "right";
  width?: string;
}) => (
  <th
    style={width ? { width } : undefined}
    className={cn(
      "text-left px-[18px] py-3 bg-secondary border-b border-border",
      "font-mono text-[10.5px] tracking-[0.12em] uppercase font-medium text-muted-foreground whitespace-nowrap",
      align === "right" && "text-right",
    )}
  >
    {children}
  </th>
);

const Td = ({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "right";
}) => (
  <td
    className={cn(
      "px-[18px] border-b border-border/40 text-[13.5px] text-foreground align-middle",
      "h-[var(--row-h)]",
      align === "right" && "text-right",
    )}
  >
    {children}
  </td>
);
