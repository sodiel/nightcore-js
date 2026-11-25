import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "./config.ts";
import { ApiError } from "./errors.ts";

const exec = promisify(execFile);
const waiting: Array<() => void> = [];
let active = 0;

export async function run(binary: string, args: string[], timeout = 60_000) {
  if (active < 2) {
    active++;
  } else {
    if (waiting.length >= 16) {
      throw new ApiError(503, "BUSY", "Processing is busy. Try again shortly.");
    }
    await new Promise<void>((resolve) => waiting.push(resolve));
  }

  try {
    return await exec(binary, args, {
      timeout,
      killSignal: "SIGKILL",
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    });
  } finally {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}

export async function checkTools() {
  const tools = [[config.ytDlp, "--version"], [config.ffmpeg, "-version"], [config.ffprobe, "-version"]] as const;
  for (const [binary, flag] of tools) {
    try {
      await run(binary, [flag], 10_000);
    } catch {
      throw new Error(`Could not run ${binary}. Check the media tool installation in README.md.`);
    }
  }
}
