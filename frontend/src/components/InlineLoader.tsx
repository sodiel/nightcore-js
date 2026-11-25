import { useEffect, useRef } from "react";
import { createLoadingIndicator } from "material/components/loading-indicator";
import "material/styles/loading-indicator";

export default function InlineLoader() {
  const slot = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!slot.current) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const indicator = createLoadingIndicator({ size: 24 });
    slot.current.append(indicator.element);
    const syncMotion = () => {
      if (motion.matches) indicator.stop().setValue(0);
      else indicator.setValue(null).start();
    };
    syncMotion();
    motion.addEventListener("change", syncMotion);
    return () => {
      motion.removeEventListener("change", syncMotion);
      indicator.destroy();
    };
  }, []);

  return <span ref={slot} className="inline-loader" aria-hidden="true" />;
}
