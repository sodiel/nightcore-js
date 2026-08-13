import React from "react";
import { formatTime } from "../../utils/formatTime";

type PlayerProps = {
  audioRef: React.RefObject<HTMLAudioElement> | null;
  duration: number | null;
  currentTime: number;
  handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const Player: React.FC<PlayerProps> = ({
  audioRef,
  duration = 0,
  currentTime = 0,
  handleSeek,
}) => {
  const hasAudio = Boolean(audioRef && audioRef.current);

  return (
    <div
      className={
        "w-full focus:outline-none border rounded-md rounded-bl-2xl text-nowrap p-2 mr-1"
      }
    >
      {hasAudio && (
        <div className={"flex flex-row"}>
          <input
            className={"w-full accent-purple-500"}
            type="range"
            min={0}
            max={duration ?? 0}
            value={currentTime}
            onChange={handleSeek}
          />
          <div className="ml-2 text-sm whitespace-nowrap tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration ?? 0)}
          </div>
        </div>
      )}
    </div>
  );
};

export default Player;
