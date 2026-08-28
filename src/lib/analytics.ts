/**
 * Instrumentação de produto.
 *
 * O app não tinha NENHUM evento nem captura de erro — não dava pra responder
 * "quantos se cadastraram", "em qual passo do onboarding as pessoas desistem"
 * ou "alguém usou o import CSV". Sem isso, um beta não ensina nada.
 *
 * Implementação propositalmente fina e sem dependência:
 * - Se `VITE_POSTHOG_KEY` não estiver definida, tudo vira no-op silencioso.
 *   O app funciona igual, só não manda nada.
 * - O carregamento do SDK é sob demanda (import dinâmico), então não entra no
 *   bundle inicial de quem não configurou.
 *
 * Pra ligar: crie o projeto no PostHog e preencha no `.env`
 *   VITE_POSTHOG_KEY=phc_xxx
 *   VITE_POSTHOG_HOST=https://us.i.posthog.com
 */

type Props = Record<string, string | number | boolean | null | undefined>;

/** Eventos do funil. Lista fechada pra não virar sopa de string solta. */
export type EventoStudoo =
  // Ativação
  | "signup_iniciado"
  | "signup_concluido"
  | "onboarding_etapa_vista"
  | "onboarding_pulado"
  | "onboarding_concluido"
  | "primeiro_aluno_criado"
  | "csv_import_iniciado"
  | "csv_import_concluido"
  // Engajamento (proxy do "aha")
  | "presenca_marcada"
  | "agenda_vista"
  | "whatsapp_aberto"
  // Valor entregue
  | "cobrancas_geradas"
  | "cobranca_marcada_paga"
  | "recibo_gerado"
  | "csv_exportado"
  | "dados_exportados"
  // Conta
  | "conta_excluida";

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  "https://us.i.posthog.com";

const ativo = Boolean(KEY);

type ClientePostHog = {
  init: (key: string, opts: Record<string, unknown>) => void;
  capture: (evento: string, props?: Props) => void;
  identify: (id: string, props?: Props) => void;
  reset: () => void;
};

declare global {
  interface Window {
    posthog?: ClientePostHog;
  }
}

/**
 * O SDK entra por <script> da CDN, não por dependência npm.
 *
 * Motivo: a telemetria é opcional. Como dependência, quem clonasse o repo sem
 * rodar `npm install` (ou sem acesso ao registry) teria o BUILD quebrado por
 * causa de uma feature que talvez nem use. Assim, sem `VITE_POSTHOG_KEY` nada
 * é baixado e nada é executado.
 */
let clientePromise: Promise<ClientePostHog | null> | null = null;

const getCliente = (): Promise<ClientePostHog | null> => {
  if (!ativo || typeof window === "undefined") return Promise.resolve(null);

  clientePromise ??= new Promise<ClientePostHog | null>((resolve) => {
    if (window.posthog) {
      resolve(window.posthog);
      return;
    }
    const script = document.createElement("script");
    script.src = `${HOST.replace(/\/$/, "")}/static/array.js`;
    script.async = true;
    script.onload = () => {
      const ph = window.posthog ?? null;
      ph?.init(KEY!, {
        api_host: HOST,
        capture_pageview: false, // o router controla; evita duplicar em SPA
        persistence: "localStorage",
      });
      resolve(ph);
    };
    // Adblock, offline, CSP: segue sem telemetria, sem quebrar nada.
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return clientePromise;
};

/** Registra um evento. Nunca lança e nunca bloqueia o fluxo do usuário. */
export const track = (evento: EventoStudoo, props?: Props): void => {
  if (!ativo) return;
  void getCliente().then((c) => c?.capture(evento, props));
};

/** Associa os eventos ao professor logado. */
export const identificar = (professorId: string, props?: Props): void => {
  if (!ativo) return;
  void getCliente().then((c) => c?.identify(professorId, props));
};

/** Chamado no logout, pra não misturar sessões na mesma máquina. */
export const resetarIdentidade = (): void => {
  if (!ativo) return;
  void getCliente().then((c) => c?.reset());
};

/**
 * Captura de erro. Hoje o ErrorBoundary mostra uma tela amigável e DESCARTA a
 * informação — o primeiro professor que travar some sem deixar rastro.
 *
 * Sem PostHog configurado, ao menos deixa o erro no console em formato
 * consistente, pra ajudar em suporte 1:1 durante o beta.
 */
export const capturarErro = (erro: unknown, contexto?: Props): void => {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  const stack = erro instanceof Error ? erro.stack : undefined;
  console.error("[studoo] erro capturado:", mensagem, contexto ?? {}, stack);
  if (!ativo) return;
  void getCliente().then((c) =>
    c?.capture("$exception", {
      ...contexto,
      mensagem,
      stack: stack?.slice(0, 4000),
    }),
  );
};
