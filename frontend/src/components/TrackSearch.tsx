import { useRef, useState } from "react";
import { Icon } from "../config/icons.tsx";
import InlineLoader from "./InlineLoader.tsx";

export default function TrackSearch({ onSearch, onUpload, phase, inline, initialQuery }: {
  onSearch: (query: string) => void;
  onUpload: (file: File) => void;
  phase: "search" | "variant" | "upload" | null;
  inline: "search" | "variant" | "upload" | null;
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <form className="search" role="search" onSubmit={(event) => {
      event.preventDefault();
      if (query.trim()) onSearch(query.trim());
    }}>
      <div className="search-field">
        <input
          type="text"
          name="query"
          aria-label="Song name or YouTube link"
          placeholder="Song or YouTube link"
          autoComplete="off"
          enterKeyHint="search"
          maxLength={500}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <button className="button primary" type="submit" disabled={!query.trim()} aria-busy={phase === "search"}>
        <span className="button-icon">{inline === "search" ? <InlineLoader /> : <Icon name="search" />}</span>
        Search
      </button>
      <button className="button file-button" type="button" aria-busy={phase === "upload"} onClick={() => fileInput.current?.click()}>
        <span className="button-icon">{inline === "upload" ? <InlineLoader /> : <Icon name="file" />}</span>
        Choose file
      </button>
      <input ref={fileInput} type="file" hidden accept=".mp3,.wav,.m4a,.flac,.ogg,.oga,.opus"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) onUpload(file);
        }} />
    </form>
  );
}
