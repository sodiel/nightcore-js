import { useEffect, useEffectEvent, useRef, useState } from "react";
import { renderVariant, searchTrack, uploadTrack, type Track, type TrackLookup, type Variant } from "../services.ts";

import { readSharedTrack } from "../utils/sharing.ts";
import { isPrimaryMode, type Preset, type PrimaryMode } from "../config/modes.ts";

type Job =
  | { type: "upload"; file: File; preset: Preset }
  | { type: "search"; lookup: TrackLookup; preset: Preset }
  | { type: "variant"; track: Track; preset: Preset };

export function useTracks(loadAudio: (variant: Variant, previous?: Variant) => void) {
  const [shared] = useState(() => readSharedTrack(window.location.search));
  const [track, setTrack] = useState<Track | null>(null);
  const [baseMode, setBaseMode] = useState<PrimaryMode>("nightcore");
  const desiredBase = useRef<PrimaryMode>("nightcore");
  const loadedBase = useRef<PrimaryMode>("nightcore");
  const [preset, setPreset] = useState<Preset>("nightcore");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const desiredPreset = useRef<Preset>("nightcore");
  const [pending, setPending] = useState<Job | null>(null);
  const [failure, setFailure] = useState<{ message: string; job: Job } | null>(null);
  const active = useRef<{ controller: AbortController; job: Job } | null>(null);
  const currentTrack = useRef<Track | null>(null);

  const openSharedTrack = useEffectEvent((track: NonNullable<typeof shared>) => {
    void run({ type: "search", ...track });
  });

  useEffect(() => {
    if (shared) openSharedTrack(shared);
    return () => active.current?.controller.abort();
  }, [shared]);

  function updatePreset(next: Preset) {
    desiredPreset.current = next;
    setPreset(next);
    if (isPrimaryMode(next)) {
      desiredBase.current = next;
      setBaseMode(next);
    }
  }

  function cancel() {
    active.current?.controller.abort();
    active.current = null;
    setPending(null);
    setFailure(null);
  }

  async function run(job: Job) {
    active.current?.controller.abort();
    const controller = new AbortController();
    active.current = { controller, job };
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
        result = await searchTrack(job.lookup, job.preset, controller.signal);
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
      if (active.current?.controller === controller) {
        active.current = null;
        setPending(null);
      }
    }
  }

  function selectPreset(next: Preset) {
    if (next === desiredPreset.current) return;
    const currentJob = active.current?.job;
    if (currentJob?.type === "upload") {
      updatePreset(next);
      return;
    }
    if (currentJob?.type === "search") {
      void run({ ...currentJob, preset: next });
      return;
    }
    const loaded = currentTrack.current;
    if (loaded && loaded.variant.preset !== next) {
      void run({ type: "variant", track: loaded, preset: next });
      return;
    }
    cancel();
    updatePreset(next);
  }

  return {
    track, preset, baseMode, selectPreset, failure, pending, uploadProgress,
    sharedQuery: shared && "query" in shared.lookup ? shared.lookup.query : "",
    search: (query: string) => void run({ type: "search", lookup: { query }, preset: desiredPreset.current }),
    upload: (file: File) => void run({ type: "upload", file, preset: desiredPreset.current }),
    retry: () => { if (failure) void run(failure.job); },
  };
}
