import type { ChangeEvent } from "react";
import { formatTime } from "../../utils/formatTime";

type PlayerProps = {
  hasAudio: boolean;
  duration: number;
  currentTime: number;
  handleSeek: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function Player({
  hasAudio,
  duration,
  currentTime,
  handleSeek,
}: PlayerProps) {
  return (
    <div className="w-full border border-(--md-sys-color-outline-light) dark:border-(--md-sys-color-outline-dark) rounded-md rounded-bl-2xl text-nowrap p-2 mr-1">
      {hasAudio && (
        <div className="flex flex-row">
          <input
            aria-label="Seek"
            className="w-full accent-(--md-sys-color-primary-light) dark:accent-(--md-sys-color-primary-dark)"
            type="range"
            min={0}
            max={duration}
            value={Math.min(currentTime, duration)}
            onChange={handleSeek}
          />
          <div className="ml-2 text-sm whitespace-nowrap tabular-nums text-(--md-sys-color-on-surface-variant-light) dark:text-(--md-sys-color-on-surface-variant-dark)">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      )}
    </div>
  );
}
