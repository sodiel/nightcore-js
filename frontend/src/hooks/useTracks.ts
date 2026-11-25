import { useEffect, useRef, useState } from "react";
import { renderVariant, searchTrack, type Preset, type Track, type Variant } from "../services.ts";

type Job =
  | { type: "search"; query: string; preset: Preset }
  | { type: "variant"; track: Track; preset: Preset };

export function useTracks(loadAudio: (variant: Variant, previous?: Variant) => void) {
  const [track, setTrack] = useState<Track | null>(null);
  const [preset, setPreset] = useState<Preset>("nightcore");
  const [pending, setPending] = useState<Job | null>(null);
  const [failure, setFailure] = useState<{ message: string; job: Job } | null>(null);
  const active = useRef<AbortController | null>(null);
  const currentTrack = useRef<Track | null>(null);

  useEffect(() => () => active.current?.abort(), []);

  function cancel() {
    active.current?.abort();
    active.current = null;
    setPending(null);
    setFailure(null);
  }

  async function run(job: Job) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setPreset(job.preset);
    setPending(job);
    setFailure(null);

    try {
      const result = job.type === "search"
        ? await searchTrack(job.query, job.preset, controller.signal)
        : { ...job.track, variant: await renderVariant(job.track.id, job.preset, controller.signal) };
      if (controller.signal.aborted) return;
      loadAudio(result.variant, job.type === "variant" ? currentTrack.current?.variant : undefined);
      currentTrack.current = result;
      setTrack(result);
    } catch (error) {
      if (controller.signal.aborted) return;
      setFailure({ message: error instanceof Error ? error.message : "Could not prepare this track.", job });
      if (job.type === "variant") setPreset(job.track.variant.preset);
    } finally {
      if (active.current === controller) {
        active.current = null;
        setPending(null);
      }
    }
  }

  function selectPreset(next: Preset) {
    if (next === preset) return;
    if (pending?.type === "search") {
      void run({ ...pending, preset: next });
      return;
    }
    if (track && track.variant.preset !== next) {
      void run({ type: "variant", track, preset: next });
      return;
    }
    cancel();
    setPreset(next);
  }

  return {
    track, preset, selectPreset, failure, pending,
    search: (query: string) => void run({ type: "search", query, preset }),
    retry: () => { if (failure) void run(failure.job); },
  };
}
