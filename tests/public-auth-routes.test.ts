import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const readProjectFile = (path: string) =>
  readFileSync(join(projectRoot, path), "utf8");

describe("rotas públicas conscientes de autenticação", () => {
  it("login e cadastro redirecionam usuário já autenticado para o painel", () => {
    const app = readProjectFile("src/App.tsx");
    const route = readProjectFile("src/components/shared/PublicOnlyRoute.tsx");

    expect(app).toContain("PublicOnlyRoute");
    expect(route).toContain('if (user) return <Navigate to="/dashboard" replace />');
  });

  it("landing troca CTAs quando há sessão ativa", () => {
    const index = readProjectFile("src/pages/Index.tsx");

    expect(index).toContain("useAuth");
    expect(index).toContain("Você está logado");
    expect(index).toContain("Abrir painel");
    expect(index).toContain("Minha agenda");
    expect(index).toContain("Continuar no Studoo");
  });

  it("smoke de produção cobre retorno da landing ao painel sem novo login", () => {
    const smoke = readProjectFile("tests/live-smoke.mjs");

    expect(smoke).toContain('stage("landing reconhece sessão ativa")');
    expect(smoke).toContain('getByRole("button", { name: "Abrir painel" })');
  });
});
