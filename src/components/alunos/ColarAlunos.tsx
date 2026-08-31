import { useMemo, useState } from "react";
import { ClipboardPaste, AlertCircle, Copy, Download, Upload } from "lucide-react";
import {
  CSV_TEMPLATE,
  parseAlunosColados,
  ROTULO_PAPEL,
  type AlunoImportRow,
  type PapelColuna,
} from "@/lib/csv";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { nomeDiaSemanaCurto } from "@/lib/constants";
import { fmtBRLCompacto } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ColarAlunosProps {
  /** Alunos já cadastrados, pra marcar duplicata. */
  existentes?: { nome: string; telefone: string | null }[];
  /** Recebe as linhas prontas pra importar (já sem duplicata nem sem-nome). */
  onChange: (linhas: AlunoImportRow[]) => void;
  className?: string;
}

const PAPEIS_ESCOLHIVEIS: PapelColuna[] = [
  "nome",
  "instrumento",
  "telefone",
  "dia_semana",
  "horario",
  "duracao_minutos",
  "valor_mensalidade",
  "ignorada",
];

/**
 * Import por colagem — o caminho principal pra quem já tem a turma numa
 * planilha.
 *
 * O import por arquivo exige baixar um modelo, preencher e subir. Quem tem 25
 * alunos no Excel quer selecionar, copiar e colar. Aqui o separador (TAB, `;`
 * ou `,`), o cabeçalho e a ORDEM das colunas são detectados sozinhos — e
 * quando a detecção erra, o professor corrige a coluna num select em vez de
 * reformatar a planilha.
 */
