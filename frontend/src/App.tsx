import { useEffect, useRef, useState } from "react";
import { getNightcore } from "./services.ts";
import TrackSearch from "./components/TrackSearch.tsx";
import TrackDetails from "./components/TrackDetails.tsx";
import TrackPlayer from "./components/TrackPlayer.tsx";
import {
  argbFromHex,
  themeFromSourceColor,
  applyTheme,
  themeFromImage,
} from "@material/material-color-utilities";

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
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    applyTheme(themeFromSourceColor(argbFromHex("#6750a4")), {
      target: document.documentElement,
      brightnessSuffix: true,
    });
  }, []);

  const handleTheme = async (img: HTMLImageElement) => {
    try {
      const theme = await themeFromImage(img);
      applyTheme(theme, {
        target: document.documentElement,
        brightnessSuffix: true,
      });
    } catch (error) {
      console.warn("Could not extract artwork colors:", error);
    }
  };

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
    <section className="h-screen flex flex-col justify-center items-center bg-(--md-sys-color-background-light) dark:bg-(--md-sys-color-background-dark) text-(--md-sys-color-on-background-light) dark:text-(--md-sys-color-on-background-dark) font-roboto font-display">
      <div className="flex flex-col justify-center items-center bg-(--md-sys-color-surface-light) dark:bg-(--md-sys-color-surface-dark) text-(--md-sys-color-on-surface-light) dark:text-(--md-sys-color-on-surface-dark) p-8 m-8 rounded-4xl border border-(--md-sys-color-outline-light) dark:border-(--md-sys-color-outline-dark) gap-1">
        {isLoading && (
          <p className="text-(--md-sys-color-on-surface-variant-light) dark:text-(--md-sys-color-on-surface-variant-dark)">
            Loading...
          </p>
        )}
        {errorMessage && (
          <p
            role="alert"
            className="text-(--md-sys-color-error-light) dark:text-(--md-sys-color-error-dark)"
          >
            {errorMessage}
          </p>
        )}
        <TrackSearch
          query={trackQuery}
          isLoading={isLoading}
          onQueryChange={setTrackQuery}
          onSearch={() => void handleGetNightcore(trackQuery)}
        />
        <TrackDetails
          artwork={artwork}
          title={title}
          artist={artist}
          imageRef={imageRef}
          handleTheme={handleTheme}
        />
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
