/**
 * One color per analyst slot, shared by the cards, constellation, and activity
 * feed so a persona is recognizable everywhere it appears.
 */
const HUES = [290, 200, 25, 150, 330, 75];

export type AnalystColor = {
  hue: number;
  solid: string;
  soft: string;
  gradient: string;
};

export function analystColor(index: number): AnalystColor {
  const hue = HUES[((index % HUES.length) + HUES.length) % HUES.length];
  return {
    hue,
    solid: `oklch(0.72 0.17 ${hue})`,
    soft: `oklch(0.72 0.17 ${hue} / 0.14)`,
    gradient: `linear-gradient(135deg, oklch(0.74 0.17 ${hue}), oklch(0.6 0.2 ${hue + 40}))`,
  };
}

export function analystIndex(names: string[], name: string | null | undefined) {
  if (!name) return -1;
  return names.indexOf(name);
}
