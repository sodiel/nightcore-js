import { modes, type Preset } from "../config/modes.ts";
import type { Track, TrackLookup, Variant } from "../services.ts";

const videoIdPattern = /^[\w-]{11}$/;
const trackIdPattern = /^[a-f0-9]{64}$/;

function youtubeUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function readSharedTrack(search: string): { lookup: TrackLookup; preset: Preset } | null {
  const params = new URLSearchParams(search);
  const preset = modes.find((mode) => mode.value === params.get("mode"))?.value ?? "nightcore";
  const video = params.get("v");
  if (video && videoIdPattern.test(video)) return { lookup: { query: youtubeUrl(video) }, preset };
  const id = params.get("track");
  return id && trackIdPattern.test(id) ? { lookup: { id }, preset } : null;
}

export function publicTrackLink(track: Track, location: Location) {
  if (track.origin.kind !== "youtube") return "";
  const { videoId } = track.origin;
  // A link back to this player is useful to other devices only on a reachable host.
  if (["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) return videoId ? youtubeUrl(videoId) : "";
  const url = new URL(location.origin);
  url.pathname = location.pathname;
  if (videoId) url.searchParams.set("v", videoId);
  else url.searchParams.set("track", track.id);
  url.searchParams.set("mode", track.variant.preset);
  return url.href;
}

export function downloadUrl(variant: Variant) {
  return `${variant.mediaUrl}?download=1`;
}
