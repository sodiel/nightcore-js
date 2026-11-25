import { config, maxSourceSeconds } from "./config.ts";
import { ApiError } from "./errors.ts";
import { presets, type Preset } from "./presets.ts";
import { run } from "./tools.ts";

const formats = "mp3,wav,mov,ogg,flac,matroska,aac";

interface ProbeResult {
  streams?: { codec_type: string; disposition?: { attached_pic?: number }; tags?: Record<string, string> }[];
  format?: { duration?: string; tags?: Record<string, string>; format_name?: string };
}

export async function probeAudio(file: string, isUpload = false) {
  let result: ProbeResult;
  try {
    const { stdout } = await run(config.ffprobe, [
      "-v", "error", "-protocol_whitelist", "file", "-format_whitelist", formats,
      "-show_format", "-show_streams", "-of", "json", file,
    ], 12_000);
    result = JSON.parse(stdout) as ProbeResult;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(415, "INVALID_AUDIO", "This file could not be read as audio.");
  }

  const duration = Number(result.format?.duration);
  const audio = result.streams?.find((stream) => stream.codec_type === "audio");
  const hasVideo = result.streams?.some((stream) => stream.codec_type === "video" && !stream.disposition?.attached_pic);
  const supportedUpload = /^(mp3|wav|mov|ogg|flac)(,|$)/.test(result.format?.format_name ?? "");
  if (!audio || (isUpload && (hasVideo || !supportedUpload)) || !Number.isFinite(duration) || duration <= 0) {
    throw new ApiError(415, "INVALID_AUDIO", "Choose a supported audio file.");
  }
  if (duration > maxSourceSeconds) {
    throw new ApiError(413, "TRACK_TOO_LONG", "Choose a track up to 10 minutes long.");
  }
  const tags = Object.fromEntries(Object.entries({ ...audio.tags, ...result.format?.tags })
    .map(([key, value]) => [key.toLowerCase(), value.trim().slice(0, 300)]));
  return { duration, tags };
}

export async function renderAudio(input: string, output: string, preset?: Preset, artwork?: string) {
  const cover = artwork ? [
    "-protocol_whitelist", "file", "-format_whitelist", "image2,jpeg_pipe,png_pipe,webp_pipe",
    "-i", artwork, "-map", "1:v:0", "-c:v", "mjpeg", "-disposition:v:0", "attached_pic",
  ] : [];
  await run(config.ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
    "-protocol_whitelist", "file", "-format_whitelist", formats, "-i", input,
    ...cover, "-map", "0:a:0", "-af", preset ? presets[preset].filter : "anull",
    "-c:a", "libmp3lame", "-b:a", "192k", "-f", "mp3", output,
  ]);
}
