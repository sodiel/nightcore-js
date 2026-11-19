import { useEffect, useRef, useState } from "react";
import { getNightcore } from "./services.ts";
import TrackSearch from "./components/TrackSearch.tsx";
import TrackDetails from "./components/TrackDetails.tsx";
import TrackPlayer from "./components/TrackPlayer.tsx";

function App() {
  const [trackQuery, setTrackQuery] = useState("");
  const [nightcore, setNightcore] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [artwork, setArtwork] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
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
      setErrorMessage("");
      const response = await getNightcore(trackQuery);
      if (response?.success) {
        setCurrentTime(0);
        setDuration(0);
        setNightcore(response.nightcoreUrl);
        setArtwork(response.metadata?.artworkUrl ?? null);
        setTitle(response.metadata?.title ?? "");
        setArtist(response.metadata?.artist ?? "");
        setIsPlaying(false);
      } else {
        throw new Error("Server Error");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Server Error");
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
    <section className="h-screen flex flex-col justify-center items-center bg-purple-100 dark:bg-purple-950 text-black dark:text-white font-roboto font-display">
      <div className="flex flex-col justify-center items-center bg-purple-100 dark:bg-purple-950 dark:text-white p-8 m-8 rounded-4xl border dark:border-white gap-1">
        {isLoading && (
          <p className="text-black/10 dark:text-white/50">Loading...</p>
        )}
        {errorMessage && <p>{errorMessage}</p>}
        <TrackSearch
          query={trackQuery}
          isLoading={isLoading}
          onQueryChange={setTrackQuery}
          onSearch={() => void handleGetNightcore(trackQuery)}
        />
        <TrackDetails artwork={artwork} title={title} artist={artist} />
        <TrackPlayer
          nightcore={nightcore}
          audioRef={audioRef}
          duration={duration}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onDurationChange={setDuration}
          onTimeChange={setCurrentTime}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onSeek={handleSeek}
          onTogglePlayback={() => setIsPlaying((playing) => !playing)}
        />
      </div>
    </section>
  );
}

export default App;
