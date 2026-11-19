import type { ChangeEvent, RefObject } from "react";
import { playIcon, pauseIcon } from "../config/icons.tsx";
import Player from "./ui/Player.tsx";

type TrackPlayerProps = {
  nightcore: string | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onDurationChange: (duration: number) => void;
  onTimeChange: (time: number) => void;
  onEnded: () => void;
  onSeek: (event: ChangeEvent<HTMLInputElement>) => void;
  onTogglePlayback: () => void;
};

export default function TrackPlayer({
  nightcore,
  audioRef,
  duration,
  currentTime,
  isPlaying,
  onDurationChange,
  onTimeChange,
  onEnded,
  onSeek,
  onTogglePlayback,
}: TrackPlayerProps) {
  return (
    <div className="flex flex-row justify-center w-full">
      {nightcore && (
        <audio
          src={nightcore}
          ref={audioRef}
          onLoadedMetadata={(event) =>
            onDurationChange(event.currentTarget.duration)
          }
          onEnded={onEnded}
          onTimeUpdate={(event) =>
            onTimeChange(event.currentTarget.currentTime)
          }
        />
      )}
      <Player
        duration={duration}
        currentTime={currentTime}
        handleSeek={onSeek}
        hasAudio={Boolean(nightcore)}
      />
      <button
        type="button"
        aria-label={isPlaying ? "Pause" : "Play"}
        disabled={!nightcore}
        className="
  p-2 rounded-md rounded-br-2xl
  bg-(--md-sys-color-primary-light)
  text-(--md-sys-color-on-primary-light)
  dark:bg-(--md-sys-color-primary-dark)
  dark:text-(--md-sys-color-on-primary-dark)
  active:opacity-80
"
        onClick={onTogglePlayback}
      >
        {isPlaying ? pauseIcon : playIcon}
      </button>
    </div>
  );
}
