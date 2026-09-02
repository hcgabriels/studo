import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

const readProjectFile = (path: string) =>
  readFileSync(join(projectRoot, path), "utf8");

const migrationName = readdirSync(
  join(projectRoot, "supabase/migrations"),
).find((name) => name.endsWith("_transactional_lesson_workflows.sql"));

if (!migrationName) {
  throw new Error("Migração transactional_lesson_workflows não encontrada");
}

const migration = readProjectFile(`supabase/migrations/${migrationName}`);
const agenda = readProjectFile("src/pages/Agenda.tsx");

const convertTrialMigrationName = readdirSync(
  join(projectRoot, "supabase/migrations"),
).find((name) => name.endsWith("_convert_trial_transactionally.sql"));

if (!convertTrialMigrationName) {
  throw new Error("Migração convert_trial_transactionally não encontrada");
}

const convertTrialMigration = readProjectFile(
  `supabase/migrations/${convertTrialMigrationName}`,
);

const studentMigrationName = readdirSync(
  join(projectRoot, "supabase/migrations"),
).find((name) => name.endsWith("_save_student_with_schedules.sql"));

if (!studentMigrationName) {
  throw new Error("Migração save_student_with_schedules não encontrada");
}

const studentMigration = readProjectFile(
  `supabase/migrations/${studentMigrationName}`,
);
const studentForm = readProjectFile("src/components/shared/AlunoForm.tsx");

const importMigrationName = readdirSync(
  join(projectRoot, "supabase/migrations"),
).find((name) => name.endsWith("_import_students_transactionally.sql"));

if (!importMigrationName) {
  throw new Error("Migração import_students_transactionally não encontrada");
}

const importMigration = readProjectFile(
  `supabase/migrations/${importMigrationName}`,
);
const studentsPage = readProjectFile("src/pages/Alunos.tsx");
const onboardingPage = readProjectFile("src/pages/Onboarding.tsx");
const packagesTab = readProjectFile("src/components/shared/PacotesTab.tsx");

const onboardingMigrationName = readdirSync(
  join(projectRoot, "supabase/migrations"),
).find((name) => name.endsWith("_finalize_onboarding_transactionally.sql"));

if (!onboardingMigrationName) {
  throw new Error("Migração finalize_onboarding_transactionally não encontrada");
}

const onboardingMigration = readProjectFile(
  `supabase/migrations/${onboardingMigrationName}`,
);

describe("fluxos transacionais de aula", () => {
  it("versiona RPCs atômicas com trava e identidade derivada do JWT", () => {
    for (const functionName of [
      "registrar_aula",
      "criar_aula_avulsa",
      "reagendar_aula",
    ]) {
      expect(migration).toMatch(
        new RegExp(`function\\s+public\\.${functionName}\\s*\\(`, "i"),
      );
    }

    expect(migration.match(/private\.meu_professor_id\(\)/g)).toHaveLength(3);
    expect(migration).toMatch(/for\s+update/i);
    expect(migration).toMatch(/reposicoes_disponiveis\s*>\s*0/i);
  });

  it("não expõe as operações sensíveis ao papel anônimo", () => {
    expect(migration.match(/revoke\s+all\s+on\s+function/gi)).toHaveLength(3);
    expect(migration).not.toMatch(
      /grant\s+execute\s+on\s+function[\s\S]{0,200}\bto\s+anon\b/i,
    );
  });

  it("agenda usa somente as RPCs transacionais, sem fallback parcial", () => {
    for (const functionName of [
      "registrar_aula",
      "criar_aula_avulsa",
      "reagendar_aula",
    ]) {
      expect(agenda).toContain(`supabase.rpc("${functionName}"`);
    }

    expect(agenda).toContain("p_data_original: slot.date.toISOString()");
    expect(agenda).not.toContain("ajustarReposicao");
    expect(agenda).not.toContain("fallback não-transacional");
    expect(agenda).not.toContain("fallback não-atômico");
  });

  it("conversão de trial cria aluno, recorrência e vínculo numa transação", () => {
    expect(convertTrialMigration).toMatch(
      /function\s+public\.converter_aula_experimental\s*\(/i,
    );
    expect(convertTrialMigration).toMatch(/from\s+public\.aulas[\s\S]*for\s+update/i);
    expect(convertTrialMigration).toMatch(/insert\s+into\s+public\.alunos/i);
    expect(convertTrialMigration).toMatch(/insert\s+into\s+public\.aulas_recorrentes/i);
    expect(convertTrialMigration).toMatch(
      /update\s+public\.aulas[\s\S]*set\s+aluno_id\s*=\s*novo_aluno_id/i,
    );
    expect(agenda).toContain('supabase.rpc("converter_aula_experimental"');

    const converterModal = agenda.slice(
      agenda.indexOf("const ConverterTrialModal"),
      agenda.indexOf("const NovaAulaModal"),
    );
    expect(converterModal).not.toContain('.from("alunos")');
    expect(converterModal).not.toContain('.from("aulas_recorrentes")');
    expect(converterModal).not.toContain('tipo: "avulsa"');
  });

  it("cadastro e edição salvam perfil e grade do aluno juntos", () => {
    expect(studentMigration).toMatch(
      /function\s+public\.salvar_aluno_com_horarios\s*\(/i,
    );
    expect(studentMigration).toMatch(/insert\s+into\s+public\.alunos/i);
    expect(studentMigration).toMatch(/update\s+public\.alunos/i);
    expect(studentMigration).toMatch(/for\s+update/i);
    expect(studentMigration).toMatch(
      /perform\s+public\.salvar_horarios_aluno\s*\(/i,
    );
    expect(studentForm).toContain('supabase.rpc("salvar_aluno_com_horarios"');
    expect(studentForm).not.toContain('.from("alunos")');
    expect(studentForm).not.toContain("fallback não transacional");
  });

  it("importação em lote preserva vínculo estrutural entre aluno e horários", () => {
    expect(importMigration).toMatch(/function\s+public\.importar_alunos\s*\(/i);
    expect(importMigration).toMatch(/jsonb_agg\s*\([\s\S]*gen_random_uuid\(\)/i);
    expect(importMigration.match(/insert\s+into\s+public\.(alunos|aulas_recorrentes)/gi))
      .toHaveLength(2);
    expect(studentsPage).toContain('supabase.rpc("importar_alunos"');
    expect(onboardingPage).not.toContain('supabase.rpc("importar_alunos"');
    expect(studentsPage).not.toContain("indexCreatedAlunos");
    expect(onboardingPage).not.toContain("indexCreatedAlunos");
  });

  it("consumo de pacote não recorre ao valor possivelmente obsoleto do cache", () => {
    expect(packagesTab).toContain('supabase.rpc("usar_aula_pacote"');
    expect(packagesTab).not.toContain("fallback não-atômico");
    expect(packagesTab).not.toContain("const novasUsadas");
  });

  it("onboarding só conclui junto com perfil e alunos e é idempotente", () => {
    expect(onboardingMigration).toMatch(
      /function\s+public\.finalizar_onboarding\s*\(/i,
    );
    expect(onboardingMigration).toMatch(/for\s+update/i);
    expect(onboardingMigration).toMatch(/if\s+already_completed\s+then/i);
    expect(onboardingMigration).toMatch(/public\.importar_alunos\s*\(/i);
    expect(onboardingPage).toContain('supabase.rpc("finalizar_onboarding"');
    expect(onboardingPage).not.toContain("tryUpdate");
    expect(onboardingPage).not.toContain("criarPrimeiroAluno");
  });
});
