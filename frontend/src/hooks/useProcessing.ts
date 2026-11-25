import { useEffect, useState } from "react";

type Operation = { type: "search" | "variant" | "upload" };

export function useProcessing(pending: Operation | null, uploadProgress: number | null) {
  const [slowOperation, setSlowOperation] = useState<Operation | null>(null);
  const phase = pending?.type ?? null;
  const uploading = phase === "upload" && uploadProgress !== null;
  const slow = Boolean(pending && pending === slowOperation && !uploading);

  useEffect(() => {
    if (!pending || uploading) return;
    const timer = window.setTimeout(() => setSlowOperation(pending), 5000);
    return () => window.clearTimeout(timer);
  }, [pending, uploading]);

  const label = uploading ? "Uploading audio" : phase === "search" ? "Finding and preparing audio"
    : phase === "upload" ? "Preparing audio" : phase === "variant" ? "Applying effect" : "";
  return {
    phase, label, slow,
    inline: uploading || slow ? null : phase,
    uploadProgress: uploading ? uploadProgress : null,
  };
}
