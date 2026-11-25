import type { LyricLine } from "../services.ts";

export function activeLyricIndex(lines: LyricLine[], sourceTime: number) {
  let low = 0;
  let high = lines.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (lines[middle]!.time <= sourceTime + 0.001) low = middle + 1;
    else high = middle;
  }
  return low - 1;
}
