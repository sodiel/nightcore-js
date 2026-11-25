import { useEffect, useState } from "react";

interface Props {
  phase: "search" | "variant" | "upload" | null;
  uploadProgress: number | null;
}

export default function ProcessingStatus({ phase, uploadProgress }: Props) {
  const uploading = phase === "upload" && uploadProgress !== null;
  const [longWait, setLongWait] = useState(false);
  useEffect(() => {
    if (!phase || uploading) return;
    const timer = window.setTimeout(() => setLongWait(true), 5000);
    return () => {
      window.clearTimeout(timer);
      setLongWait(false);
    };
  }, [phase, uploading]);

  const label = uploading ? "Uploading audio" : phase === "search" ? "Finding and preparing audio"
    : phase === "upload" ? "Preparing audio" : phase === "variant" ? "Applying effect" : "";

  return (
    <div className="status-slot">
      <div className="status-text" role="status">{label}</div>
      {uploading ? (
        <progress className="upload-progress" max={100} value={uploadProgress!} aria-label="Upload progress" />
      ) : phase && (longWait
        ? <span className="linear-indicator" aria-hidden="true" />
        : <span className="loading-indicator" aria-hidden="true"><span /></span>)}
    </div>
  );
}
