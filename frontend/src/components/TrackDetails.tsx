import { useState } from "react";
import { Icon } from "../config/icons.tsx";

interface Props {
  artworkUrl: string | undefined;
  onArtworkLoad: (image: HTMLImageElement) => void;
}

export default function TrackDetails({ artworkUrl, onArtworkLoad }: Props) {
  const [imageMode, setImageMode] = useState<"cors" | "display" | "missing">("cors");
  return (
    <div className="artwork">
      {artworkUrl && imageMode !== "missing" ? (
        <img key={imageMode} crossOrigin={imageMode === "cors" ? "anonymous" : undefined}
          src={artworkUrl} alt="" referrerPolicy="no-referrer"
          onLoad={(event) => { if (imageMode === "cors") onArtworkLoad(event.currentTarget); }}
          onError={() => setImageMode(imageMode === "cors" ? "display" : "missing")} />
      ) : (
        <div className="record" aria-hidden="true"><Icon name="music" /></div>
      )}
    </div>
  );
}
