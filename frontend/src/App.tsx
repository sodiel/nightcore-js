import { useEffect, useRef, useState } from "react";
import { playIcon, pauseIcon } from "./config/icons.tsx";
import { getNightcore } from "./services.ts";
import Player from "./components/ui/Player.tsx";

function App() {
  const [trackQuery, setTrackQuery] = useState("");
  const [nightcore, setNightcore] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch((error) => {
        console.log("Error:", error);
      });
    } else {
      audio.pause();
    }
    if (audio.ended) {
      setIsPlaying(false);
    }
  }, [isPlaying]);

  async function handleGetNightcore(trackQuery: string) {
    try {
      setIsLoading(true);
      const track = await getNightcore(trackQuery);
      setNightcore(track);
      console.log("track set");
    } catch (error) {
      if (error instanceof Error) console.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);

    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  return (
    <section
      className={
        "h-screen flex flex-col justify-center items-center bg-purple-100 dark:bg-purple-950 text-black dark:text-white font-roboto font-display"
      }
    >
      <div className="flex flex-col justify-center items-center bg-purple-100 dark:bg-purple-950 dark:text-white p-8 rounded-4xl border dark:border-white gap-1">
        {isLoading && (
          <p className={"text-black/10 dark:text-white/50"}>Loading...</p>
        )}
        <form className={"flex flex-row w-full"}>
          <input
            className={
              "w-full focus:outline-none border rounded-md rounded-tl-2xl text-nowrap p-2 mr-1"
            }
            onChange={(e) => setTrackQuery(e.target.value)}
            type="text"
            placeholder="Enter song name or paste URL"
          />
          <button
            type="submit"
            className={
              "border p-2 rounded-md rounded-tr-2xl bg-white/20 active:bg-purple-500"
            }
            onClick={(e) => {
              e.preventDefault();
              handleGetNightcore(trackQuery);
            }}
          >
            Nightcore
          </button>
        </form>
        <div className={"flex flex-row justify-center w-full"}>
          {nightcore && (
            <audio
              src={nightcore}
              ref={audioRef}
              onLoadedMetadata={(e) => {
                setDuration(e.currentTarget.duration);
              }}
              onEnded={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
          )}
          <Player
            duration={duration}
            currentTime={currentTime}
            handleSeek={handleSeek}
            audioRef={audioRef}
          />
          <button
            className={
              "border p-2 rounded-md rounded-br-2xl bg-white/20 active:bg-purple-500"
            }
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? pauseIcon : playIcon}
          </button>
        </div>
        {/*<a href={nightcore ?? undefined}> Download audio </a>*/}
      </div>
    </section>
  );
}

export default App;
