/**
 * Parser CSV minimalista (RFC 4180-ish):
 * - separador vírgula ou ponto-e-vírgula (autodetectado)
 * - aspas duplas pra campos com vírgula
 * - quebras de linha dentro de aspas suportadas
 */
export const parseCSV = (text: string): string[][] => {
  const stripped = text.replace(/^\uFEFF/, "");
  const firstLine = stripped.split(/\r?\n/)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >
    (firstLine.match(/,/g)?.length ?? 0)
    ? ";"
    : ",";

  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (inQuotes) {
      if (ch === '"') {
        if (stripped[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === sep) {
        cur.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && stripped[i + 1] === "\n") i++;
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
};

const DIA_MAP: Record<string, number> = {
  "domingo": 0, "dom": 0,
  "segunda": 1, "seg": 1, "segunda-feira": 1,
  "terça": 2, "ter": 2, "terca": 2, "terça-feira": 2, "terca-feira": 2,
  "quarta": 3, "qua": 3, "quarta-feira": 3,
  "quinta": 4, "qui": 4, "quinta-feira": 4,
  "sexta": 5, "sex": 5, "sexta-feira": 5,
  "sábado": 6, "sab": 6, "sabado": 6, "sáb": 6,
};

export const parseDiaSemana = (value: string): number | null => {
  const v = value.trim().toLowerCase();
  if (v === "") return null;
  if (/^[0-6]$/.test(v)) return parseInt(v);
  return DIA_MAP[v] ?? null;
};

export const parseHorario = (value: string): string | null => {
  const v = value.trim();
  // 14:30, 14h30, 14h
  const m1 = v.match(/^(\d{1,2})[h:](\d{2})?/);
  if (m1) {
    const h = m1[1].padStart(2, "0");
    const min = (m1[2] ?? "00").padStart(2, "0");
    return `${h}:${min}`;
  }
  if (/^\d{1,2}$/.test(v)) return `${v.padStart(2, "0")}:00`;
  return null;
};

export const parseValor = (value: string): number | null => {
  if (!value.trim()) return null;
  const cleaned = value
    .replace(/R\$\s*/i, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  const n = parseFloat(cleaned);
  if (isNaN(n) || n < 0) return null;
  return n;
};

export const parseTelefone = (value: string): string | null => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return digits;
  return null;
};

export interface AlunoImportHorario {
  dia_semana: number;
  horario: string;
  duracao_minutos: number;
}

export interface AlunoImportRow {
  nome: string;
  instrumento: string;
  telefone: string | null;
  horarios: AlunoImportHorario[];
  valor_mensalidade: number;
  errors: string[];
  duplicado?: boolean;
}

export const CSV_TEMPLATE = `Nome,Instrumento,Telefone,Dia,Horário,Duração (min),Dia 2,Horário 2,Duração 2,Mensalidade
Maria Silva,Violão,(11) 99999-9999,Segunda,14:00,60,,,,250.00
João Souza,Piano,11999998888,Terça,15:30,45,Quinta,15:30,45,400.00
`;

const HEADER_ALIASES: Record<string, string[]> = {
  nome: ["nome", "aluno", "name"],
  instrumento: ["instrumento", "instrument"],
  telefone: ["telefone", "celular", "phone", "tel", "whatsapp"],
  dia_semana: ["dia", "dia da semana", "dia_semana", "weekday", "dia 1"],
  horario: ["horário", "horario", "hora", "time", "horário 1", "horario 1"],
  duracao_minutos: ["duração", "duracao", "duração (min)", "duracao (min)", "duration", "duração 1"],
  dia_semana_2: ["dia 2", "dia_semana_2"],
  horario_2: ["horário 2", "horario 2"],
  duracao_minutos_2: ["duração 2", "duracao 2", "duração (min) 2"],
  dia_semana_3: ["dia 3", "dia_semana_3"],
  horario_3: ["horário 3", "horario 3"],
  duracao_minutos_3: ["duração 3", "duracao 3"],
  valor_mensalidade: ["mensalidade", "valor", "valor mensalidade", "price"],
};

export const detectColumns = (header: string[]): Record<string, number> => {
  const map: Record<string, number> = {};
  header.forEach((h, i) => {
    const norm = h.trim().toLowerCase();
    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(norm)) {
        map[key] = i;
        break;
      }
    }
  });
  return map;
};

interface ExistingAluno {
  nome: string;
  telefone: string | null;
}

export const alunoImportIdentityKey = (
  nome: string,
  telefone: string | null,
) =>
  `${nome.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}|${telefone ?? ""}`;

export const parseAlunoRows = (
  rows: string[][],
  existentes: ExistingAluno[] = []
): AlunoImportRow[] => {
  if (rows.length < 2) return [];
  const header = rows[0];
  const colMap = detectColumns(header);

  const existentesSet = new Set(
    existentes.map((e) => alunoImportIdentityKey(e.nome, e.telefone))
  );

  return rows.slice(1).map((row) => {
    const get = (key: string) =>
      colMap[key] !== undefined ? row[colMap[key]]?.trim() ?? "" : "";

    const errors: string[] = [];
    const nome = get("nome");
    if (!nome) errors.push("nome obrigatório");
    const instrumento = get("instrumento") || "Outro";
    const telefone = parseTelefone(get("telefone"));

    // Coleta horários (1, 2 e 3)
    const horarios: AlunoImportHorario[] = [];
    for (const suffix of ["", "_2", "_3"]) {
      const dia = parseDiaSemana(get(`dia_semana${suffix}`));
      const hor = parseHorario(get(`horario${suffix}`));
      const dur = get(`duracao_minutos${suffix}`);
      if (dia !== null && hor !== null) {
        horarios.push({
          dia_semana: dia,
          horario: hor,
          duracao_minutos: dur ? parseInt(dur) || 60 : 60,
        });
      } else if (suffix === "" && (dia === null || hor === null)) {
        if (dia === null) errors.push("dia inválido");
        if (hor === null) errors.push("horário inválido");
      }
    }

    if (horarios.length === 0) {
      horarios.push({ dia_semana: 0, horario: "00:00", duracao_minutos: 60 });
    }

    const valor_mensalidade = parseValor(get("valor_mensalidade"));
    if (valor_mensalidade === null || valor_mensalidade === 0)
      errors.push("valor inválido");

    const key = alunoImportIdentityKey(nome, telefone);
    const duplicado = existentesSet.has(key);
    if (nome && !duplicado) existentesSet.add(key);

    return {
      nome,
      instrumento,
      telefone,
      horarios,
      valor_mensalidade: valor_mensalidade ?? 0,
      errors,
      duplicado,
    };
  });
};


// ============================================================================
// COLAR DA PLANILHA
//
// O import por arquivo pressupõe muita coisa: cabeçalho presente, colunas na
// ordem certa, separador `,` ou `;`, mensalidade preenchida. Nada disso
// sobrevive a um Ctrl+V vindo do Excel ou do Google Sheets — que cola TSV, com
// as colunas na ordem que o professor usa e sem cabeçalho nenhum.
//
// A diferença importa pra ativação: o professor cria a conta com 1 aluno e tem
// 25 na planilha. Se colar não funcionar de primeira, ele não volta.
//
// Aqui a regra é ao contrário: só o NOME é obrigatório. Dia, horário, telefone
// e valor entram se derem pra entender, e o que faltar vira aviso — não erro.
// ============================================================================

/** Detecta o separador dominante, incluindo TAB (o que a planilha cola). */
const detectarSeparador = (texto: string): string => {
  const linha = texto.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const contagem: Array<[string, number]> = [
    ["\t", (linha.match(/\t/g) ?? []).length],
    [";", (linha.match(/;/g) ?? []).length],
    [",", (linha.match(/,/g) ?? []).length],
  ];
  contagem.sort((a, b) => b[1] - a[1]);
  return contagem[0][1] > 0 ? contagem[0][0] : "\t";
};

/** Split respeitando aspas, com separador explícito. */
const splitLinhas = (texto: string, sep: string): string[][] => {
  const limpo = texto.replace(/^\uFEFF/, "");
  const linhas: string[][] = [];
  let atual: string[] = [];
  let campo = "";
  let aspas = false;

  for (let i = 0; i < limpo.length; i++) {
    const ch = limpo[i];
    if (aspas) {
      if (ch === '"') {
        if (limpo[i + 1] === '"') { campo += '"'; i++; }
        else aspas = false;
      } else campo += ch;
    } else if (ch === '"') {
      aspas = true;
    } else if (ch === sep) {
      atual.push(campo); campo = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && limpo[i + 1] === "\n") i++;
      atual.push(campo); linhas.push(atual); atual = []; campo = "";
    } else campo += ch;
  }
  if (campo.length > 0 || atual.length > 0) { atual.push(campo); linhas.push(atual); }
  return linhas.filter((l) => l.some((c) => c.trim().length > 0));
};

