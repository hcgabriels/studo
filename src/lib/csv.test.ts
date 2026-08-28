import { describe, it, expect } from "vitest";
import { parseAlunosColados, parseHorario, parseValor, parseTelefone } from "./csv";

const nomes = (t: string) => parseAlunosColados(t).linhas.map((l) => l.nome);

describe("parseAlunosColados — o que a planilha realmente cola", () => {
  it("Google Sheets / Excel: TSV sem cabeçalho, colunas na ordem comum", () => {
    const r = parseAlunosColados(
      "Marina Souza\tViolão\t(11) 99999-1234\tSegunda\t14:00\t350\n" +
        "João Pedro Alves\tPiano\t11988887777\tTerça\t15:30\t400",
    );
    expect(r.separador).toBe("tab");
    expect(r.tinhaCabecalho).toBe(false);
    expect(r.linhas).toHaveLength(2);

    const [m] = r.linhas;
    expect(m.nome).toBe("Marina Souza");
    expect(m.instrumento).toBe("Violão");
    expect(m.telefone).toBe("11999991234");
    expect(m.horarios[0]).toEqual({
      dia_semana: 1,
      horario: "14:00",
      duracao_minutos: 60,
    });
    expect(m.valor_mensalidade).toBe(350);
    expect(m.errors).toHaveLength(0);
  });

  it("reconhece cabeçalho e não o trata como aluno", () => {
    const r = parseAlunosColados(
      "Nome\tInstrumento\tTelefone\tDia\tHorário\tMensalidade\n" +
        "Carla Mendes\tBateria\t(21) 97777-0000\tsex\t18:00\tR$ 450,00",
    );
    expect(r.tinhaCabecalho).toBe(true);
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0].nome).toBe("Carla Mendes");
    expect(r.linhas[0].valor_mensalidade).toBe(450);
    expect(r.linhas[0].horarios[0].dia_semana).toBe(5);
  });

  it("infere colunas fora de ordem pelo conteúdo", () => {
    // Valor primeiro, nome depois — ninguém organiza a planilha pro app.
    const r = parseAlunosColados(
      "R$ 300,00\tLucas Martins\tquinta\t19:00\n" +
        "R$ 250,00\tPatrícia Nunes\tsegunda\t8h30",
    );
    expect(nomes("R$ 300,00\tLucas Martins\tquinta\t19:00")).toEqual([
      "Lucas Martins",
    ]);
    expect(r.linhas[0].valor_mensalidade).toBe(300);
    expect(r.linhas[1].horarios[0].horario).toBe("08:30");
  });

  it("aceita CSV com vírgula e com ponto-e-vírgula", () => {
    expect(parseAlunosColados("Nome,Instrumento\nSofia Ramos,Violino").separador).toBe(",");
    expect(parseAlunosColados("Nome;Instrumento\nSofia Ramos;Violino").separador).toBe(";");
  });

  it("só o nome é obrigatório — o resto entra vazio", () => {
    const r = parseAlunosColados("Gabriel Silva\nMariana Torres");
    expect(r.linhas).toHaveLength(2);
    expect(r.linhas.every((l) => l.errors.length === 0)).toBe(true);
    expect(r.linhas[0].horarios).toHaveLength(0);
    expect(r.linhas[0].valor_mensalidade).toBe(0);
  });

  it("marca linha sem nome como erro, sem derrubar as outras", () => {
    const r = parseAlunosColados("Ana Souza\tViolão\n\tPiano");
    expect(r.linhas[0].errors).toHaveLength(0);
    expect(r.linhas[1].errors).toContain("sem nome");
  });

  it("marca duplicata contra quem já está cadastrado", () => {
    const r = parseAlunosColados(
      "Marina Souza\tViolão\t(11) 99999-1234\nOutro Aluno\tPiano\t(11) 98888-0000",
      [{ nome: "marina souza", telefone: "11999991234" }],
    );
    expect(r.linhas[0].duplicado).toBe(true);
    expect(r.linhas[1].duplicado).toBe(false);
  });

  it("ignora linhas em branco no meio da colagem", () => {
    expect(nomes("Ana Souza\n\n\nBruno Lima\n")).toEqual([
      "Ana Souza",
      "Bruno Lima",
    ]);
  });

  it("aguenta colagem vazia sem explodir", () => {
    const r = parseAlunosColados("   \n  ");
    expect(r.linhas).toHaveLength(0);
  });
});

describe("parsers de campo", () => {
  it("horário aceita os formatos que a pessoa digita", () => {
    expect(parseHorario("14:00")).toBe("14:00");
    expect(parseHorario("8h30")).toBe("08:30");
    expect(parseHorario("9h")).toBe("09:00");
    expect(parseHorario("9")).toBe("09:00");
    expect(parseHorario("almoço")).toBeNull();
  });

  it("valor aceita R$, ponto de milhar e vírgula decimal", () => {
    expect(parseValor("350")).toBe(350);
    expect(parseValor("R$ 1.250,50")).toBe(1250.5);
    expect(parseValor("")).toBeNull();
    expect(parseValor("de graça")).toBeNull();
  });

  it("telefone só aceita 10 ou 11 dígitos", () => {
    expect(parseTelefone("(11) 99999-1234")).toBe("11999991234");
    expect(parseTelefone("1133334444")).toBe("1133334444");
    expect(parseTelefone("123")).toBeNull();
  });
});
