import { useRef, useState } from "react";
import type { Variant } from "../services.ts";

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const positionToRestore = useRef({ seconds: 0, resume: false });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  function play(audio: HTMLAudioElement) {
    const source = audio.src;
    void audio.play().catch((cause: unknown) => {
      if (audio.src !== source || (cause instanceof DOMException && cause.name === "AbortError")) return;
      setError("Playback could not start. Press Play to try again.");
    });
  }

  function load(variant: Variant, previous?: Variant) {
    const audio = audioRef.current;
    if (!audio) return;
    const pendingPosition = audio.readyState >= 1 ? audio.currentTime : positionToRestore.current.seconds;
    positionToRestore.current = {
      seconds: previous ? pendingPosition * previous.tempoFactor / variant.tempoFactor : 0,
      resume: Boolean(previous && ((!audio.paused && !audio.ended) || (audio.readyState < 1 && positionToRestore.current.resume))),
    };
    setDuration(0);
    setCurrentTime(positionToRestore.current.seconds);
    setPlaying(false);
    setError("");
    audio.src = variant.mediaUrl;
  }

  function onLoadedMetadata() {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    const { seconds, resume } = positionToRestore.current;
    positionToRestore.current = { seconds: 0, resume: false };
    setDuration(audio.duration);
    audio.currentTime = Math.min(seconds, audio.duration);
    setCurrentTime(audio.currentTime);
    if (resume && audio.currentTime < audio.duration) play(audio);
  }

  function seek(seconds: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || !Number.isFinite(seconds)) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration));
    setCurrentTime(audio.currentTime);
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio?.src) return;
    setError("");
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (audio.ended) seek(0);
    play(audio);
  }

  const syncTime = () => setCurrentTime(audioRef.current?.currentTime ?? 0);

  return {
    audioRef, load, seek, toggle, currentTime, duration, playing, error,
    events: {
      onLoadedMetadata,
      onTimeUpdate: syncTime,
      onSeeked: syncTime,
      onPlay: () => setPlaying(true),
      onPause: () => setPlaying(false),
      onEnded: () => setPlaying(false),
      onError: () => {
        setPlaying(false);
        setError("This audio could not be loaded. Try opening the track again.");
      },
    },
  };
}
