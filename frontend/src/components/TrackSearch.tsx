type TrackSearchProps = {
  query: string;
  isLoading: boolean;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
};

export default function TrackSearch({
  query,
  isLoading,
  onQueryChange,
  onSearch,
}: TrackSearchProps) {
  return (
    <form
      className="flex flex-row w-full"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <input
        className="w-full focus:outline-none border rounded-md rounded-tl-2xl text-nowrap p-2 mr-1"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        type="text"
        aria-label="Song name or URL"
        placeholder="Enter song name or paste URL"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="border p-2 rounded-md rounded-tr-2xl bg-white/20 active:bg-purple-500"
      >
        {isLoading ? "Loading..." : "Nightcore"}
      </button>
    </form>
  );
}
