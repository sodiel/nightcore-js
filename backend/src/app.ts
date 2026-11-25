import express, { type Express, type ErrorRequestHandler, type Request, type Response } from "express";
import cors from "cors";
import { join } from "node:path";
import { config } from "./config.ts";
import { ApiError } from "./errors.ts";
import { acquireTrack, getSource, mediaFile, prepareOriginal, prepareVariant, trackResponse, variantFilename } from "./library.ts";
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
  app.use(express.json({ limit: "8kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/tracks", async (req, res) => {
    const preset = requestedPreset(req.body?.preset);
    const { source } = await acquireTrack(req.body?.query);
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

  app.get("/api/media/:id/:filename", async (req, res) => {
    const source = await requestedSource(req, res, req.params.id);
    res.sendFile(await mediaFile(source, req.params.filename), { cacheControl: !source.upload, headers: { "X-Content-Type-Options": "nosniff" } });
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
