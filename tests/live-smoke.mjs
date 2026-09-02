import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";

const required = [
  "VITE_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "E2E_ALLOW_REMOTE_MUTATION",
];

for (const name of required) {
  assert(process.env[name], `Variável obrigatória ausente: ${name}`);
}

assert.equal(
  process.env.E2E_ALLOW_REMOTE_MUTATION,
  "1",
  "Defina E2E_ALLOW_REMOTE_MUTATION=1 para autorizar a conta descartável",
);

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const artifactDir =
  process.env.E2E_ARTIFACT_DIR ?? path.join("/tmp", "studoo-live-smoke");
const runId = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const email = `codex-e2e-${runId}@example.invalid`;
const password = `E2e-${randomBytes(18).toString("base64url")}!`;
const studentName = `Aluno E2E ${runId.slice(-6)}`;

const admin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: baselineUsersData, error: baselineUsersError } =
  await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (baselineUsersError) throw baselineUsersError;
const baselineUserIds = baselineUsersData.users.map((user) => user.id).sort();

await mkdir(artifactDir, { recursive: true });

let userId;
let professorId;
let browser;
let deletedViaUi = false;
const consoleProblems = [];
const pageErrors = [];
const failedRequests = [];
const mutationResponses = [];
const errorResponses = [];
const stages = [];

const stage = (name) => {
  stages.push(name);
  console.log(`PASS ${name}`);
};

const screenshot = async (page, name) => {
  await page.screenshot({
    path: path.join(artifactDir, `${name}.png`),
    fullPage: true,
  });
};

const assertNoSeriousA11yViolations = async (page, label) => {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = result.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact),
  );
  if (blocking.length === 0) return;

  const details = blocking
    .map((violation) => {
      const targets = violation.nodes
        .slice(0, 4)
        .map(
          (node) =>
            `${node.target.join(" ")} [${node.failureSummary?.replaceAll("\n", " ")}]`,
        )
        .join(", ");
      return `${violation.id} (${violation.impact}): ${targets}`;
    })
    .join(" | ");
  throw new Error(`Acessibilidade bloqueante em ${label}: ${details}`);
};

const goto = async (page, pathname, heading) => {
  await page.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: heading }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });
  assert.equal(new URL(page.url()).pathname, pathname);
};

const assertNoHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  assert(overflow <= 1, `Overflow horizontal de ${overflow}px em ${page.url()}`);
};

