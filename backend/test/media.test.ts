import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { once } from "node:events";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

test("renders originals and private uploads through their normal API routes", async (t) => {
  const storage = await mkdtemp(join(tmpdir(), "nightcore-test-"));
  const previous = process.env.TRACKS_DIR;
  process.env.TRACKS_DIR = storage;
  let server: Server | undefined;
  t.after(async () => {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await rm(storage, { recursive: true, force: true });
    if (previous === undefined) delete process.env.TRACKS_DIR;
    else process.env.TRACKS_DIR = previous;
  });

  const { createApp } = await import("../src/app.ts");
  const { initializeLibrary } = await import("../src/library.ts");
  const { probeAudio } = await import("../src/audio.ts");
  const { run } = await import("../src/tools.ts");
  await initializeLibrary();
  server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = (path: string, body: object, headers = {}) => fetch(`${base}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
  });
  const query = "Existing test track";
  const legacyHash = createHash("md5").update(query).digest("hex");
  const legacy = join(storage, `${legacyHash}.mp3`);
  const sample = "sine=frequency=400:sample_rate=";
  await run("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", `${sample}44100:duration=3`, legacy]);
  const pair = await Promise.all([
    request("/api/tracks", { query, preset: "nightcore" }),
    request("/api/tracks", { query, preset: "nightcore" }),
  ]);
  assert.deepEqual(pair.map((response) => response.status), [200, 200]);
  const first = await pair[0]!.json();
  assert.deepEqual(await pair[1]!.json(), first);
  const nightcore = join(storage, "library", first.id, "nightcore-1.mp3");
  assert.ok(Math.abs((await probeAudio(nightcore)).duration - 3 / 1.15) < 0.1);
  async function frequency(path: string) {
    const pcm = join(storage, "frequency.pcm");
    await run("ffmpeg", ["-v", "error", "-y", "-i", path, "-ss", "0.2", "-t", "0.5",
      "-ac", "1", "-ar", "44100", "-f", "s16le", pcm]);
    const samples = await readFile(pcm);
    let crossings = 0;
    for (let offset = 2; offset < samples.length; offset += 2) {
      if (samples.readInt16LE(offset - 2) <= 0 && samples.readInt16LE(offset) > 0) crossings++;
    }
    return crossings * 88200 / samples.length;
  }
  assert.ok(Math.abs(await frequency(nightcore) - 460) < 4);
  const original = await request("/process", { trackQuery: query }).then((response) => response.json());
  assert.equal(original.cached, true);
  assert.ok(original.nightcoreUrl.endsWith("nightcore-1.mp3"));

  const wave = join(storage, "test.wav");
  await run("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", `${sample}48000:duration=3`, wave]);
  function upload(body: Blob, name: string, preset = "daycore") {
    const form = new FormData();
    form.append("preset", preset);
    form.append("file", body, name);
    return fetch(`${base}/api/tracks/upload`, { method: "POST", body: form });
  }

  const invalid = await upload(new Blob(["Unreadable audio"]), "fake.mp3");
  assert.equal(invalid.status, 415);
  assert.equal((await readdir(join(storage, "library"))).length, 1);

  const uploaded = await upload(new Blob([await readFile(wave)]), "Upload test.wav");
  assert.equal(uploaded.status, 201, await uploaded.clone().text());
  const cookie = uploaded.headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly; SameSite=Strict/);
  const headers = { Cookie: cookie.split(";")[0]! };
  const track = await uploaded.json();
  assert.equal(track.metadata.title, "Upload test");
  assert.equal(track.originalDuration, 3);
  assert.equal(track.variant.tempoFactor, 0.85);

  const duration = await probeAudio(join(storage, "library", track.id, "daycore-1.mp3"));
  assert.ok(Math.abs(duration.duration - 3 / 0.85) < 0.1);
  assert.ok(Math.abs(await frequency(join(storage, "library", track.id, "daycore-1.mp3")) - 340) < 4);

  const media = await fetch(base + track.variant.mediaUrl, { headers: { ...headers, Range: "bytes=0-1023" } });
  assert.equal(media.status, 206);
  assert.equal(media.headers.get("cache-control"), "private, no-store");
  assert.equal((await media.arrayBuffer()).byteLength, 1024);
  const noAccess = await fetch(base + track.variant.mediaUrl);
  assert.equal(noAccess.status, 404);
  assert.equal((await request(`/api/tracks/${track.id}/variants`, { preset: "nightcore" })).status, 404);
  assert.equal((await fetch(`${base}/api/tracks/${track.id}/lyrics`)).status, 404);
  const newVariant = await request(`/api/tracks/${track.id}/variants`, { preset: "nightcore" }, headers);
  assert.equal(newVariant.status, 200);
  assert.equal((await newVariant.json()).tempoFactor, 1.15);
  for (const [preset, factor, tail] of [
    ["sped-up", 1.25, 0], ["slowed-reverb", 0.85, 0.137], ["bass-boost", 1, 0], ["8d-audio", 1, 0],
  ] as const) {
    const response = await request(`/api/tracks/${track.id}/variants`, { preset }, headers);
    assert.equal(response.status, 200, await response.clone().text());
    const variant = await response.json();
    assert.equal(variant.tempoFactor, factor);
    const output = join(storage, "library", track.id, `${preset}-1.mp3`);
    assert.ok(Math.abs((await probeAudio(output)).duration - (3 / factor + tail)) < 0.1);
    if (preset === "sped-up") assert.ok(Math.abs(await frequency(output) - 400) < 4);
    if (preset === "8d-audio") {
      const { stdout } = await run("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries",
        "stream=channels", "-of", "csv=p=0", output]);
      assert.equal(stdout.trim(), "2");
    }
  }
  const sourcePath = join(storage, "library", track.id, "source.json");
  const source = JSON.parse(await readFile(sourcePath, "utf8"));
  source.upload.expiresAt = Date.now() - 1;
  await writeFile(sourcePath, JSON.stringify(source));
  assert.equal((await fetch(base + track.variant.mediaUrl, { headers })).status, 404);
});
