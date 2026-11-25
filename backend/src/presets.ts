function changePitchAndTempo(factor: number) {
  return `aresample=44100,asetrate=${Math.round(44100 * factor)},aresample=44100`;
}

export const presets = {
  nightcore: { tempoFactor: 1.15, filter: changePitchAndTempo(1.15), version: 1 },
  daycore: { tempoFactor: 0.85, filter: changePitchAndTempo(0.85), version: 1 },
  "sped-up": { tempoFactor: 1.25, filter: "atempo=1.25", version: 1 },
  "slowed-reverb": {
    tempoFactor: 0.85,
    filter: `${changePitchAndTempo(0.85)},aecho=0.78:0.85:19|29|41|55|73|89|111|137:0.12|0.10|0.08|0.06|0.05|0.04|0.03|0.02`,
    version: 1,
  },
  "bass-boost": { tempoFactor: 1, filter: "volume=-4dB,bass=f=110:g=5,alimiter=limit=0.95:level=0:latency=1", version: 1 },
  "8d-audio": {
    tempoFactor: 1,
    filter: "aformat=channel_layouts=stereo,apulsator=mode=sine:amount=0.7:offset_l=0:offset_r=0.5:timing=hz:hz=0.18",
    version: 1,
  },
};

export type Preset = keyof typeof presets;

export function isPreset(value: unknown): value is Preset {
  return typeof value === "string" && Object.hasOwn(presets, value);
}
