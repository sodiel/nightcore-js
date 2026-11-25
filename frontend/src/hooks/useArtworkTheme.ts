import { useMemo, useState, type CSSProperties } from "react";
import { Hct, hexFromArgb, SchemeTonalSpot, sourceColorFromImageBytes } from "@material/material-color-utilities";

function artworkColor(image: HTMLImageElement) {
  const scale = 64 / Math.max(64, image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return sourceColorFromImageBytes(context.getImageData(0, 0, canvas.width, canvas.height).data);
}

export function useArtworkTheme(artworkUrl: string | undefined, theme: "light" | "dark") {
  const [artwork, setArtwork] = useState<{ url: string; seed: number }>();
  const seed = artwork && artwork.url === artworkUrl ? artwork.seed : undefined;
  const style = useMemo(() => {
    if (seed === undefined) return undefined;
    const dark = theme === "dark";
    const scheme = new SchemeTonalSpot(Hct.fromInt(seed), dark, 0);
    const roles = {
      "--canvas": scheme.surface,
      "--surface": scheme.surfaceContainerLow,
      "--control": scheme.surfaceContainerHigh,
      "--hover": scheme.surfaceContainerHighest,
      "--line": scheme.outlineVariant,
      "--ink": scheme.onSurface,
      "--muted": scheme.onSurfaceVariant,
      "--quiet": scheme.neutralVariantPalette.tone(dark ? 70 : 40),
      "--accent": scheme.primary,
      "--on-accent": scheme.onPrimary,
      "--selection": scheme.primaryContainer,
      "--on-selection": scheme.onPrimaryContainer,
      "--error": scheme.error,
    };
    return Object.fromEntries(Object.entries(roles).map(([name, color]) => [name, hexFromArgb(color)])) as CSSProperties;
  }, [seed, theme]);

  function onArtworkLoad(image: HTMLImageElement) {
    if (!artworkUrl || !image.isConnected || image.getAttribute("src") !== artworkUrl || seed !== undefined) return;
    try {
      const color = artworkColor(image);
      if (color !== undefined) setArtwork({ url: artworkUrl, seed: color });
    } catch {
      // The cover stays visible if the browser restricts access to its pixels.
    }
  }

  return { style, onArtworkLoad };
}
