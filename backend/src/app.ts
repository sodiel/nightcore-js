import express, { type Express, type ErrorRequestHandler, type Request, type Response } from "express";
import cors from "cors";
import { open } from "node:fs/promises";
import { join } from "node:path";
import { config } from "./config.ts";
import { ApiError } from "./errors.ts";
import { acquireTrack, getArtwork, getSource, mediaFile, prepareOriginal, prepareVariant, trackResponse, variantFilename } from "./library.ts";
import { isLocalRequest } from "./local-auth.ts";
import { getLyrics } from "./lyrics.ts";
import { isPreset } from "./presets.ts";
import { uploadOwner, uploadTrack } from "./uploads.ts";

function requestedPreset(value: unknown) {
  if (!isPreset(value)) throw new ApiError(400, "INVALID_PRESET", "Choose an available audio mode.");
  return value;
}

async function requestedSource(req: Request, res: Response, id: string) {
  const source = await getSource(id, uploadOwner(req));
  if (source.upload) res.set("Cache-Control", "private, no-store");
  return source;
}

export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  if (config.youtubeAuth.enabled) {
    app.use((req, _res, next) => {
      if (isLocalRequest(req.get("host") ?? "", req.get("origin"), req.get("sec-fetch-site"))) next();
      else next(new ApiError(403, "LOCAL_ONLY", "Open this player from the local machine."));
    });
  }
  app.use(express.json({ limit: "8kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/tracks", async (req, res) => {
    const preset = requestedPreset(req.body?.preset);
    const source = typeof req.body?.id === "string"
      ? await getSource(req.body.id)
      : (await acquireTrack(req.body?.query)).source;
    const { variant } = await prepareVariant(source, preset);
    res.json(trackResponse(source, variant));
  });

  app.post("/api/tracks/upload", uploadTrack);

  app.post("/api/tracks/:id/variants", async (req, res) => {
    const preset = requestedPreset(req.body?.preset);
    const source = await requestedSource(req, res, req.params.id);
    const { variant } = await prepareVariant(source, preset);
    res.json(variant);
  });

  app.get("/api/tracks/:id/lyrics", async (req, res) => {
    const source = await requestedSource(req, res, req.params.id);
    res.json(await getLyrics(source));
  });

  app.get("/api/tracks/:id/artwork", async (req, res) => {
    const source = await requestedSource(req, res, req.params.id);
    const path = await getArtwork(source);
    if (!path) return res.sendStatus(404);
    const file = await open(path, "r");
    const header = Buffer.alloc(12);
    try { await file.read(header); } finally { await file.close(); }
    const mime = header.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ? "image/jpeg"
      : header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "image/png"
      : header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP" ? "image/webp"
      : undefined;
    if (!mime) return res.sendStatus(404);
    res.type(mime).sendFile(path, { cacheControl: !source.upload, headers: { "X-Content-Type-Options": "nosniff" } });
  });

  app.get("/api/media/:id/:filename", async (req, res) => {
    const source = await requestedSource(req, res, req.params.id);
    const media = await mediaFile(source, req.params.filename);
    if (req.query.download === "1") res.attachment(media.filename);
    res.type(media.mime).sendFile(media.path, { cacheControl: !source.upload, headers: { "X-Content-Type-Options": "nosniff" } });
  });

  const legacyCors = cors({
    origin: config.legacyOrigin ? [config.legacyOrigin, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/] : /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  });
  app.options("/process", legacyCors);
  app.post("/process", legacyCors, async (req, res) => {
    const { source, reused } = await acquireTrack(req.body?.trackQuery);
    const result = await prepareVariant(source, "nightcore");
    await prepareOriginal(source);
    const origin = config.legacyOrigin || `http://localhost:${config.port}`;
    res.json({
      success: true,
      cached: reused && result.reused,
      originalUrl: new URL(`/api/media/${source.id}/original.mp3`, origin).href,
      nightcoreUrl: new URL(result.variant.mediaUrl, origin).href,
      filename: "original.mp3",
      nightcoreFilename: variantFilename("nightcore"),
      metadata: source.metadata,
    });
  });

  app.get(/^\/[a-f0-9]{32}(?:_nightcore)?\.mp3$/, (req, res, next) => {
    res.sendFile(req.path.slice(1), { root: config.tracksDir }, (error) => {
      if (error) next(error);
    });
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ code: "NOT_FOUND", error: "This endpoint could not be found." });
  });

  if (config.webDir) {
    const index = join(config.webDir, "index.html");
    app.use(express.static(config.webDir));
    app.get("/", (_req, res) => res.sendFile(index));
  }

  const handleError: ErrorRequestHandler = (error: unknown, _req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ApiError) {
      res.status(error.status).json({ code: error.code, error: error.message });
      return;
    }
    const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
    if (status === 400 || status === 404 || status === 413 || status === 416) {
      res.status(status).json({ code: "REQUEST_FAILED", error: "The request could not be completed." });
      return;
    }
    console.error("Media request failed", error instanceof Error ? error.name : typeof error);
    res.status(500).json({ code: "PROCESSING_FAILED", error: "Could not prepare this track. Try again." });
  };
  app.use(handleError);
  return app;
}
