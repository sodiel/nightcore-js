import type { ReactNode } from "react";
import { Icon } from "../config/icons.tsx";
import type { Track } from "../services.ts";
import { formatTime } from "../utils/formatTime.ts";
import TrackDetails from "./TrackDetails.tsx";

interface Props {
  track: Track;
  duration: number;
  currentTime: number;
  playing: boolean;
  onSeek: (seconds: number) => void;
  onToggle: () => void;
  actions?: ReactNode;
}

export default function TrackPlayer({ track, duration, currentTime, playing, onSeek, onToggle, actions }: Props) {
  const position = Math.min(currentTime, duration);
  const elapsed = formatTime(position);
  const total = formatTime(duration);

  return (
    <section className="track-player" aria-label="Now playing">
      <TrackDetails metadata={track.metadata} />
      <div className="track-controls">
        <div className="track-heading">
          <h2>{track.metadata?.title || "Untitled track"}</h2>
          {track.metadata?.artist && <p>{track.metadata.artist}</p>}
        </div>
        <div className="transport">
          <button className="button play-button" type="button" aria-label={playing ? "Pause" : "Play"} onClick={onToggle}>
            <Icon name={playing ? "pause" : "play"} />
          </button>
          <div className="timeline">
            <input className="track-seek" type="range" aria-label="Playback position" aria-valuetext={`${elapsed} of ${total}`}
              min={0} max={duration} step={0.01} disabled={!duration} value={position}
              onChange={(event) => onSeek(Number(event.target.value))}
            />
            <div className="timecodes"><span>{elapsed}</span><span>{total}</span></div>
          </div>
        </div>
        {actions}
      </div>
    </section>
  );
}
