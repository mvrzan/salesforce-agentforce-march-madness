const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const API_SECRET = import.meta.env.VITE_API_SECRET ?? "";

const hmacHex = async (secret: string, message: string): Promise<string> => {
  if (!secret) return "";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const buildHeaders = async (method: string, path: string): Promise<Record<string, string>> => {
  const timestamp = Date.now().toString();
  const message = `${timestamp}${method.toUpperCase()}${path}`;
  const signature = await hmacHex(API_SECRET, message);
  return {
    "Content-Type": "application/json",
    "x-timestamp": timestamp,
    "x-signature": signature,
  };
};

const apiFetch = async <T>(path: string, options: RequestInit = {}, signed = false): Promise<T> => {
  const method = (options.method ?? "GET").toUpperCase();
  const extraHeaders = signed ? await buildHeaders(method, path) : { "Content-Type": "application/json" };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { ...extraHeaders, ...options.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error((body as { error?: string })?.error ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

// ── Results ──────────────────────────────────────────────────────────────────
export const getTeams = () =>
  apiFetch<{ success: boolean; data: import("../types/tournament").Team[] }>("/api/v1/results/teams");

export const getBracketStructure = () =>
  apiFetch<{ success: boolean; data: import("../types/tournament").Bracket }>("/api/v1/results/bracket");

export const getLiveScores = () =>
  apiFetch<{ success: boolean; data: import("../types/tournament").Matchup[]; isFallback: boolean }>(
    "/api/v1/results/live",
  );

// ── User Bracket ──────────────────────────────────────────────────────────────
export const saveBracket = (sessionId: string, picks: import("../types/tournament").PickPayload[]) =>
  apiFetch<{ success: boolean; data: import("../types/tournament").Bracket }>("/api/v1/bracket/save", {
    method: "POST",
    body: JSON.stringify({ sessionId, picks }),
  });

export const fetchBracket = (id: string) =>
  apiFetch<{ success: boolean; data: import("../types/tournament").Bracket }>(`/api/v1/bracket/${id}`);

export const scoreBracket = (id: string) =>
  apiFetch<{ success: boolean; data: import("../types/tournament").BracketScore }>(`/api/v1/bracket/${id}/score`);

// ── Agentforce Session ────────────────────────────────────────────────────────
export const startAgentSession = (sessionId: string) => {
  const path = `/api/v1/af/sessions/${sessionId}`;
  return apiFetch<{ sessionId: string; messages: unknown[] }>(path, { method: "POST" }, true);
};

export const deleteAgentSession = (sessionId: string) => {
  const path = "/api/v1/delete-session";
  return apiFetch<{ message: string }>(path, { method: "DELETE", body: JSON.stringify({ sessionId }) }, true);
};

// ── Agentforce Streaming (returns EventSource-compatible fetch) ───────────────
export const sendStreamingMessage = async (
  sessionId: string,
  message: string,
  sequenceId: number,
): Promise<Response> => {
  const path = "/api/v1/send-streaming-message";
  const headers = await buildHeaders("POST", path);
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ sessionId, message, sequenceId }),
  });
};

// ── Agentforce Bracket (server-side prompts) ──────────────────────────────────
export const streamBracketRound = async (
  sessionId: string,
  roundIndex: number,
  sequenceId: number,
  priorPicks: Record<string, string>,
): Promise<Response> => {
  const path = "/api/v1/af/bracket/round";
  const headers = await buildHeaders("POST", path);
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ sessionId, roundIndex, sequenceId, priorPicks }),
  });
};

export const streamBracketRetry = async (
  sessionId: string,
  missingMatchupIds: string[],
  sequenceId: number,
  priorPicks: Record<string, string>,
): Promise<Response> => {
  const path = "/api/v1/af/bracket/retry";
  const headers = await buildHeaders("POST", path);
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ sessionId, missingMatchupIds, sequenceId, priorPicks }),
  });
};

export const streamBracketAdapt = async (
  sessionId: string,
  sequenceId: number,
  round: string,
  completedMatchups: import("../types/tournament").Matchup[],
  aiBracket: import("../types/tournament").Bracket | null,
): Promise<Response> => {
  const path = "/api/v1/af/bracket/adapt";
  const headers = await buildHeaders("POST", path);
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ sessionId, sequenceId, round, completedMatchups, aiBracket }),
  });
};
