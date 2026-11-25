import { useMemo, useState, type CSSProperties } from "react";
import { argbFromRgb, Hct, hexFromArgb, QuantizerCelebi, SchemeTonalSpot, Score } from "@material/material-color-utilities";

function artworkColors(image: HTMLImageElement) {
  const scale = 64 / Math.max(64, image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const pixels: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 255) pixels.push(argbFromRgb(data[i], data[i + 1], data[i + 2]));
  }
  if (!pixels.length) return;
  const [base, candidate] = Score.score(QuantizerCelebi.quantize(pixels, 128), { desired: 2 });
  const difference = candidate === undefined ? 0 : Math.abs(Hct.fromInt(base).hue - Hct.fromInt(candidate).hue);
  return { base, accent: Math.min(difference, 360 - difference) >= 40 ? candidate : base };
}

export function useArtworkTheme(artworkUrl: string | undefined, theme: "light" | "dark") {
  const [artwork, setArtwork] = useState<{ url: string; colors: NonNullable<ReturnType<typeof artworkColors>> }>();
  const colors = artwork && artwork.url === artworkUrl ? artwork.colors : undefined;
  const style = useMemo(() => {
    if (colors === undefined) return undefined;
    const dark = theme === "dark";
    const source = Hct.fromInt(colors.base);
    const scheme = new SchemeTonalSpot(source, dark, 0);
    const accentScheme = new SchemeTonalSpot(Hct.fromInt(colors.accent), dark, 0);
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
      "--accent": accentScheme.primary,
      "--on-accent": accentScheme.onPrimary,
      "--selection": scheme.primaryContainer,
      "--on-selection": scheme.onPrimaryContainer,
      "--error": scheme.error,
    };
    return Object.fromEntries(Object.entries(roles).map(([name, color]) => [name, hexFromArgb(color)])) as CSSProperties;
  }, [colors, theme]);

  function onArtworkLoad(image: HTMLImageElement) {
    if (!artworkUrl || !image.isConnected || colors !== undefined) return;
    try {
      const palette = artworkColors(image);
      if (palette) setArtwork({ url: artworkUrl, colors: palette });
    } catch {
      // The cover stays visible if the browser restricts access to its pixels.
    }
  }

  return { style, onArtworkLoad };
}
