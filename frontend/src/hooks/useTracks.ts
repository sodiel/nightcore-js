import { useEffect, useRef, useState } from "react";
import { renderVariant, searchTrack, uploadTrack, type Track, type Variant } from "../services.ts";

import { isPrimaryMode, type Preset, type PrimaryMode } from "../config/modes.ts";

type Job =
  | { type: "upload"; file: File; preset: Preset }
  | { type: "search"; query: string; preset: Preset }
  | { type: "variant"; track: Track; preset: Preset };

export function useTracks(loadAudio: (variant: Variant, previous?: Variant) => void) {
  const [track, setTrack] = useState<Track | null>(null);
  const [baseMode, setBaseMode] = useState<PrimaryMode>("nightcore");
  const desiredBase = useRef<PrimaryMode>("nightcore");
  const loadedBase = useRef<PrimaryMode>("nightcore");
  const [preset, setPreset] = useState<Preset>("nightcore");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const desiredPreset = useRef<Preset>("nightcore");
  const [pending, setPending] = useState<Job | null>(null);
  const [failure, setFailure] = useState<{ message: string; job: Job } | null>(null);
  const active = useRef<AbortController | null>(null);
  const currentTrack = useRef<Track | null>(null);

  useEffect(() => () => active.current?.abort(), []);

  function updatePreset(next: Preset) {
    desiredPreset.current = next;
    setPreset(next);
    if (isPrimaryMode(next)) {
      desiredBase.current = next;
      setBaseMode(next);
    }
  }

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
    updatePreset(job.preset);
    setPending(job);
    setUploadProgress(job.type === "upload" ? 0 : null);
    setFailure(null);

    try {
      let result: Track;
      if (job.type === "upload") {
        result = await uploadTrack(job.file, job.preset, controller.signal, (percent) => {
          if (!controller.signal.aborted) setUploadProgress(percent);
        });
        while (!controller.signal.aborted && result.variant.preset !== desiredPreset.current) {
          const variant = await renderVariant(result.id, desiredPreset.current, controller.signal);
          result = { ...result, variant };
        }
      } else if (job.type === "search") {
        result = await searchTrack(job.query, job.preset, controller.signal);
      } else {
        result = { ...job.track, variant: await renderVariant(job.track.id, job.preset, controller.signal) };
      }
      if (controller.signal.aborted) return;
      loadAudio(result.variant, job.type === "variant" ? currentTrack.current?.variant : undefined);
      currentTrack.current = result;
      loadedBase.current = desiredBase.current;
      setTrack(result);
    } catch (error) {
      if (controller.signal.aborted) return;
      setFailure({
        message: error instanceof Error ? error.message : "Could not prepare this track.",
        job: job.type === "upload" ? { ...job, preset: desiredPreset.current } : job,
      });
      if (job.type === "variant") {
        updatePreset(job.track.variant.preset);
        desiredBase.current = loadedBase.current;
        setBaseMode(loadedBase.current);
      }
    } finally {
      if (active.current === controller) {
        active.current = null;
        setPending(null);
      }
    }
  }

  function selectPreset(next: Preset) {
    if (next === desiredPreset.current) return;
    if (pending?.type === "upload") {
      updatePreset(next);
      return;
    }
    if (pending?.type === "search") {
      void run({ ...pending, preset: next });
      return;
    }
    if (track && track.variant.preset !== next) {
      void run({ type: "variant", track, preset: next });
      return;
    }
    cancel();
    updatePreset(next);
  }

  return {
    track, preset, baseMode, selectPreset, failure, pending, uploadProgress,
    search: (query: string) => void run({ type: "search", query, preset: desiredPreset.current }),
    upload: (file: File) => void run({ type: "upload", file, preset: desiredPreset.current }),
    retry: () => { if (failure) void run(failure.job); },
  };
}
