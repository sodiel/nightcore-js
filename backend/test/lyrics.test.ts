import assert from "node:assert/strict";
import { test } from "node:test";
import { getLyrics, parseLrc } from "../src/lyrics.ts";
import { youtubeRecording } from "../src/metadata.ts";
import type { Source } from "../src/library.ts";

test("parses sorted timestamps, repeated cues, offsets and instrumental gaps", () => {
  assert.deepEqual(parseLrc([
    "[02:04.032]End",
    "[offset: -50]",
    "[00:01.1][00:03.25]First",
    "[00:01.10]Harmony",
    "[00:04.0]",
    "[00:60.00]Invalid",
    "text [00:05.00]Invalid",
  ].join("\n")), [
    { time: 1.05, text: "First\nHarmony" },
    { time: 3.2, text: "First" },
    { time: 3.95, text: "" },
    { time: 123.982, text: "End" },
  ]);
});

test("identifies a recording without mistaking an arbitrary uploader for the artist", () => {
  assert.deepEqual(youtubeRecording({ title: "Singer - A song (Official Video)", uploader: "SingerVEVO" }), {
    artist: "Singer", title: "A song",
  });
  assert.equal(youtubeRecording({ title: "Singer - A song", uploader: "Unrelated channel" }), null);
});

test("distinguishes a retryable provider failure, plain lyrics, and duration mismatch", async (t) => {
  const source: Source = {
    id: "test", originalDuration: 180, metadata: null,
    recording: { title: "A song", artist: "Singer" },
  };
  const replies = [
    new Response("", { status: 503 }),
    Response.json({ duration: 180, plainLyrics: "Hello" }),
    Response.json({ duration: 190, syncedLyrics: "[00:01]Wrong" }),
  ];
  const provider = t.mock.method(globalThis, "fetch", async () => replies.shift());
  await assert.rejects(getLyrics(source), { code: "LYRICS_TEMPORARY" });
  assert.deepEqual(await getLyrics(source), { status: "plain", text: "Hello" });
  assert.deepEqual(await getLyrics(source), { status: "plain", text: "Hello" });
  assert.deepEqual(await getLyrics({ ...source, originalDuration: 181 }), { status: "unavailable" });
  assert.equal(provider.mock.callCount(), 3);
});
