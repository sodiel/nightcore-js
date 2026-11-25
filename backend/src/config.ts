import { resolve } from "node:path";

export const maxSourceSeconds = 600;
export const userAgent = "nightcore-js/1.0 (https://github.com/sodiel/nightcore-js)";

export const config = {
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT ?? 3001),
  legacyOrigin: process.env.PUBLIC_ORIGIN,
  tracksDir: resolve(process.env.TRACKS_DIR || "tracks"),
  webDir: process.env.WEB_DIR ? resolve(process.env.WEB_DIR) : undefined,
  ytDlp: process.env.YT_DLP_BIN || "yt-dlp",
  ffmpeg: process.env.FFMPEG_BIN || "ffmpeg",
  ffprobe: process.env.FFPROBE_BIN || "ffprobe",
};
