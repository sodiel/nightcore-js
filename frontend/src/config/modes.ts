export const primaryModes = [
  { value: "nightcore", label: "Nightcore", icon: "moon", description: "Plays 15% faster and raises the pitch" },
  { value: "daycore", label: "Daycore", icon: "sun", description: "Plays 15% slower and lowers the pitch" },
] as const;

export const extraModes = [
  { value: "sped-up", label: "Sped up", icon: "fast", description: "25% faster at the original pitch" },
  { value: "slowed-reverb", label: "Slowed + reverb", icon: "reverb", description: "15% slower with lower pitch and room reverb" },
  { value: "bass-boost", label: "Bass boost", icon: "bass", description: "More low end at the original tempo" },
  { value: "8d-audio", label: "8D audio", icon: "headphones", description: "Slow stereo panning for headphones" },
] as const;

export type PrimaryMode = typeof primaryModes[number]["value"];
export type Preset = PrimaryMode | typeof extraModes[number]["value"];

export function isPrimaryMode(preset: Preset): preset is PrimaryMode {
  return primaryModes.some((mode) => mode.value === preset);
}
