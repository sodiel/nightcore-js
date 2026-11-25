import { createHash } from "node:crypto";
import { access, copyFile, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { probeAudio, renderAudio } from "./audio.ts";
import { config } from "./config.ts";
import { ApiError } from "./errors.ts";
import { catalogMetadata, sourceMetadata, youtubeRecording, type Metadata, type Recording } from "./metadata.ts";
import { presets, type Preset } from "./presets.ts";
import { downloadSource, youtubeInput } from "./youtube.ts";

export interface Source {
  id: string;
  metadata: Metadata | null;
  originalDuration: number;
  recording?: Recording;
}

interface Variant {
  preset: Preset;
  mediaUrl: string;
  tempoFactor: number;
}

const root = join(config.tracksDir, "library");
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
}

export async function getSource(id: string): Promise<Source> {
  if (!/^[a-f0-9]{64}$/.test(id)) throw missingTrack();
  let source: Source;
  try {
    source = JSON.parse(await readFile(join(sourceDir(id), "source.json"), "utf8")) as Source;
  } catch {
    throw missingTrack();
  }
  return source;
}

function missingTrack() {
  return new ApiError(404, "TRACK_MISSING", "This track is no longer available. Load it again.");
}

export async function saveSource(id: string, prepare: (file: string) => Promise<Omit<Source, "id">>) {
  const staging = await mkdtemp(join(root, ".source-"));
  try {
    const source = { id, ...await prepare(join(staging, "original.audio")) };
    await writeFile(join(staging, "source.json"), JSON.stringify(source));
    await rename(staging, sourceDir(id));
    return source;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

export async function acquireTrack(value: unknown) {
  const { query, input, isSearch } = youtubeInput(value);
  const id = createHash("sha256").update(input).digest("hex");
  return once(`source:${id}`, async () => {
    const existing = await getSource(id).catch(() => null);
    if (existing) return { source: existing, reused: true };

    const legacyHash = createHash("md5").update(typeof value === "string" ? value : query).digest("hex");
    const legacyFile = join(config.tracksDir, `${legacyHash}.mp3`);
    const legacyProbe = await readable(legacyFile) ? await probeAudio(legacyFile).catch(() => null) : null;
    const source = await saveSource(id, async (original) => {
      if (legacyProbe) {
        await copyFile(legacyFile, original);
        const metadata = await readFile(join(config.tracksDir, `${legacyHash}_metadata.json`), "utf8")
          .then((json) => JSON.parse(json) as Metadata, () => null).catch(() => null);
        const { title, artist } = legacyProbe.tags;
        return { originalDuration: legacyProbe.duration, metadata, ...(title && artist ? { recording: { title, artist } } : {}) };
      }
      const info = await downloadSource(input, original);
      const { duration } = await probeAudio(original);
      const recording = youtubeRecording(info);
      const extracted = sourceMetadata(info);
      const metadata = recording
        ? { title: recording.title, artist: recording.artist, artworkUrl: extracted?.artworkUrl ?? "" }
        : extracted ?? (isSearch ? await catalogMetadata(query) : null);
      return { originalDuration: duration, metadata, ...(recording ? { recording } : {}) };
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

export function variantFilename(preset: Preset) {
  return `${preset}-${presets[preset].version}.mp3`;
}

async function renderFile(source: Source, filename: string, preset?: Preset) {
  const dir = sourceDir(source.id);
  const output = join(dir, filename);
  return once(`render:${output}`, async () => {
    if (await readable(output)) return true;
    const temporary = join(dir, `.${filename}.tmp`);
    try {
      const input = join(dir, "original.audio");
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

export async function prepareVariant(source: Source, preset: Preset) {
  const filename = variantFilename(preset);
  const reused = await renderFile(source, filename, preset);
  const variant: Variant = { preset, mediaUrl: `/api/media/${source.id}/${filename}`, tempoFactor: presets[preset].tempoFactor };
  return { variant, reused };
}

export async function prepareOriginal(source: Source) {
  await renderFile(source, "original.mp3");
}

export function trackResponse(source: Source, variant: Variant) {
  return { id: source.id, metadata: source.metadata, originalDuration: source.originalDuration, variant };
}

export async function mediaFile(source: Source, filename: string) {
  const valid = filename === "original.mp3" || (Object.keys(presets) as Preset[]).some((preset) => variantFilename(preset) === filename);
  if (!valid) throw missingTrack();
  const file = join(sourceDir(source.id), filename);
  if (!(await stat(file).catch(() => null))?.isFile()) throw missingTrack();
  return file;
}
