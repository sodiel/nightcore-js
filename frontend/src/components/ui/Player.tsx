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
    <div className="w-full focus:outline-none border rounded-md rounded-bl-2xl text-nowrap p-2 mr-1">
      {hasAudio && (
        <div className="flex flex-row">
          <input
            aria-label="Seek"
            className="w-full accent-purple-500"
            type="range"
            min={0}
            max={duration}
            value={Math.min(currentTime, duration)}
            onChange={handleSeek}
          />
          <div className="ml-2 text-sm whitespace-nowrap tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      )}
    </div>
  );
}