export const ColarAlunos = ({
  existentes = [],
  onChange,
  className,
}: ColarAlunosProps) => {
  const [texto, setTexto] = useState("");
  const [arquivoNome, setArquivoNome] = useState("");
  /** Correções manuais de coluna, por índice. */
  const [override, setOverride] = useState<Record<number, PapelColuna>>({});

  const base = useMemo(
    () => parseAlunosColados(texto, existentes),
    [texto, existentes],
  );

  const papeis = useMemo(
    () => base.papeis.map((p, i) => override[i] ?? p),
    [base.papeis, override],
  );

  // Reprocessa com os papéis corrigidos, remontando o texto na ordem esperada.
  const resultado = useMemo(() => {
    if (Object.keys(override).length === 0) return base;
    const cabecalho = papeis
      .map((p) => (p === "ignorada" ? "ignorar" : ROTULO_PAPEL[p]))
      .join("\t");
    const corpo = texto
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0);
    const semCabecalho = base.tinhaCabecalho ? corpo.slice(1) : corpo;
    const sep = base.separador === "tab" ? "\t" : base.separador;
    const normalizado = [
      cabecalho,
      ...semCabecalho.map((l) => l.split(sep).join("\t")),
    ].join("\n");
    return parseAlunosColados(normalizado, existentes);
  }, [base, override, papeis, texto, existentes]);

  const linhas = resultado.linhas;
  const prontas = linhas.filter((l) => !l.errors.length && !l.duplicado);
  const duplicadas = linhas.filter((l) => l.duplicado && !l.errors.length);
  const semNome = linhas.filter((l) => l.errors.length > 0);
  const semHorario = prontas.filter((l) => l.horarios.length === 0).length;

  const atualizar = (novoTexto: string, origem: "arquivo" | "manual" = "manual") => {
    if (origem === "manual") setArquivoNome("");
    setTexto(novoTexto);
    setOverride({});
    const r = parseAlunosColados(novoTexto, existentes);
    onChange(r.linhas.filter((l) => !l.errors.length && !l.duplicado));
  };

  const importarArquivo = async (file: File | null) => {
    if (!file) return;
    const conteudo = await file.text();
    setArquivoNome(file.name);
    atualizar(conteudo, "arquivo");
  };

  const baixarModelo = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-alunos-studoo.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const corrigirColuna = (indice: number, papel: PapelColuna) => {
    const novo = { ...override, [indice]: papel };
    setOverride(novo);
    // Recalcula já com a correção pra avisar o pai na hora.
    queueMicrotask(() => {
      const atual = base.papeis.map((p, i) => novo[i] ?? p);
      const cabecalho = atual
        .map((p) => (p === "ignorada" ? "ignorar" : ROTULO_PAPEL[p]))
        .join("\t");
      const corpo = texto
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0);
      const semCab = base.tinhaCabecalho ? corpo.slice(1) : corpo;
      const sep = base.separador === "tab" ? "\t" : base.separador;
      const r = parseAlunosColados(
        [cabecalho, ...semCab.map((l) => l.split(sep).join("\t"))].join("\n"),
        existentes,
      );
      onChange(r.linhas.filter((l) => !l.errors.length && !l.duplicado));
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <label
          htmlFor="colar-alunos"
          className="block text-[13px] font-medium mb-1.5"
        >
          Importe ou cole sua lista
        </label>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] mb-2">
          <label
            className={cn(
              "flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-[hsl(var(--border-field)/0.78)]",
              "bg-input/55 px-3 py-2 text-sm text-muted-foreground transition-[background-color,border-color,box-shadow]",
              "hover:border-primary/70 hover:text-foreground",
              "focus-within:outline-none focus-within:border-primary/70 focus-within:bg-background focus-within:ring-2 focus-within:ring-[hsl(var(--primary)/0.18)]",
            )}
          >
            <Upload className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 truncate">
              {arquivoNome || "Selecionar arquivo CSV"}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                void importarArquivo(e.currentTarget.files?.[0] ?? null);
                e.currentTarget.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={baixarModelo}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[hsl(var(--border-field)/0.78)]",
              "bg-input/55 px-3 text-sm font-medium text-foreground transition-[background-color,border-color,box-shadow]",
              "hover:border-primary/70 hover:bg-secondary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.18)]",
            )}
          >
            <Download className="h-4 w-4" />
            Modelo CSV
          </button>
        </div>
        <textarea
          id="colar-alunos"
          value={texto}
          onChange={(e) => atualizar(e.target.value)}
          rows={texto ? 4 : 6}
          spellCheck={false}
          placeholder={
            "Selecione as linhas na sua planilha, copie (Ctrl+C) e cole aqui.\n\n" +
            "Marina Souza\tViolão\t(11) 99999-1234\tSegunda\t14:00\t350\n" +
            "João Alves\tPiano\t(11) 98888-7777\tTerça\t15:30\t400"
          }
          className={cn(
            "w-full rounded-md border border-[hsl(var(--border-field)/0.78)] bg-input/55 px-3 py-2.5 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)]",
            "font-mono text-[12.5px] leading-relaxed placeholder:text-muted-foreground/70",
            "hover:border-[hsl(var(--border-field))] hover:bg-input/75",
            "focus-visible:outline-none focus-visible:border-primary/70 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.18)]",
            "transition-[background-color,border-color,box-shadow] resize-y",
          )}
        />
        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
          <Copy className="h-3 w-3 shrink-0" />
          Aceita CSV, Excel, Google Sheets, Numbers ou texto separado por
          vírgula, ponto-e-vírgula ou tabulação. Só o nome é obrigatório.
        </p>
      </div>

      {linhas.length > 0 && (
        <>
          {/* Como o Studoo entendeu cada coluna — e como corrigir. */}
          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted-foreground mb-2">
              Entendi assim {base.tinhaCabecalho && "(pelo cabeçalho)"}
            </p>
            <div className="flex flex-wrap gap-2">
              {papeis.map((papel, i) => (
                <Select
                  key={i}
                  value={papel}
                  onValueChange={(v) => corrigirColuna(i, v as PapelColuna)}
                >
                  <SelectTrigger
                    aria-label={`Coluna ${i + 1}: ${ROTULO_PAPEL[papel]}`}
                    className={cn(
                      "h-8 w-auto min-w-[112px] text-[12px] px-2.5",
                      papel === "ignorada" && "text-muted-foreground",
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPEIS_ESCOLHIVEIS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p === "ignorada" ? "Ignorar coluna" : ROTULO_PAPEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Resumo n={prontas.length} rotulo="prontos" tom="ok" />
            <Resumo n={duplicadas.length} rotulo="já existem" tom="warn" />
            <Resumo n={semNome.length} rotulo="sem nome" tom="danger" />
          </div>

          {semHorario > 0 && (
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-px text-warning" />
              {semHorario} sem dia/horário — vão entrar mesmo assim, e você
              define o horário depois no perfil de cada um.
            </p>
          )}

          <div className="border border-border rounded-lg divide-y divide-border/60 max-h-[240px] overflow-y-auto">
            {linhas.slice(0, 60).map((l, i) => {
              const h = l.horarios[0];
              const bloqueada = l.errors.length > 0 || l.duplicado;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-[13px]",
                    bloqueada && "opacity-55",
                  )}
                >
                  <span className="flex-1 min-w-0 truncate font-medium">
                    {l.nome || <em className="text-destructive">sem nome</em>}
                  </span>
                  <span className="text-muted-foreground truncate hidden sm:block w-24">
                    {l.instrumento || "—"}
                  </span>
                  <span className="font-mono text-[11.5px] text-muted-foreground w-24 shrink-0">
                    {h ? `${nomeDiaSemanaCurto(h.dia_semana)} ${h.horario}` : "—"}
                  </span>
                  <span className="font-mono text-[11.5px] tabular-nums w-16 text-right shrink-0">
                    {l.valor_mensalidade
                      ? fmtBRLCompacto(l.valor_mensalidade)
                      : "—"}
                  </span>
                  {l.duplicado && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-warning shrink-0">
                      já existe
                    </span>
                  )}
                </div>
              );
            })}
            {linhas.length > 60 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                +{linhas.length - 60} linhas não mostradas aqui, mas serão
                importadas.
              </p>
            )}
          </div>
        </>
      )}

      {texto.trim().length > 0 && linhas.length === 0 && (
        <p className="text-sm text-muted-foreground flex items-start gap-2">
          <ClipboardPaste className="h-4 w-4 shrink-0 mt-0.5" />
          Não consegui achar nenhuma linha aí. Cole as linhas da planilha
          direto, uma por aluno.
        </p>
      )}
    </div>
  );
};

const Resumo = ({
  n,
  rotulo,
  tom,
}: {
  n: number;
  rotulo: string;
  tom: "ok" | "warn" | "danger";
}) => (
  <div
    className={cn(
      "rounded-lg px-3 py-2",
      tom === "ok" && "bg-success-soft",
      tom === "warn" && "bg-warning-soft",
      tom === "danger" && "bg-destructive-soft",
    )}
  >
    <p
      className={cn(
        "font-mono text-[20px] font-bold tabular-nums tracking-[-0.02em] leading-none",
        tom === "ok" && "text-success",
        tom === "warn" && "text-warning",
        tom === "danger" && "text-destructive",
      )}
    >
      {n}
    </p>
    <p className="text-[11px] text-muted-foreground mt-1">{rotulo}</p>
  </div>
);
