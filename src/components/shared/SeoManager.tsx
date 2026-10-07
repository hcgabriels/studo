import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://studoo.com.br";
const DEFAULT_DESCRIPTION =
  "Organize alunos, agenda, registros de aula, cobranças e relatórios em um só lugar. Software de gestão para professores particulares.";
const DEFAULT_SOCIAL_DESCRIPTION =
  "Alunos, agenda, registros de aula, cobranças e relatórios em um só lugar.";
const SOCIAL_IMAGE = `${SITE_URL}/landing/dashboard.png`;

type PublicPageMeta = {
  title: string;
  description: string;
  canonicalPath: string;
};

const publicPages: Record<string, PublicPageMeta> = {
  "/": {
    title: "Studoo | Gestão para professores particulares",
    description: DEFAULT_DESCRIPTION,
    canonicalPath: "/",
  },
  "/termos": {
    title: "Termos de Uso | Studoo",
    description: "Consulte os Termos de Uso do Studoo, software de gestão para professores particulares.",
    canonicalPath: "/termos",
  },
  "/privacidade": {
    title: "Política de Privacidade | Studoo",
    description: "Saiba como o Studoo coleta, utiliza e protege os dados de professores e alunos.",
    canonicalPath: "/privacidade",
  },
};

const privatePageTitles: Record<string, string> = {
  "/login": "Entrar | Studoo",
  "/cadastro": "Criar conta | Studoo",
  "/reset-password": "Redefinir senha | Studoo",
  "/verificar-email": "Verificar email | Studoo",
  "/onboarding": "Configuração inicial | Studoo",
  "/dashboard": "Painel | Studoo",
  "/alunos": "Alunos | Studoo",
  "/agenda": "Agenda | Studoo",
  "/financeiro": "Financeiro | Studoo",
  "/relatorios": "Relatórios | Studoo",
  "/configuracoes": "Configurações | Studoo",
};

const upsertMeta = (
  attribute: "name" | "property",
  key: string,
  content: string,
) => {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
};

const setCanonical = (url: string) => {
  let canonical = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;
};

const SeoManager = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const publicMeta = publicPages[pathname];
    const isPublicPage = Boolean(publicMeta);
    const privateBasePath = pathname.startsWith("/alunos/")
      ? "/alunos"
      : pathname;
    const title =
      publicMeta?.title ?? privatePageTitles[privateBasePath] ?? "Página não encontrada | Studoo";
    const description = publicMeta?.description ?? DEFAULT_SOCIAL_DESCRIPTION;
    const canonicalUrl = `${SITE_URL}${publicMeta?.canonicalPath ?? pathname}`;
    const robots = isPublicPage
      ? "index, follow, max-image-preview:large"
      : "noindex, nofollow, noarchive";

    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", robots);
    upsertMeta("name", "googlebot", robots);
    setCanonical(canonicalUrl);

    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:locale", "pt_BR");
    upsertMeta("property", "og:site_name", "Studoo");
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:image", SOCIAL_IMAGE);
    upsertMeta(
      "property",
      "og:image:alt",
      "Painel do Studoo para professores particulares",
    );

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", SOCIAL_IMAGE);
    upsertMeta(
      "name",
      "twitter:image:alt",
      "Painel do Studoo para professores particulares",
    );

  }, [pathname]);

  return null;
};

export default SeoManager;