try {
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome: "Codex E2E" },
    });
  if (createError) throw createError;
  userId = created.user.id;

  const { data: profile, error: profileError } = await admin
    .from("professores")
    .select("id,onboarding_completo")
    .eq("user_id", userId)
    .single();
  if (profileError) throw profileError;
  professorId = profile.id;
  assert.equal(profile.onboarding_completo, false);
  stage("cadastro administrativo e trigger de perfil");

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "erro desconhecido";
    if (!failure.includes("ERR_ABORTED")) {
      failedRequests.push(
        `${request.method()} ${new URL(request.url()).pathname}: ${failure}`,
      );
    }
  });
  page.on("response", (response) => {
    const request = response.request();
    if (response.status() >= 400) {
      errorResponses.push({
        method: request.method(),
        path: new URL(response.url()).pathname,
        status: response.status(),
      });
    }
    if (
      request.method() !== "GET" &&
      new URL(response.url()).pathname.includes("/rest/v1/")
    ) {
      mutationResponses.push({
        method: request.method(),
        path: new URL(response.url()).pathname,
        status: response.status(),
      });
    }
  });

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/login$/);
  await assertNoSeriousA11yViolations(page, "login");
  stage("rota protegida redireciona visitante");

  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /^Entrar/ }).click();
  await page.waitForURL(/\/onboarding$/, { timeout: 15_000 });
  await page
    .getByRole("heading", { name: /Olá, Codex\. Bom te ter aqui\./ })
    .waitFor({ timeout: 15_000 });
  await assertNoSeriousA11yViolations(page, "onboarding");
  stage("login e redirecionamento para onboarding");

  await page.getByRole("button", { name: "Começar" }).click();
  await page
    .getByRole("heading", { name: "Cadastre seu primeiro aluno" })
    .waitFor();
  await page.getByPlaceholder("Ex: Marina Souza").fill(studentName);
  await page.getByRole("combobox").nth(0).click();
  await page.getByRole("option", { name: "Violão" }).click();
  await page.getByPlaceholder("350").fill("350");
  await page.locator('input[type="time"]').fill("10:30");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("heading", { name: "Como você recebe?" }).waitFor();
  await page
    .getByPlaceholder("email@dominio.com, telefone, CPF ou chave aleatória")
    .fill("e2e@example.invalid");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page
    .getByRole("heading", { name: "Sua política de faltas" })
    .waitFor();
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("heading", { name: "Onde você atende?" }).waitFor();
  await page
    .getByPlaceholder("Rua, número, bairro, cidade — UF")
    .fill("Atendimento online");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page
    .getByRole("heading", { name: "Pronto. Bora começar." })
    .waitFor();
  await page.getByRole("button", { name: /Ir pro painel/ }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 15_000 });
  await page.getByRole("heading", { name: /Codex\./ }).first().waitFor({
    timeout: 15_000,
  });
  await assertNoSeriousA11yViolations(page, "dashboard desktop");
  stage("onboarding transacional com primeiro aluno");

  const { data: onboardingState, error: onboardingError } = await admin
    .from("professores")
    .select("onboarding_completo,chave_pix,endereco")
    .eq("id", professorId)
    .single();
  if (onboardingError) throw onboardingError;
  assert.equal(onboardingState.onboarding_completo, true);
  assert.equal(onboardingState.chave_pix, "e2e@example.invalid");
  assert.equal(onboardingState.endereco, "Atendimento online");

  const { data: students, error: studentError } = await admin
    .from("alunos")
    .select("id,nome,valor_mensalidade")
    .eq("professor_id", professorId);
  if (studentError) throw studentError;
  assert.equal(students.length, 1);
  assert.equal(students[0].nome, studentName);
  assert.equal(Number(students[0].valor_mensalidade), 350);
  const studentId = students[0].id;

  const { count: scheduleCount, error: scheduleError } = await admin
    .from("aulas_recorrentes")
    .select("id", { count: "exact", head: true })
    .eq("aluno_id", studentId);
  if (scheduleError) throw scheduleError;
  assert.equal(scheduleCount, 1);
  stage("persistência do onboarding verificada no banco");

  await screenshot(page, "dashboard-desktop");
  await goto(page, "/alunos", "Alunos");
  await assertNoSeriousA11yViolations(page, "alunos");
  await page
    .getByText(studentName, { exact: true })
    .filter({ visible: true })
    .first()
    .waitFor();
  await goto(page, `/alunos/${studentId}`, studentName);
  await assertNoSeriousA11yViolations(page, "página individual do aluno");
  stage("lista e página individual do aluno");

  await goto(page, "/agenda", "Agenda");
  await assertNoSeriousA11yViolations(page, "agenda desktop");
  await page.getByRole("button", { name: "Criar nova aula" }).click();
  const lessonDialog = page.getByRole("dialog");
  await lessonDialog.getByRole("heading", { name: "Nova aula" }).waitFor();
  await lessonDialog.getByRole("combobox").nth(0).click();
  await page.getByRole("option", { name: new RegExp(studentName) }).click();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, "0"),
    String(tomorrow.getDate()).padStart(2, "0"),
  ].join("-");
  await lessonDialog.locator('input[type="date"]').fill(tomorrowIso);
  await lessonDialog.locator('input[type="time"]').fill("14:00");
  await lessonDialog.getByRole("button", { name: "Criar aula" }).click();
  await page.getByText("Aula avulsa agendada!").waitFor({ timeout: 15_000 });

  const { count: lessonCount, error: lessonError } = await admin
    .from("aulas")
    .select("id", { count: "exact", head: true })
    .eq("professor_id", professorId)
    .eq("aluno_id", studentId);
  if (lessonError) throw lessonError;
  assert.equal(lessonCount, 1);
  stage("criação transacional de aula avulsa");

  const lessonButton = page
    .locator("button:visible")
    .filter({ hasText: studentName.split(" ")[0] })
    .filter({ hasText: "14:00" })
    .first();
  await lessonButton.click();
  const lessonRecordDialog = page.getByRole("dialog");
  await lessonRecordDialog
    .getByRole("heading", { name: /Registrar aula/ })
    .waitFor();
  await lessonRecordDialog
    .getByRole("button", { name: "Reagendar essa aula pra outra data" })
    .click();
  const rescheduledDate = new Date(tomorrow);
  rescheduledDate.setDate(rescheduledDate.getDate() + 2);
  const rescheduledIso = [
    rescheduledDate.getFullYear(),
    String(rescheduledDate.getMonth() + 1).padStart(2, "0"),
    String(rescheduledDate.getDate()).padStart(2, "0"),
  ].join("-");
  await lessonRecordDialog.locator('input[type="date"]').fill(rescheduledIso);
  await lessonRecordDialog.locator('input[type="time"]').fill("15:15");
  await lessonRecordDialog
    .getByRole("button", { name: "Confirmar reagendamento" })
    .click();
  await page.getByText("Aula reagendada!").waitFor({ timeout: 15_000 });

  const { data: rescheduledLessons, error: rescheduleError } = await admin
    .from("aulas")
    .select("id,status,reagendada_de,data_hora")
    .eq("professor_id", professorId)
    .eq("aluno_id", studentId)
    .order("data_hora", { ascending: true });
  if (rescheduleError) throw rescheduleError;
  assert.equal(rescheduledLessons.length, 2);
  const originalLesson = rescheduledLessons.find(
    (lesson) => lesson.status === "reagendada",
  );
  const replacementLesson = rescheduledLessons.find(
    (lesson) => lesson.reagendada_de === originalLesson?.id,
  );
  assert(originalLesson, "A aula original não foi marcada como reagendada");
  assert(replacementLesson, "A nova aula não referencia a aula original");
  assert.equal(replacementLesson.status, "agendada");
  stage("reagendamento transacional pela interface");

  await page.getByTitle("Próxima semana").click();
  const recurringLessonButton = page
    .locator("button:visible")
    .filter({ hasText: studentName.split(" ")[0] })
    .filter({ hasText: "10:30" })
    .first();
  await recurringLessonButton.click();
  const recurringDialog = page.getByRole("dialog");
  await recurringDialog
    .getByRole("button", { name: "Reagendar essa aula pra outra data" })
    .click();
  const recurringReplacementDate = new Date(rescheduledDate);
  recurringReplacementDate.setDate(recurringReplacementDate.getDate() + 7);
  const recurringReplacementIso = [
    recurringReplacementDate.getFullYear(),
    String(recurringReplacementDate.getMonth() + 1).padStart(2, "0"),
    String(recurringReplacementDate.getDate()).padStart(2, "0"),
  ].join("-");
  await recurringDialog
    .locator('input[type="date"]')
    .fill(recurringReplacementIso);
  await recurringDialog.locator('input[type="time"]').fill("16:45");
  await recurringDialog
    .getByRole("button", { name: "Confirmar reagendamento" })
    .click();
  await recurringDialog.waitFor({ state: "hidden", timeout: 15_000 });
  await page.getByText("Aula reagendada!").last().waitFor({ timeout: 15_000 });

  const { data: lessonsAfterRecurringReschedule, error: recurringError } =
    await admin
      .from("aulas")
      .select("id,status,reagendada_de")
      .eq("professor_id", professorId)
      .eq("aluno_id", studentId);
  if (recurringError) throw recurringError;
  assert.equal(lessonsAfterRecurringReschedule.length, 4);
  assert.equal(
    lessonsAfterRecurringReschedule.filter(
      (lesson) => lesson.status === "reagendada",
    ).length,
    2,
  );
  assert.equal(
    lessonsAfterRecurringReschedule.filter((lesson) => lesson.reagendada_de)
      .length,
    2,
  );
  stage("reagendamento de horário recorrente pela interface");

  await goto(page, "/financeiro", "Financeiro");
  await assertNoSeriousA11yViolations(page, "financeiro");
  const generateButton = page
    .getByRole("button", { name: /Criar 1 cobrança pendente do mês/ })
    .first();
  await generateButton.click();
  const chargeDialog = page.getByRole("dialog");
  await chargeDialog
    .getByRole("heading", { name: "Criar cobranças pendentes?" })
    .waitFor();
  await chargeDialog.getByRole("button", { name: "Criar pendentes" }).click();
  await page.getByText(/cobrança gerada/i).waitFor({ timeout: 15_000 });

  let charges = [];
  let chargeError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await admin
      .from("cobrancas")
      .select("id,status,valor")
      .eq("professor_id", professorId)
      .eq("aluno_id", studentId);
    charges = result.data ?? [];
    chargeError = result.error;
    if (chargeError || charges.length > 0) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (chargeError) throw chargeError;
  if (charges.length !== 1) {
    throw new Error(
      `Cobrança não persistiu; respostas: ${JSON.stringify(mutationResponses)}`,
    );
  }
  assert.equal(charges.length, 1);
  assert.equal(charges[0].status, "pendente");
  assert.equal(Number(charges[0].valor), 350);
  stage("geração de cobrança mensal");

  await page.getByRole("button", { name: /Marcar pago|Recebi/ }).first().click();
  await page.getByText(/Pagamento registrado|marcada como paga/i).waitFor({
    timeout: 15_000,
  });
  const { data: paidCharge, error: paidError } = await admin
    .from("cobrancas")
    .select("status,data_pagamento")
    .eq("id", charges[0].id)
    .single();
  if (paidError) throw paidError;
  assert.equal(paidCharge.status, "pago");
  assert(paidCharge.data_pagamento);
  stage("baixa de pagamento");

  await page.getByRole("button", { name: "Gerar recibo" }).first().click();
  const receiptDialog = page.getByRole("dialog", {
    name: "Recibo de pagamento",
  });
  await receiptDialog.waitFor();
  await page.emulateMedia({ media: "print" });
  const receiptLayout = await page.locator(".print-area").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const ancestors = [];
    for (let current = element.parentElement; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      ancestors.push({
        tag: current.tagName,
        id: current.id,
        className:
          typeof current.className === "string" ? current.className : "",
        radixPortal: current.hasAttribute("data-radix-portal"),
        overflow: style.overflow,
        position: style.position,
        transform: style.transform,
        top: style.top,
        left: style.left,
        translate: style.translate,
        margin: style.margin,
        animationName: style.animationName,
        animationPlayState: style.animationPlayState,
      });
    }
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      ancestors,
    };
  });
  assert(
    receiptLayout.top >= 0 &&
      receiptLayout.top <= 32 &&
      receiptLayout.left >= 0 &&
      receiptLayout.left <= 32 &&
      receiptLayout.width >= 600 &&
      receiptLayout.height >= 500 &&
      !receiptLayout.ancestors.slice(0, 2).some(
        (ancestor) =>
          ancestor.transform !== "none" ||
          ["hidden", "clip", "scroll", "auto"].includes(ancestor.overflow),
      ),
    `Recibo não ocupa a página de impressão: ${JSON.stringify(receiptLayout)}`,
  );
  await page.emulateMedia({ media: "screen" });
  await receiptDialog.getByRole("button", { name: "Fechar" }).click();
  stage("recibo ocupa a página de impressão");

  await goto(page, "/relatorios", "Relatórios");
  await assertNoSeriousA11yViolations(page, "relatórios");
  await page.getByText("Distribuição por instrumento").waitFor();
  stage("relatórios autenticados");

  await page.setViewportSize({ width: 390, height: 844 });
  await goto(page, "/dashboard", /Olá, Codex/);
  await assertNoHorizontalOverflow(page);
  await assertNoSeriousA11yViolations(page, "dashboard mobile");
  await screenshot(page, "dashboard-mobile");
  await goto(page, "/agenda", "Agenda");
  await assertNoHorizontalOverflow(page);
  await assertNoSeriousA11yViolations(page, "agenda mobile");
  await screenshot(page, "agenda-mobile");
  stage("dashboard e agenda sem overflow em 390px");

  await page.setViewportSize({ width: 1440, height: 1000 });
  await goto(page, "/configuracoes", "Configurações");
  await assertNoSeriousA11yViolations(page, "configurações");
  await page
    .getByRole("button", { name: "Excluir minha conta" })
    .first()
    .click();
  const deleteDialog = page.getByRole("dialog");
  await deleteDialog
    .getByRole("heading", { name: "Excluir minha conta" })
    .waitFor();
  await deleteDialog.locator("#confirmar-exclusao").fill("EXCLUIR");
  await deleteDialog
    .getByRole("button", { name: "Excluir minha conta" })
    .click();
  await page.waitForURL(/\/login$/, { timeout: 15_000 });

  const { count: remainingProfiles, error: remainingProfileError } = await admin
    .from("professores")
    .select("id", { count: "exact", head: true })
    .eq("id", professorId);
  if (remainingProfileError) throw remainingProfileError;
  assert.equal(remainingProfiles, 0);

  const { data: remainingUsersData, error: remainingUsersError } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (remainingUsersError) throw remainingUsersError;
  assert.deepEqual(
    remainingUsersData.users.map((user) => user.id).sort(),
    baselineUserIds,
    "A exclusão da conta descartável alterou usuários preexistentes",
  );
  deletedViaUi = true;
  stage("exclusão completa sem afetar outras contas");

  assert.deepEqual(pageErrors, [], `Erros de página: ${pageErrors.join(" | ")}`);
  assert.deepEqual(
    failedRequests,
    [],
    `Requests com falha: ${failedRequests.join(" | ")}`,
  );
  const expectedLogoutResponse = errorResponses.filter(
    (response) =>
      response.method === "POST" &&
      response.path === "/auth/v1/logout" &&
      response.status === 403,
  );
  const unexpectedResponses = errorResponses.filter(
    (response) => !expectedLogoutResponse.includes(response),
  );
  assert.equal(expectedLogoutResponse.length, 1);
  assert.deepEqual(unexpectedResponses, []);

  const unexpectedConsoleProblems = [...consoleProblems];
  if (expectedLogoutResponse.length === 1) {
    const expectedConsoleIndex = unexpectedConsoleProblems.findIndex((message) =>
      message.includes("Failed to load resource") && message.includes("403"),
    );
    if (expectedConsoleIndex >= 0) unexpectedConsoleProblems.splice(expectedConsoleIndex, 1);
  }
  assert.deepEqual(
    unexpectedConsoleProblems,
    [],
    `Console com erros/avisos: ${unexpectedConsoleProblems.join(" | ")}`,
  );
  stage("console e rede limpos");
} finally {
  if (browser) await browser.close();
  if (userId && !deletedViaUi) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error && !/not found/i.test(error.message)) {
      console.error(`Falha ao limpar usuário E2E: ${error.message}`);
    }
  }
}

console.log(`OK ${stages.length} etapas; conta descartável removida`);
