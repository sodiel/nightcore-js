import { useState } from "react";
import LyricsPanel from "./components/LyricsPanel.tsx";
import ModePicker from "./components/ModePicker.tsx";
import ProcessingStatus from "./components/ProcessingStatus.tsx";
import ThemeSettings from "./components/ThemeSettings.tsx";
import TrackActions from "./components/TrackActions.tsx";
import TrackPlayer from "./components/TrackPlayer.tsx";
import TrackSearch from "./components/TrackSearch.tsx";
import { Icon } from "./config/icons.tsx";
import { useArtworkTheme } from "./hooks/useArtworkTheme.ts";
import { useAudio } from "./hooks/useAudio.ts";
import { useProcessing } from "./hooks/useProcessing.ts";
import { useTheme } from "./hooks/useTheme.ts";
import { useTracks } from "./hooks/useTracks.ts";

function App() {
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const audio = useAudio();
  const tracks = useTracks(audio.load);
  const preference = useTheme();
  const processing = useProcessing(tracks.pending, tracks.uploadProgress);
  const { theme } = preference;

  const artwork = useArtworkTheme(tracks.track?.metadata?.artworkUrl, theme);

  return (
    <div className="app" data-theme={theme} style={artwork.style}>
      <header className="app-header">
        <div className="wordmark"><span className="brand-mark"><Icon name="brand" /></span>nightcore-js</div>
        <ThemeSettings choice={preference.choice} onChange={preference.choose} />
      </header>
      <main className="workspace">
        <section className="source-controls" aria-labelledby="search-title">
          <h1 id="search-title">Find a track</h1>
          <TrackSearch onSearch={tracks.search} onUpload={tracks.upload} phase={processing.phase} inline={processing.inline} initialQuery={tracks.sharedQuery} />
          <ModePicker preset={tracks.preset} onPreset={tracks.selectPreset}
            busy={processing.phase === "variant"} showLoader={processing.inline === "variant"} />
          <ProcessingStatus label={processing.label} slow={processing.slow} uploadProgress={processing.uploadProgress} />
          {tracks.failure && <div className="error-row">
            <p role="alert">{tracks.failure.message}</p>
            <button className="button subtle" type="button" onClick={tracks.retry}>Retry</button>
          </div>}
        </section>
        {tracks.track && (
          <div className="playback" data-lyrics={lyricsOpen}>
            <TrackPlayer track={tracks.track} duration={audio.duration} currentTime={audio.currentTime}
              playing={audio.playing} onSeek={audio.seek} onToggle={audio.toggle} onArtworkLoad={artwork.onArtworkLoad} actions={
                <TrackActions key={tracks.track.variant.mediaUrl} track={tracks.track}
                  lyricsOpen={lyricsOpen} onToggleLyrics={() => setLyricsOpen(!lyricsOpen)} />
              } />
            {lyricsOpen && <LyricsPanel key={tracks.track.id} track={tracks.track}
              time={audio.currentTime} duration={audio.duration} seek={audio.seek} />}
            {audio.error && <p className="audio-error" role="alert">{audio.error}</p>}
          </div>
        )}
        <audio ref={audio.audioRef} preload="metadata" {...audio.events} />
      </main>
    </div>
  );
}

export default App;
