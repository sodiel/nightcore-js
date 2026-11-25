function changePitchAndTempo(factor: number) {
  return `aresample=44100,asetrate=${44100 * factor},aresample=44100`;
}

export const presets = {
  nightcore: { tempoFactor: 1.15, filter: changePitchAndTempo(1.15), version: 1 },
  daycore: { tempoFactor: 0.85, filter: changePitchAndTempo(0.85), version: 1 },
};

export type Preset = keyof typeof presets;

export function isPreset(value: unknown): value is Preset {
  return typeof value === "string" && Object.hasOwn(presets, value);
}
