import { userAgent } from "./config.ts";
import { ApiError } from "./errors.ts";
import { once, type Source } from "./library.ts";

export type Lyrics =
  | { status: "synced"; lines: { time: number; text: string }[] }
  | { status: "plain"; text: string }
  | { status: "unavailable" | "instrumental" };

interface ProviderResult {
  duration: number;
  instrumental?: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

const unavailable: Lyrics = { status: "unavailable" };
const cache = new Map<string, { expires: number; lyrics: Lyrics }>();
let queue = Promise.resolve();
let pending = 0;
let retryAfter = 0;

export function parseLrc(lrc: string) {
  const offset = Number(lrc.match(/^\s*\[offset:\s*([+-]?\d+)\s*\]/im)?.[1] ?? 0) / 1000;
  const entries = new Map<number, string[]>();

  for (const row of lrc.split(/\r?\n/)) {
    const prefix = row.match(/^\s*(?:\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\][ \t]*)+/)?.[0];
    if (!prefix) continue;
    const stamps = prefix.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g);
    const text = row.slice(prefix.length).trim();

    for (const stamp of stamps) {
      const seconds = Number(stamp[2]);
      if (seconds >= 60) continue;
      const absolute = Number(stamp[1]) * 60 + seconds + Number(`0.${stamp[3] || "0"}`);
      const time = Math.max(0, Math.round((absolute + offset) * 1000) / 1000);
      const lines = entries.get(time) ?? [];
      if (text && !lines.includes(text)) lines.push(text);
      entries.set(time, lines);
    }
  }

  return [...entries].sort(([a], [b]) => a - b).map(([time, lines]) => ({ time, text: lines.join("\n") }));
}

function temporaryError() {
  return new ApiError(503, "LYRICS_TEMPORARY", "Lyrics are temporarily unavailable. Try again.");
}

async function fromProvider(params: URLSearchParams, duration: number): Promise<Lyrics> {
  if (pending >= 6) throw temporaryError();
  pending++;
  const result = queue.then(async (): Promise<Lyrics> => {
    if (Date.now() < retryAfter) throw temporaryError();
    const response = await fetch(`https://lrclib.net/api/get?${params}`, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(6500),
    }).catch(() => { throw temporaryError(); });
    if (response.status === 404) return unavailable;
    if (response.status === 429) {
      const value = response.headers.get("Retry-After");
      retryAfter = value && Number.isFinite(Number(value))
        ? Date.now() + Number(value) * 1000
        : Math.max(Date.parse(value ?? "") || 0, Date.now() + 10_000);
    }
    if (!response.ok) throw temporaryError();

    const data = await response.json().catch(() => null) as ProviderResult | null;
    if (!data) throw temporaryError();
    if (!Number.isFinite(data.duration) || Math.abs(data.duration - duration) > 2) return unavailable;
    if (data.instrumental) return { status: "instrumental" };

    const lines = typeof data.syncedLyrics === "string" ? parseLrc(data.syncedLyrics)
      .filter((line) => line.time <= duration + 0.1) : [];
    if (lines.some((line) => line.text)) return { status: "synced", lines };
    return typeof data.plainLyrics === "string" && data.plainLyrics.trim()
      ? { status: "plain", text: data.plainLyrics.trim() }
      : unavailable;
  });
  queue = result.catch(() => {}).then(() => new Promise<void>((resolve) => setTimeout(resolve, 250)));
  try {
    return await result;
  } finally {
    pending--;
  }
}

export async function getLyrics(source: Source): Promise<Lyrics> {
  if (!source.recording) return unavailable;
  const { title, artist, album } = source.recording;
  const params = new URLSearchParams({
    track_name: title,
    artist_name: artist,
    duration: String(Math.round(source.originalDuration)),
  });
  if (album) params.set("album_name", album);
  const key = params.toString();

  return once(`lyrics:${key}`, async () => {
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.lyrics;
    const lyrics = await fromProvider(params, source.originalDuration);
    const ttl = lyrics.status === "unavailable" ? 3600_000 : 86_400_000;
    cache.delete(key);
    if (cache.size >= 512) {
      const oldest = cache.keys().next();
      if (!oldest.done) cache.delete(oldest.value);
    }
    cache.set(key, { lyrics, expires: Date.now() + ttl });
    return lyrics;
  });
}
