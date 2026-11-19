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
        className="w-full bg-(--md-sys-color-surface-light) dark:bg-(--md-sys-color-surface-dark) text-(--md-sys-color-on-surface-light) dark:text-(--md-sys-color-on-surface-dark) placeholder:text-(--md-sys-color-on-surface-variant-light) dark:placeholder:text-(--md-sys-color-on-surface-variant-dark) border border-(--md-sys-color-outline-light) dark:border-(--md-sys-color-outline-dark) rounded-md rounded-tl-2xl text-nowrap p-2 mr-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--md-sys-color-primary-light) dark:focus-visible:outline-(--md-sys-color-primary-dark)"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        type="text"
        aria-label="Song name or URL"
        placeholder="Enter song name or paste URL"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="p-2 rounded-md rounded-tr-2xl bg-(--md-sys-color-primary-light) text-(--md-sys-color-on-primary-light) dark:bg-(--md-sys-color-primary-dark) dark:text-(--md-sys-color-on-primary-dark) active:opacity-80 disabled:opacity-50"
      >
        {isLoading ? "Loading..." : "Nightcore"}
      </button>
    </form>
  );
}
