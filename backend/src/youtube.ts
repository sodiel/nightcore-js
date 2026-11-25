import { stat } from "node:fs/promises";
import { config, maxSourceSeconds } from "./config.ts";
import { ApiError } from "./errors.ts";
import { run } from "./tools.ts";

const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "music.youtube.com", "m.youtube.com"]);

export function youtubeInput(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 500) {
    throw new ApiError(400, "INVALID_QUERY", "Enter a song name or YouTube link.");
  }
  const query = value.trim();
  const looksLikeUrl = /^(?:[a-z][a-z\d+.-]*:\/\/|(?:\w+\.)?youtube\.com\/|youtu\.be\/)/i.test(query);
  if (!looksLikeUrl) return { query, input: `ytsearch1:${query}`, isSearch: true };

  let id: string | null | undefined;
  try {
    const url = new URL(query.includes("://") ? query : `https://${query}`);
    if (url.protocol === "https:" || url.protocol === "http:") {
      if (url.hostname === "youtu.be") id = url.pathname.split("/")[1];
      else if (youtubeHosts.has(url.hostname)) {
        if (url.pathname === "/watch") id = url.searchParams.get("v");
        else if (/^\/(shorts|live|embed)\//.test(url.pathname)) id = url.pathname.split("/")[2];
      }
    }
  } catch {
    // Invalid URLs share the same actionable message.
  }
  if (!id || !/^[\w-]{11}$/.test(id)) {
    throw new ApiError(400, "INVALID_URL", "Paste a link to a single YouTube video.");
  }
  return { query, input: `https://www.youtube.com/watch?v=${id}`, isSearch: false };
}

export async function downloadSource(input: string, destination: string) {
  const ffmpegLocation = config.ffmpeg === "ffmpeg" ? [] : ["--ffmpeg-location", config.ffmpeg];
  try {
    const { stdout } = await run(config.ytDlp, [
      "--ignore-config", "--no-playlist", "--no-progress", "--no-simulate",
      "--js-runtimes", "node", ...ffmpegLocation,
      "--match-filter", `!is_live & duration <= ${maxSourceSeconds}`,
      "--socket-timeout", "15", "--retries", "1", "--fragment-retries", "1",
      "-f", "bestaudio[acodec!=none]", "--max-filesize", "70M",
      "-o", destination, "--print", "%()j", "--", input,
    ], 140_000);
    if (!(await stat(destination).catch(() => null))) {
      throw new ApiError(404, "SOURCE_UNAVAILABLE", "No playable track was found. Try a different link or song name.");
    }
    try {
      return JSON.parse(stdout.trim()) as Record<string, unknown>;
    } catch {
      return {};
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const stderr = typeof error === "object" && error !== null && "stderr" in error ? String(error.stderr) : "";
    if (/HTTP Error (403|429)|sign in|bot/i.test(stderr)) {
      throw new ApiError(502, "SOURCE_RESTRICTED", "YouTube declined this request. Try another link or try again later.");
    }
    throw new ApiError(502, "SOURCE_FAILED", "Could not download this track. Try another link or try again.");
  }
}
