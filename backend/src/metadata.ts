import { userAgent } from "./config.ts";

export interface Metadata {
  title: string;
  artist: string;
  artworkUrl: string;
}

export function label(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 300) : "";
}

export function sourceMetadata(info: Record<string, unknown>): Metadata | null {
  const title = label(info.track) || label(info.title);
  if (!title) return null;
  return {
    title,
    artist: label(info.artist) || label(info.creator) || label(info.uploader),
    artworkUrl: /^https:\/\//i.test(String(info.thumbnail)) ? String(info.thumbnail) : "",
  };
}

let nextMusicBrainzRequest = 0;

export async function catalogMetadata(query: string): Promise<Metadata | null> {
  try {
    const term = query.replace(/\b(nightcore|lyrics|official video|hd)\b|\[.*?\]|\(.*?\)/gi, "").trim();
    const params = new URLSearchParams({ term, entity: "song", limit: "1" });
    const response = await fetch(`https://itunes.apple.com/search?${params}`, { signal: AbortSignal.timeout(4500) });
    if (response.ok) {
      const data = await response.json() as { results?: { trackName?: string; artistName?: string; artworkUrl100?: string }[] };
      const track = data.results?.[0];
      if (track?.trackName) return {
        title: track.trackName,
        artist: track.artistName ?? "",
        artworkUrl: track.artworkUrl100?.replace("100x100", "600x600") ?? "",
      };
    }
  } catch {
    // Catalog metadata is optional.
  }

  try {
    const now = Date.now();
    const slot = Math.max(now, nextMusicBrainzRequest);
    nextMusicBrainzRequest = slot + 1100;
    if (slot - now > 2500) return null;
    await new Promise((resolve) => setTimeout(resolve, slot - now));
    const params = new URLSearchParams({ query, fmt: "json", limit: "1", dismax: "true" });
    const response = await fetch(`https://musicbrainz.org/ws/2/recording?${params}`, {
      headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) return null;
    const data = await response.json() as { recordings?: {
      title: string;
      "artist-credit"?: { name?: string; artist?: { name: string }; joinphrase?: string }[];
      releases?: { id: string }[];
    }[] };
    const recording = data.recordings?.[0];
    if (!recording?.title) return null;
    const release = recording.releases?.[0]?.id;
    return {
      title: recording.title,
      artist: recording["artist-credit"]?.map((credit) => (credit.name ?? credit.artist?.name ?? "") + (credit.joinphrase ?? "")).join("") ?? "",
      artworkUrl: release ? `https://coverartarchive.org/release/${encodeURIComponent(release)}/front-500` : "",
    };
  } catch {
    return null;
  }
}

export type Recording = { title: string; artist: string; album?: string };

export function youtubeRecording(info: Record<string, unknown>): Recording | null {
  const title = label(info.track);
  const artist = label(info.artist);
  const album = label(info.album);
  if (title && artist) return { title, artist, ...(album ? { album } : {}) };

  const parts = label(info.title).match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (!parts?.[1] || !parts[2]) return null;
  const artistFromTitle = parts[1].trim();
  const uploader = (label(info.uploader) || label(info.channel)).replace(/\s*-\s*Topic$/i, "");
  const words = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const artistKey = words(artistFromTitle);
  const uploaderKey = words(uploader).replace(/(?:official|vevo)$/i, "");
  if (!artistKey || artistKey !== uploaderKey) return null;
  const song = parts[2].replace(/\s*[([](?:official\s+)?(?:music\s+video|video|audio|lyrics?|lyric video|visuali[sz]er|hd)[)\]]\s*$/i, "").trim();
  return song ? { title: song, artist: artistFromTitle } : null;
}
