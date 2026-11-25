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

export function uploadTrack(file: File, preset: Preset, signal: AbortSignal, onProgress: (percent: number | null) => void) {
  return new Promise<Track>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    request.open("POST", "/api/tracks/upload");
    request.responseType = "json";
    request.timeout = 240_000;

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.round(event.loaded / event.total * 100));
    };
    request.upload.onload = () => onProgress(null);
    request.onload = () => {
      if (request.status >= 200 && request.status < 300 && request.response) resolve(request.response as Track);
      else reject(new Error(request.response?.error || "Could not process this file. Try again."));
    };
    request.onerror = () => reject(new Error("Could not reach the server. Try again."));
    request.ontimeout = () => reject(new Error("The upload timed out. Try again."));
    request.onabort = () => reject(new DOMException("Upload aborted", "AbortError"));
    request.onloadend = () => signal.removeEventListener("abort", abort);

    if (signal.aborted) {
      reject(new DOMException("Upload aborted", "AbortError"));
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    const form = new FormData();
    form.append("preset", preset);
    form.append("file", file);
    request.send(form);
  });
}
