import { useEffect, useRef, useState } from "react";

function App() {
  const [trackQuery, setTrackQuery] = useState("");
  const [nightcore, setNightcore] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-6"
    >
      <path
        fillRule="evenodd"
        d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
        clipRule="evenodd"
      />
    </svg>
  );

  const pauseIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-6"
    >
      <path
        fillRule="evenodd"
        d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z"
        clipRule="evenodd"
      />
    </svg>
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);

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
  }, [isPlaying, nightcore]);

  async function getNightcore(trackQuery: string) {
    const url = "http://localhost:3001";
    try {
      setIsLoading(true);
      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify({ trackQuery }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Response: ${response.status}`);
      }
      const track = await response.text();
      setNightcore(track);
      setIsLoading(false);
    } catch (error) {
      if (error instanceof Error) console.error(error.message);
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
              getNightcore(trackQuery);
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
              onEnded={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
          )}
          <div
            className={
              "w-full focus:outline-none border rounded-md rounded-bl-2xl text-nowrap p-2 mr-1"
            }
          >
            {audioRef.current && (
              <input
                className={"w-full accent-purple-500"}
                type={"range"}
                min={"0"}
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
              />
            )}
          </div>
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
