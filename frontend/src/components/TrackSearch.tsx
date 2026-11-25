import { useRef, useState } from "react";
import { Icon } from "../config/icons.tsx";

export default function TrackSearch({ onSearch, onUpload }: {
  onSearch: (query: string) => void;
  onUpload: (file: File) => void;
}) {
  const [query, setQuery] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <form className="search" role="search" onSubmit={(event) => {
      event.preventDefault();
      if (query.trim()) onSearch(query.trim());
    }}>
      <div className="search-field">
        <Icon name="search" />
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
      <button className="button primary" type="submit" disabled={!query.trim()}>Search</button>
      <button className="button file-button" type="button" onClick={() => fileInput.current?.click()}>
        <Icon name="file" />Choose file
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
