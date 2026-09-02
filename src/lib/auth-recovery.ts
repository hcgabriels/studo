export interface RecoveryUrlState {
  isRecovery: boolean;
  error: string | null;
}

const readParams = (url: URL) => {
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  return [url.searchParams, hash];
};

export const parseRecoveryUrl = (href: string): RecoveryUrlState => {
  const url = new URL(href);
  const params = readParams(url);
  const error = params
    .map((item) => item.get("error_description") ?? item.get("error"))
    .find(Boolean);
  const type = params.map((item) => item.get("type")).find(Boolean);

  return {
    isRecovery: type === "recovery",
    error: error ? error.replace(/\+/g, " ") : null,
  };
};
