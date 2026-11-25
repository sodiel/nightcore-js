import ModePicker from "./components/ModePicker.tsx";
import ProcessingStatus from "./components/ProcessingStatus.tsx";
import TrackPlayer from "./components/TrackPlayer.tsx";
import TrackSearch from "./components/TrackSearch.tsx";
import { Icon } from "./config/icons.tsx";
import { useAudio } from "./hooks/useAudio.ts";
import { useTracks } from "./hooks/useTracks.ts";

function App() {
  const audio = useAudio();
  const tracks = useTracks(audio.load);
  const theme = tracks.preset === "daycore" ? "light" : "dark";

  return (
    <div className="app" data-theme={theme}>
      <header className="app-header">
        <div className="wordmark"><span className="brand-mark"><Icon name="brand" /></span>nightcore-js</div>
      </header>
      <main className="workspace">
        <section className="source-controls" aria-labelledby="search-title">
          <h1 id="search-title">Find a track</h1>
          <TrackSearch onSearch={tracks.search} />
          <ModePicker preset={tracks.preset} onPreset={tracks.selectPreset} />
          <ProcessingStatus phase={tracks.pending?.type ?? null} />
          {tracks.failure && <div className="error-row">
            <p role="alert">{tracks.failure.message}</p>
            <button className="button subtle" type="button" onClick={tracks.retry}>Retry</button>
          </div>}
        </section>
        {tracks.track && (
          <div className="playback">
            <TrackPlayer track={tracks.track} duration={audio.duration} currentTime={audio.currentTime}
              playing={audio.playing} onSeek={audio.seek} onToggle={audio.toggle} />
            {audio.error && <p className="audio-error" role="alert">{audio.error}</p>}
          </div>
        )}
        <audio ref={audio.audioRef} preload="metadata" {...audio.events} />
      </main>
    </div>
  );
}

export default App;
