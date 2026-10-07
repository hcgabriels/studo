import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const readProjectFile = (path: string) =>
  readFileSync(join(projectRoot, path), "utf8");

describe("SEO público", () => {
  it("publica os metadados essenciais da landing", () => {
    const html = readProjectFile("index.html");

    expect(html).toContain("Studoo | Gestão para professores particulares");
    expect(html).toContain('name="description"');
    expect(html).toContain('rel="canonical" href="https://studoo.com.br/"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('"@type": "SoftwareApplication"');
  });

  it("oferece robots e sitemap apenas com páginas públicas", () => {
    const robots = readProjectFile("public/robots.txt");
    const sitemap = readProjectFile("public/sitemap.xml");

    expect(robots).toContain("Sitemap: https://studoo.com.br/sitemap.xml");
    expect(sitemap).toContain("https://studoo.com.br/</loc>");
    expect(sitemap).toContain("https://studoo.com.br/termos</loc>");
    expect(sitemap).toContain("https://studoo.com.br/privacidade</loc>");
    expect(sitemap).not.toContain("/dashboard");
    expect(sitemap).not.toContain("/cadastro");
  });

  it("impede a indexação das rotas de conta e do produto", () => {
    const vercel = readProjectFile("vercel.json");
    const seoManager = readProjectFile(
      "src/components/shared/SeoManager.tsx",
    );

    for (const route of [
      "/login",
      "/cadastro",
      "/onboarding",
      "/dashboard",
      "/alunos/:path*",
      "/agenda",
      "/financeiro",
      "/relatorios",
      "/configuracoes",
    ]) {
      expect(vercel).toContain(`"source": "${route}"`);
    }
    expect(vercel).toContain('"key": "X-Robots-Tag"');
    expect(vercel).toContain('"value": "noindex, nofollow, noarchive"');
    expect(seoManager).toContain('"noindex, nofollow, noarchive"');
  });

  it("não transforma qualquer endereço inexistente em uma página válida", () => {
    const vercel = readProjectFile("vercel.json");

    expect(vercel).not.toContain("((?!assets/");
  });
});