export type PapelColuna =
  | "nome" | "instrumento" | "telefone"
  | "dia_semana" | "horario" | "duracao_minutos" | "valor_mensalidade"
  | "ignorada";

const ehCabecalho = (linha: string[]): boolean => {
  const conhecidas = Object.values(HEADER_ALIASES).flat();
  const bate = linha.filter((c) =>
    conhecidas.includes(c.trim().toLowerCase()),
  ).length;
  return bate >= 2;
};

/**
 * Descobre o papel de cada coluna pelo CONTEÚDO, quando não há cabeçalho.
 * Olha todas as linhas e escolhe o papel que a coluna mais "parece".
 */
const inferirPapeis = (linhas: string[][]): PapelColuna[] => {
  const nCols = Math.max(...linhas.map((l) => l.length));
  const papeis: PapelColuna[] = [];
  const usados = new Set<PapelColuna>();

  const pontuar = (celulas: string[]) => {
    const preenchidas = celulas.filter((c) => c.trim().length > 0);
    const taxa = (fn: (c: string) => boolean) =>
      preenchidas.length === 0
        ? 0
        : preenchidas.filter(fn).length / preenchidas.length;

    return {
      dia_semana: taxa((c) => parseDiaSemana(c) !== null && !/^\d+$/.test(c.trim())),
      horario: taxa((c) => /^\d{1,2}\s*[h:]\s*\d{0,2}$/.test(c.trim())),
      telefone: taxa((c) => parseTelefone(c) !== null),
      duracao_minutos: taxa((c) => /^\d{2,3}\s*(min)?$/i.test(c.trim()) && Number(c.replace(/\D/g, "")) <= 240),
      valor_mensalidade: taxa((c) => parseValor(c) !== null && /\d/.test(c)),
      // Nome/instrumento: texto sem dígito. Nome tende a ter 2+ palavras.
      nome: taxa((c) => !/\d/.test(c) && c.trim().split(/\s+/).length >= 2),
      instrumento: taxa((c) => !/\d/.test(c) && c.trim().split(/\s+/).length === 1),
    };
  };

  const candidatos: Array<{ col: number; papel: PapelColuna; score: number }> = [];
  for (let c = 0; c < nCols; c++) {
    const celulas = linhas.map((l) => l[c] ?? "");
    const s = pontuar(celulas);
    for (const [papel, score] of Object.entries(s) as Array<[PapelColuna, number]>) {
      if (score >= 0.6) candidatos.push({ col: c, papel, score });
    }
  }
  // Papel mais confiante primeiro; cada papel e cada coluna usados uma vez só.
  candidatos.sort((a, b) => b.score - a.score);
  const colResolvida = new Map<number, PapelColuna>();
  for (const { col, papel, score } of candidatos) {
    if (colResolvida.has(col) || usados.has(papel)) continue;
    colResolvida.set(col, papel);
    usados.add(papel);
    void score;
  }
  for (let c = 0; c < nCols; c++) {
    papeis.push(colResolvida.get(c) ?? "ignorada");
  }
  // Sem coluna de nome, a 1ª de texto assume — é o campo obrigatório.
  if (!papeis.includes("nome")) {
    const i = papeis.findIndex((p) => p === "instrumento" || p === "ignorada");
    if (i >= 0) papeis[i] = "nome";
  }
  return papeis;
};

