import { createHash, randomUUID } from "node:crypto";
import { access, copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { probeAudio, renderAudio, type AudioFormat } from "./audio.ts";
import { config } from "./config.ts";
import { ApiError } from "./errors.ts";
import { catalogMetadata, sourceMetadata, youtubeRecording, type Metadata, type Recording } from "./metadata.ts";
import { presets, type EffectPreset, type Preset } from "./presets.ts";
import { downloadSource, youtubeInput } from "./youtube.ts";

export interface Source {
  id: string;
  metadata: Metadata | null;
  originalDuration: number;
  recording?: Recording;
  format?: AudioFormat;
  videoId?: string;
  upload?: { owner: string; expiresAt: number };
}

interface Variant {
  preset: Preset;
  mediaUrl: string;
  tempoFactor: number;
  filename: string;
  mime: string;
}

const originalFilename = "original.audio";
const root = join(config.tracksDir, config.youtubeAuth.enabled ? "library-local-youtube" : "library");
const work = new Map<string, Promise<unknown>>();

export function once<T>(key: string, action: () => Promise<T>): Promise<T> {
  const pending = work.get(key);
  if (pending) return pending as Promise<T>;
  const promise = action().finally(() => work.delete(key));
  work.set(key, promise);
  return promise;
}

async function readable(path: string) {
  return access(path).then(() => true, () => false);
}

export function sourceDir(id: string) {
  return join(root, id);
}

export async function initializeLibrary() {
  await mkdir(root, { recursive: true });
  await clearExpiredUploads();
  setInterval(() => {
    void clearExpiredUploads().catch(() => console.error("Could not clean up expired uploads"));
  }, 60 * 60 * 1000).unref();
}

async function clearExpiredUploads() {
  for (const dir of await readdir(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    if (dir.name.startsWith(".source-")) {
      const staging = join(root, dir.name);
      const entry = await stat(staging).catch(() => null);
      if (entry && entry.mtimeMs + 60 * 60 * 1000 < Date.now()) {
        await rm(staging, { recursive: true, force: true });
      }
    } else if (/^[a-f0-9]{64}$/.test(dir.name)) {
      const source = await readFile(join(sourceDir(dir.name), "source.json"), "utf8")
        .then((json) => JSON.parse(json) as Source).catch(() => null);
      if (source?.upload && source.upload.expiresAt <= Date.now()) await forgetSource(dir.name);
    }
  }
}

export async function forgetSource(id: string) {
  if (/^[a-f0-9]{64}$/.test(id)) await rm(sourceDir(id), { recursive: true, force: true });
}

export async function getSource(id: string, owner?: string): Promise<Source> {
  if (!/^[a-f0-9]{64}$/.test(id)) throw missingTrack();
  let source: Source;
  try {
    source = JSON.parse(await readFile(join(sourceDir(id), "source.json"), "utf8")) as Source;
  } catch {
    throw missingTrack();
  }
  if (source.upload && (source.upload.owner !== owner || source.upload.expiresAt <= Date.now())) throw missingTrack();
  return source;
}

function missingTrack() {
  return new ApiError(404, "TRACK_MISSING", "This track is no longer available. Load it again.");
}

export async function saveSource(id: string, prepare: (file: string) => Promise<Omit<Source, "id">>) {
  const staging = await mkdtemp(join(root, ".source-"));
  try {
    const source = { id, ...await prepare(join(staging, originalFilename)) };
    await writeFile(join(staging, "source.json"), JSON.stringify(source));
    try {
      await rename(staging, sourceDir(id));
      return source;
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
      if (!source.upload && (code === "EEXIST" || code === "ENOTEMPTY")) return getSource(id);
      throw error;
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

export async function acquireTrack(value: unknown) {
  const { query, input, isSearch } = youtubeInput(value);
  const id = createHash("sha256").update(input).digest("hex");
  const videoId = isSearch ? undefined : new URL(input).searchParams.get("v") ?? undefined;
  const videoSource = videoId ? { videoId } : {};
  return once(`source:${id}`, async () => {
    const existing = await getSource(id).catch(() => null);
    if (existing) return { source: { ...existing, ...videoSource }, reused: true };

    const legacyHash = createHash("md5").update(typeof value === "string" ? value : query).digest("hex");
    const legacyFile = join(config.tracksDir, `${legacyHash}.mp3`);
    const legacyProbe = await readable(legacyFile) ? await probeAudio(legacyFile).catch(() => null) : null;
    const source = await saveSource(id, async (original) => {
      if (legacyProbe) {
        await copyFile(legacyFile, original);
        const savedMetadata = await readFile(join(config.tracksDir, `${legacyHash}_metadata.json`), "utf8")
          .then((json) => JSON.parse(json) as Metadata, () => null).catch(() => null);
        const { title, artist } = legacyProbe.tags;
        const metadata = savedMetadata ?? (title || isSearch ? { title: title || query, artist: artist || "", artworkUrl: "" } : null);
        return { originalDuration: legacyProbe.duration, format: legacyProbe.format, metadata, ...videoSource, ...(title && artist ? { recording: { title, artist } } : {}) };
      }
      const info = await downloadSource(input, original);
      const { duration, format } = await probeAudio(original);
      const recording = youtubeRecording(info);
      const extracted = sourceMetadata(info);
      const metadata = recording
        ? { title: recording.title, artist: recording.artist, artworkUrl: extracted?.artworkUrl ?? "" }
        : extracted ?? (isSearch ? await catalogMetadata(query) : null);
      const resolvedId = typeof info.id === "string" && /^[\w-]{11}$/.test(info.id) ? { videoId: info.id } : videoSource;
      return { originalDuration: duration, format, metadata, ...resolvedId, ...(recording ? { recording } : {}) };
    });
    return { source, reused: Boolean(legacyProbe) };
  });
}

async function saveCover(source: Source) {
  if (!source.metadata?.artworkUrl) return;
  try {
    const url = new URL(source.metadata.artworkUrl);
    if (url.protocol !== "https:" || !/^(?:i\d?\.ytimg\.com|is\d+-ssl\.mzstatic\.com)$/.test(url.hostname)) return;
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(3500) });
    if (!response.ok || !response.body || !/^image\/(jpeg|png|webp)\b/i.test(response.headers.get("content-type") ?? "")) return;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) {
        await reader.cancel();
        return;
      }
      chunks.push(value);
    }
    const cover = join(sourceDir(source.id), "artwork");
    await writeFile(cover, Buffer.concat(chunks));
    return cover;
  } catch {
    // Optional remote artwork must not prevent playback.
  }
}

export function variantFilename(preset: EffectPreset) {
  return `${preset}-${presets[preset].version}.mp3`;
}

async function renderFile(source: Source, filename: string, preset?: EffectPreset) {
  const dir = sourceDir(source.id);
  const output = join(dir, filename);
  return once(`render:${output}`, async () => {
    if (await readable(output)) return true;
    const temporary = join(dir, `.${filename}.${randomUUID()}.tmp`);
    try {
      const input = join(dir, originalFilename);
      const cover = preset ? await once(`cover:${source.id}`, async () => {
        const stored = join(dir, "artwork");
        return await readable(stored) ? stored : saveCover(source);
      }) : undefined;
      try {
        await renderAudio(input, temporary, preset, cover);
      } catch (error) {
        if (!cover || error instanceof ApiError) throw error;
        await renderAudio(input, temporary, preset);
      }
      await rename(temporary, output);
      return false;
    } finally {
      await rm(temporary, { force: true });
    }
  });
}

function originalFormat(source: Source) {
  if (source.format) return Promise.resolve(source.format);
  // Older cache entries predate the persisted format. Their source bytes stay in place.
  return once(`probe-original:${source.id}`, async () => {
    const probe = await probeAudio(join(sourceDir(source.id), originalFilename));
    return probe.format;
  });
}

function audioFilename(source: Source, extension: string, effect?: EffectPreset) {
  const title = source.metadata?.title || "Track";
  const artist = source.metadata?.artist;
  const clean = (artist ? `${artist} - ${title}` : title).toWellFormed()
    .replace(/[<>:"/\\|?*\p{Cc}\p{Cf}]/gu, "_");
  const stem = Array.from(clean).slice(0, 54).join("").replace(/[. ]+$/, "").trim() || "Track";
  return `${stem}${effect ? ` - ${effect}` : ""}.${extension}`;
}

export async function prepareVariant(source: Source, preset: Preset) {
  if (preset === "original") {
    const media = await mediaFile(source, originalFilename);
    const variant: Variant = {
      preset, tempoFactor: 1,
      mediaUrl: `/api/media/${source.id}/${originalFilename}`,
      filename: media.filename,
      mime: media.mime,
    };
    return { variant, reused: true };
  }
  const filename = variantFilename(preset);
  const reused = await renderFile(source, filename, preset);
  const variant: Variant = {
    preset, tempoFactor: presets[preset].tempoFactor,
    mediaUrl: `/api/media/${source.id}/${filename}`,
    filename: audioFilename(source, "mp3", preset),
    mime: "audio/mpeg",
  };
  return { variant, reused };
}

export async function prepareOriginal(source: Source) {
  await renderFile(source, "original.mp3");
}

export function trackResponse(source: Source, variant: Variant) {
  const origin = source.upload
    ? { kind: "upload" as const }
    : { kind: "youtube" as const, ...(source.videoId ? { videoId: source.videoId } : {}) };
  return { id: source.id, metadata: source.metadata, originalDuration: source.originalDuration, origin, variant };
}

export async function mediaFile(source: Source, storedFilename: string) {
  const effect = (Object.keys(presets) as EffectPreset[]).find((preset) => variantFilename(preset) === storedFilename);
  const unprocessed = storedFilename === originalFilename;
  if (!unprocessed && storedFilename !== "original.mp3" && !effect) throw missingTrack();
  const path = join(sourceDir(source.id), storedFilename);
  if (!(await stat(path).catch(() => null))?.isFile()) throw missingTrack();
  const format = unprocessed ? await originalFormat(source) : { extension: "mp3", mime: "audio/mpeg" };
  return { path, mime: format.mime, filename: audioFilename(source, format.extension, effect) };
}
