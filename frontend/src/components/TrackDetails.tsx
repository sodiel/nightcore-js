import { useState } from "react";
import { Icon } from "../config/icons.tsx";

interface Props {
  trackId: string;
  artworkUrl: string | undefined;
  onArtworkLoad: (image: HTMLImageElement) => void;
}

export default function TrackDetails({ trackId, artworkUrl, onArtworkLoad }: Props) {
  const [imageMode, setImageMode] = useState<"cors" | "proxy" | "display" | "missing">("cors");
  return (
    <div className="artwork">
      {artworkUrl && imageMode !== "missing" ? (
        <img key={imageMode} crossOrigin={imageMode === "cors" ? "anonymous" : undefined}
          src={imageMode === "proxy" ? `/api/tracks/${trackId}/artwork` : artworkUrl} alt="" referrerPolicy="no-referrer"
          onLoad={(event) => { if (imageMode !== "display") onArtworkLoad(event.currentTarget); }}
          onError={() => setImageMode(imageMode === "cors" ? "proxy" : imageMode === "proxy" ? "display" : "missing")} />
      ) : (
        <div className="record" aria-hidden="true"><Icon name="music" /></div>
      )}
    </div>
  );
}