export interface ResultadoColagem {
  linhas: AlunoImportRow[];
  /** Papel atribuído a cada coluna, pra UI mostrar como interpretou. */
  papeis: PapelColuna[];
  tinhaCabecalho: boolean;
  separador: "tab" | ";" | ",";
}

/**
 * Interpreta um bloco colado da planilha.
 * Só `nome` é obrigatório; o resto é bônus e o que faltar vira aviso.
 */
export const parseAlunosColados = (
  texto: string,
  existentes: ExistingAluno[] = [],
): ResultadoColagem => {
  const sep = detectarSeparador(texto);
  const linhas = splitLinhas(texto, sep);
  const nomeSep = sep === "\t" ? "tab" : (sep as ";" | ",");

  if (linhas.length === 0) {
    return { linhas: [], papeis: [], tinhaCabecalho: false, separador: nomeSep };
  }

  const temCab = ehCabecalho(linhas[0]);
  const corpo = temCab ? linhas.slice(1) : linhas;

  let papeis: PapelColuna[];
  if (temCab) {
    const mapa = detectColumns(linhas[0]);
    const porIndice = new Map<number, PapelColuna>();
    for (const [papel, idx] of Object.entries(mapa)) {
      porIndice.set(idx as number, papel as PapelColuna);
    }
    papeis = linhas[0].map((_, i) => porIndice.get(i) ?? "ignorada");
  } else {
    papeis = inferirPapeis(corpo);
  }

  const existentesSet = new Set(
    existentes.map((e) => alunoImportIdentityKey(e.nome, e.telefone)),
  );

  const valor = (linha: string[], papel: PapelColuna) => {
    const i = papeis.indexOf(papel);
    return i >= 0 ? (linha[i] ?? "").trim() : "";
  };

  const parsed = corpo.map((linha) => {
    const errors: string[] = [];
    const nome = valor(linha, "nome");
    if (!nome) errors.push("sem nome");

    const dia = parseDiaSemana(valor(linha, "dia_semana"));
    const hor = parseHorario(valor(linha, "horario"));
    const durRaw = valor(linha, "duracao_minutos").replace(/\D/g, "");
    const horarios: AlunoImportHorario[] =
      dia !== null && hor !== null
        ? [{
            dia_semana: dia,
            horario: hor,
            duracao_minutos: durRaw ? Number(durRaw) || 60 : 60,
          }]
        : [];

    const telefone = parseTelefone(valor(linha, "telefone"));
    const mensalidade = parseValor(valor(linha, "valor_mensalidade")) ?? 0;
    const key = alunoImportIdentityKey(nome, telefone);
    const duplicado = nome ? existentesSet.has(key) : false;
    if (nome && !duplicado) existentesSet.add(key);

    return {
      nome,
      instrumento: valor(linha, "instrumento") || "",
      telefone,
      horarios,
      valor_mensalidade: mensalidade,
      errors,
      duplicado,
    } satisfies AlunoImportRow;
  });

  return { linhas: parsed, papeis, tinhaCabecalho: temCab, separador: nomeSep };
};

export const ROTULO_PAPEL: Record<PapelColuna, string> = {
  nome: "Nome",
  instrumento: "Instrumento",
  telefone: "Telefone",
  dia_semana: "Dia",
  horario: "Horário",
  duracao_minutos: "Duração",
  valor_mensalidade: "Mensalidade",
  ignorada: "—",
};
