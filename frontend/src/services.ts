export type Preset = "nightcore" | "daycore";

export interface TrackMetadata {
  artist: string;
  title: string;
  artworkUrl: string;
}

export interface Variant {
  preset: Preset;
  mediaUrl: string;
  tempoFactor: number;
}

export interface Track {
  id: string;
  metadata: TrackMetadata | null;
  originalDuration: number;
  variant: Variant;
}

async function request<T>(url: string, signal: AbortSignal, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error("Could not reach the server. Try again.");
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || "Could not prepare this track. Try again.");
  if (!result) throw new Error("The server returned an empty response. Try again.");
  return result as T;
}

export function searchTrack(query: string, preset: Preset, signal: AbortSignal) {
  return request<Track>("/api/tracks", signal, { query, preset });
}

export function renderVariant(id: string, preset: Preset, signal: AbortSignal) {
  return request<Variant>(`/api/tracks/${encodeURIComponent(id)}/variants`, signal, { preset });
}

export interface LyricLine {
  time: number;
  text: string;
}

export type Lyrics =
  | { status: "synced"; lines: LyricLine[] }
  | { status: "plain"; text: string }
  | { status: "unavailable" | "instrumental" };

export async function fetchLyrics(id: string, signal: AbortSignal): Promise<Lyrics> {
  const response = await fetch(`/api/tracks/${encodeURIComponent(id)}/lyrics`, { signal });
  if (!response.ok) throw new Error("Could not load lyrics. Try again.");
  return await response.json() as Lyrics;
}
