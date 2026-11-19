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
        className="border p-2 rounded-md rounded-br-2xl bg-white/20 active:bg-purple-500"
        onClick={onTogglePlayback}
      >
        {isPlaying ? pauseIcon : playIcon}
      </button>
    </div>
  );
}
