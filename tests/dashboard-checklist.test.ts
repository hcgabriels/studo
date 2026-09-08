import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const dashboard = readFileSync(join(projectRoot, "src/pages/Dashboard.tsx"), "utf8");

describe("dashboard onboarding checklist", () => {
  it("não renderiza o checklist antes dos alunos carregarem", () => {
    expect(dashboard).toContain(
      "const checklistPronto = !!professor && !alunosLoading && !!alunos;",
    );
    expect(dashboard).toContain("{checklistPronto && (");
    expect(dashboard).toContain(
      "<OnboardingChecklist professor={professor} alunos={alunos} />",
    );
    expect(dashboard).not.toContain(
      "<OnboardingChecklist professor={professor} alunos={alunos ?? []} />",
    );
  });
});
