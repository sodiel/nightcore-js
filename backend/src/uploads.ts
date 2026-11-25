import busboy from "busboy";
import type { Request, Response } from "express";
import { createHash, randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { extname } from "node:path";
import { probeAudio } from "./audio.ts";
import { config } from "./config.ts";
import { ApiError } from "./errors.ts";
import { forgetSource, prepareVariant, saveSource, trackResponse } from "./library.ts";
import { isPreset, type Preset } from "./presets.ts";

const maxBytes = 50_000_000;
const sessionAge = 24 * 60 * 60 * 1000;
const cookie = "nightcore_session";
let active = 0;

export function uploadOwner(req: Request) {
  const value = sessionToken(req);
  return value ? hash(value) : undefined;
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sessionToken(req: Request) {
  return req.headers.cookie?.match(/(?:^|;\s*)nightcore_session=([a-f0-9]{64})(?:;|$)/)?.[1];
}

function uploadSession(req: Request, res: Response) {
  const token = sessionToken(req) ?? randomBytes(32).toString("hex");
  res.cookie(cookie, token, {
    httpOnly: true, sameSite: "strict", path: "/api", maxAge: sessionAge,
    secure: req.secure || Boolean(config.legacyOrigin?.startsWith("https://")),
  });
  return hash(token);
}

function invalidUpload() {
  return new ApiError(400, "INVALID_UPLOAD", "Choose one audio file and an audio mode.");
}

function tooLarge() {
  return new ApiError(413, "UPLOAD_TOO_LARGE", "Choose a file up to 50 MB.");
}

async function receiveFile(req: Request, destination: string) {
  const bodyLimit = maxBytes + 65536;
  if (Number(req.headers["content-length"]) > bodyLimit) throw tooLarge();
  if (req.aborted || req.destroyed) throw invalidUpload();
  let parser: ReturnType<typeof busboy>;
  try {
    parser = busboy({ headers: req.headers, limits: { fileSize: maxBytes + 1, parts: 3, files: 1, fields: 1, fieldSize: 32 } });
  } catch {
    throw invalidUpload();
  }

  const controller = new AbortController();
  let writing: Promise<void> | undefined;
  let failure: ApiError | undefined;
  let preset: Preset | undefined;
  let filename = "";
  let bytes = 0;

  function fail(error: ApiError) {
    failure ??= error;
  }

  function onAborted() {
    controller.abort();
    parser.destroy(invalidUpload());
  }

  function count(chunk: Buffer) {
    bytes += chunk.length;
    if (bytes > bodyLimit) {
      fail(tooLarge());
      req.unpipe(parser);
      req.resume();
      controller.abort();
      parser.destroy(failure);
    }
  }

  parser.on("file", (field, stream, info) => {
    if (field !== "file" || !info.filename) {
      fail(invalidUpload());
      stream.resume();
      return;
    }
    filename = info.filename;
    stream.on("limit", () => fail(tooLarge()));
    writing = pipeline(stream, createWriteStream(destination, { flags: "wx", mode: 0o600 }), { signal: controller.signal })
      .catch(() => {
        fail(new ApiError(400, "UPLOAD_INTERRUPTED", "The upload was interrupted. Choose the file again."));
        if (!parser.destroyed) parser.destroy(failure);
      });
  });
  parser.on("field", (name, value, info) => {
    if (name === "preset" && !info.valueTruncated && isPreset(value)) preset = value;
    else fail(invalidUpload());
  });
  parser.on("filesLimit", () => fail(invalidUpload()));
  parser.on("fieldsLimit", () => fail(invalidUpload()));
  parser.on("partsLimit", () => fail(invalidUpload()));

  const drained = new Promise<void>((resolve) => {
    parser.on("error", () => {
      fail(invalidUpload());
      controller.abort();
    });
    parser.once("close", resolve);
  });
  req.on("data", count);
  req.once("aborted", onAborted);
  const timeout = setTimeout(() => {
    fail(new ApiError(408, "UPLOAD_TIMEOUT", "The upload timed out. Try again."));
    onAborted();
  }, 90_000);

  try {
    req.pipe(parser);
    await drained;
    await writing;
    if (failure) throw failure;
    if (!filename || !preset) throw invalidUpload();
    return { filename, preset };
  } finally {
    clearTimeout(timeout);
    req.removeListener("data", count);
    req.removeListener("aborted", onAborted);
    if (!req.complete && !req.destroyed) {
      req.unpipe(parser);
      req.resume();
    }
  }
}

export async function uploadTrack(req: Request, res: Response) {
  const origin = req.get("origin");
  const sameHost = origin === `${req.protocol}://${req.get("host")}` || origin === config.legacyOrigin;
  if (req.get("sec-fetch-site") === "cross-site" || (origin && !sameHost)) {
    throw new ApiError(403, "UPLOAD_ORIGIN", "Open the player directly to upload a file.");
  }
  if (active >= 4) throw new ApiError(503, "BUSY", "Processing is busy. Try again shortly.");
  active++;
  const id = randomBytes(32).toString("hex");

  try {
    let selected: Preset = "nightcore";
    const source = await saveSource(id, async (file) => {
      const received = await receiveFile(req, file);
      selected = received.preset;
      const { duration, tags, format } = await probeAudio(file, true);
      const { title, artist, album } = tags;
      const displayName = received.filename.slice(0, received.filename.length - extname(received.filename).length)
        .replace(/[\p{Cc}\p{Cf}]/gu, "").trim().slice(0, 180);
      return {
        originalDuration: duration,
        format,
        metadata: { title: title || displayName || "Audio file", artist: artist || "", artworkUrl: "" },
        ...(title && artist ? { recording: { title, artist, ...(album ? { album } : {}) } } : {}),
        upload: { owner: uploadSession(req, res), expiresAt: Date.now() + sessionAge },
      };
    });
    const { variant } = await prepareVariant(source, selected);
    res.set("Cache-Control", "private, no-store").status(201).json(trackResponse(source, variant));
  } catch (error) {
    await forgetSource(id);
    throw error;
  } finally {
    active--;
  }
}
