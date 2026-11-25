import { useState } from "react";
import { Icon } from "../config/icons.tsx";
import type { TrackMetadata } from "../services.ts";

export default function TrackDetails({ metadata }: { metadata: TrackMetadata | null }) {
  const [failedArtwork, setFailedArtwork] = useState("");
  const artwork = metadata?.artworkUrl;

  return (
    <div className="artwork">
      {artwork && artwork !== failedArtwork ? (
        <img src={artwork} alt="" referrerPolicy="no-referrer"
          onError={() => setFailedArtwork(artwork)} />
      ) : (
        <div className="record" aria-hidden="true"><Icon name="music" /></div>
      )}
    </div>
  );
}
