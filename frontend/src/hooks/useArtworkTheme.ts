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
    const source = Hct.fromInt(seed);
    const scheme = new SchemeTonalSpot(source, dark, 0);
    const surface = (tone: number, chroma: number) =>
      Hct.from(source.hue, Math.min(source.chroma, chroma), tone).toInt();
    const roles = {
      "--canvas": surface(dark ? 9 : 97, 18),
      "--surface": surface(dark ? 14 : 94, 22),
      "--control": surface(dark ? 20 : 90, 24),
      "--hover": surface(dark ? 25 : 86, 26),
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
    if (!artworkUrl || !image.isConnected || seed !== undefined) return;
    try {
      const color = artworkColor(image);
      if (color !== undefined) setArtwork({ url: artworkUrl, seed: color });
    } catch {
      // The cover stays visible if the browser restricts access to its pixels.
    }
  }

  return { style, onArtworkLoad };
}
