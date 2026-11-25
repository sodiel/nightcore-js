import { useEffect, useRef, useState } from "react";
import { fetchLyrics, type Lyrics, type LyricLine, type Track } from "../services.ts";
import { formatTime } from "../utils/formatTime.ts";
import { activeLyricIndex } from "../utils/lyrics.ts";

interface Props {
  track: Track;
  time: number;
  duration: number;
  seek: (seconds: number) => void;
}

function SyncedLyrics({ lines, factor, time, duration, seek }: {
  lines: LyricLine[]; factor: number; time: number; duration: number; seek: (seconds: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const activeLine = useRef<HTMLButtonElement>(null);
  const [follow, setFollow] = useState(true);
  const active = activeLyricIndex(lines, time * factor);

  useEffect(() => {
    const list = scroller.current;
    const button = activeLine.current;
    if (!follow || !list || !button) return;
    const top = button.offsetTop - (list.clientHeight - button.offsetHeight) / 2;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({ top, behavior: reduceMotion ? "instant" : "smooth" });
  }, [active, follow]);

  function stopFollowing() { setFollow(false); }

  return (
    <>
      <div className="lyrics-lines" ref={scroller} onWheel={stopFollowing} onTouchMove={stopFollowing}
        onPointerDown={(event) => { if (event.target === event.currentTarget) stopFollowing(); }}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", "Tab"].includes(event.key)) stopFollowing();
        }}>
        {lines.map((line, index) => line.text && (
          <button className="lyric-line" key={line.time} type="button"
            ref={index === active ? activeLine : null} aria-current={index === active ? "true" : undefined}
            disabled={!duration} onClick={() => seek(line.time / factor)}>
            <span className="lyric-time">{formatTime(line.time / factor)}</span>
            <span>{line.text}</span>
          </button>
        ))}
      </div>
      {!follow && <button className="button subtle follow-button" type="button" onClick={() => setFollow(true)}>Follow playback</button>}
    </>
  );
}

export default function LyricsPanel({ track, time, duration, seek }: Props) {
  const [result, setResult] = useState<Lyrics | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetchLyrics(track.id, controller.signal).then((lyrics) => {
      if (!controller.signal.aborted) setResult(lyrics);
    }).catch(() => {
      if (!controller.signal.aborted) setError("Lyrics could not be loaded");
    });
    return () => controller.abort();
  }, [track.id, attempt]);

  return (
    <section className="lyrics-panel" id="lyrics" aria-labelledby="lyrics-title">
      <h2 id="lyrics-title">Lyrics</h2>
      {error && <div className="error-row">
        <p role="alert">{error}</p>
        <button className="button subtle" type="button" onClick={() => { setError(""); setAttempt(attempt + 1); }}>Retry</button>
      </div>}
      {!result && !error && <p className="lyrics-status" role="status">Fetching lyrics</p>}
      {result?.status === "synced" && <SyncedLyrics lines={result.lines} factor={track.variant.tempoFactor}
        time={time} duration={duration} seek={seek} />}
      {result?.status === "plain" && <p className="lyrics-lines lyrics-plain" tabIndex={0}>{result.text}</p>}
      {result?.status === "instrumental" && <p className="lyrics-status">Instrumental track</p>}
      {result?.status === "unavailable" && <p className="lyrics-status">Lyrics unavailable for this recording</p>}
    </section>
  );
}
