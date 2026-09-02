import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

const readProjectFile = (path: string) =>
  readFileSync(join(projectRoot, path), "utf8");

const integrityMigrationName = readdirSync(
  join(projectRoot, "supabase/migrations"),
).find((name) => name.endsWith("_restore_integrity_constraints.sql"));

if (!integrityMigrationName) {
  throw new Error("Migração restore_integrity_constraints não encontrada");
}

const integrityMigration = readProjectFile(
  `supabase/migrations/${integrityMigrationName}`,
);

const optionalScheduleMigrationName = readdirSync(
  join(projectRoot, "supabase/migrations"),
).find((name) => name.endsWith("_allow_students_without_schedule.sql"));

if (!optionalScheduleMigrationName) {
  throw new Error("Migração allow_students_without_schedule não encontrada");
}

const optionalScheduleMigration = readProjectFile(
  `supabase/migrations/${optionalScheduleMigrationName}`,
);

const reconciliationMigrationName = readdirSync(
  join(projectRoot, "supabase/migrations"),
).find((name) => name.endsWith("_reconcile_live_schema.sql"));

if (!reconciliationMigrationName) {
  throw new Error("Migração reconcile_live_schema não encontrada");
}

const reconciliationMigration = readProjectFile(
  `supabase/migrations/${reconciliationMigrationName}`,
);

const accessHardeningMigrationName = readdirSync(
  join(projectRoot, "supabase/migrations"),
).find((name) => name.endsWith("_harden_database_access.sql"));

if (!accessHardeningMigrationName) {
  throw new Error("Migração harden_database_access não encontrada");
}

const accessHardeningMigration = readProjectFile(
  `supabase/migrations/${accessHardeningMigrationName}`,
);

describe("integridade do schema Supabase", () => {
  it("não remove as constraints exigidas pelos upserts", () => {
    const hardening = readProjectFile("sql/2026-08-hardening.sql");

    expect(hardening).not.toMatch(
      /drop\s+constraint\s+(?:if\s+exists\s+)?cobrancas_aluno_mes_unique/i,
    );
    expect(hardening).not.toMatch(
      /drop\s+constraint\s+(?:if\s+exists\s+)?professores_user_id_unique/i,
    );
  });

  it("restaura um perfil por usuário e uma cobrança por aluno/mês", () => {
    expect(integrityMigration).toMatch(
      /unique\s*\(\s*user_id\s*\)/i,
    );
    expect(integrityMigration).toMatch(
      /unique\s*\(\s*aluno_id\s*,\s*mes_referencia\s*\)/i,
    );
  });

  it("aborta em duplicatas sem apagar dados", () => {
    expect(integrityMigration).toMatch(/having\s+count\(\*\)\s*>\s*1/gi);
    expect(integrityMigration).toMatch(/raise\s+exception/gi);
    expect(integrityMigration).not.toMatch(/delete\s+from/i);
  });

  it("permite representar aluno sem horário sem inventar uma recorrência", () => {
    expect(optionalScheduleMigration).toMatch(
      /alter\s+column\s+dia_semana\s+drop\s+not\s+null/i,
    );
    expect(optionalScheduleMigration).toMatch(
      /alter\s+column\s+horario\s+drop\s+not\s+null/i,
    );
  });

  it("versiona as quatro tabelas que antes só existiam por SQL manual", () => {
    for (const table of [
      "bloqueios_data",
      "aulas_recorrentes",
      "pacotes_aulas",
      "mensagens_enviadas",
    ]) {
      expect(reconciliationMigration).toMatch(
        new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}`, "i"),
      );
    }
  });

  it("não recria horários legados quando dia ou hora estão ausentes", () => {
    expect(reconciliationMigration).toMatch(/dia_semana\s+is\s+not\s+null/i);
    expect(reconciliationMigration).toMatch(/horario\s+is\s+not\s+null/i);
  });

  it("remove acesso anônimo e limita authenticated a CRUD", () => {
    expect(accessHardeningMigration).toMatch(
      /revoke\s+all\s+privileges\s+on\s+table[\s\S]*from\s+anon\s*,\s*authenticated/i,
    );
    expect(accessHardeningMigration).toMatch(
      /grant\s+select\s*,\s*insert\s*,\s*update\s*,\s*delete\s+on\s+table[\s\S]*to\s+authenticated/i,
    );
    expect(accessHardeningMigration).not.toMatch(
      /grant\s+[\s\S]{0,120}\s+on\s+table[\s\S]{0,400}\s+to\s+anon/i,
    );
  });

  it("valida que entidades com aluno pertencem ao mesmo professor", () => {
    expect(accessHardeningMigration.match(/aluno\.professor_id\s*=\s*private\.meu_professor_id\(\)/gi))
      .toHaveLength(10);
    expect(accessHardeningMigration).toMatch(/referências entre professores/i);
    expect(accessHardeningMigration).toMatch(/aula\.professor_id\s*<>\s*aluno\.professor_id/i);
    expect(accessHardeningMigration).not.toMatch(
      /delete\s+from\s+public\.(aulas|cobrancas|aulas_recorrentes|pacotes_aulas|mensagens_enviadas)\s+as/i,
    );
  });

  it("RPCs derivam o professor da identidade autenticada", () => {
    expect(accessHardeningMigration).toMatch(
      /authenticated_professor_id\s+uuid\s*:=\s*private\.meu_professor_id\(\)/i,
    );
    expect(accessHardeningMigration).toMatch(
      /p_professor_id\s+is\s+distinct\s+from\s+authenticated_professor_id/i,
    );
    expect(accessHardeningMigration).toMatch(
      /values\s*\([\s\S]*authenticated_professor_id[\s\S]*p_nova_data/i,
    );
  });

  it("mantém o schema declarativo em least privilege", () => {
    const tableSchemaDirectory = join(
      projectRoot,
      "supabase/schemas/public/tables",
    );
    const tableSchemas = readdirSync(tableSchemaDirectory)
      .filter((name) => name.endsWith(".sql"))
      .map((name) => readFileSync(join(tableSchemaDirectory, name), "utf8"))
      .join("\n");

    expect(tableSchemas).not.toMatch(/grant[^;]+on\s+table[^;]+to[^;]+anon/i);
    expect(tableSchemas).not.toMatch(
      /grant[^;]+truncate[^;]+to[^;]+authenticated/i,
    );
    expect(tableSchemas.match(/grant\s+select\s*,\s*insert\s*,\s*update\s*,\s*delete\s+on\s+table/gi))
      .toHaveLength(8);
    expect(readProjectFile("supabase/config.toml")).toMatch(
      /schema_paths\s*=\s*\["\.\/schemas\/\*\*\/\*\.sql"\]/,
    );
  });
});
