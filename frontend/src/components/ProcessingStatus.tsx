import { useEffect, useState } from "react";

interface Props {
  phase: "search" | "variant" | null;
}

export default function ProcessingStatus({ phase }: Props) {
  const [longWait, setLongWait] = useState(false);
  useEffect(() => {
    if (!phase) return;
    const timer = window.setTimeout(() => setLongWait(true), 5000);
    return () => {
      window.clearTimeout(timer);
      setLongWait(false);
    };
  }, [phase]);

  return (
    <div className="status-slot">
      <div className="status-text" role="status">
        {phase && (phase === "search" ? "Finding and preparing audio" : "Applying effect")}
      </div>
      {phase && (longWait
        ? <span className="linear-indicator" aria-hidden="true" />
        : <span className="loading-indicator" aria-hidden="true"><span /></span>)}
    </div>
  );
}
