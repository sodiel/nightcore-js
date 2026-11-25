import { useState } from "react";
import { Icon } from "../config/icons.tsx";

export default function TrackSearch({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState("");

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
    </form>
  );
}
