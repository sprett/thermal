// Metro inlines EXPO_PUBLIC_* at build time, so this must be written in full —
// destructuring or dynamic indexing defeats the substitution.
const KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;

export const hasMapTilerKey = Boolean(KEY);

const STYLE_ID = {
  light: 'outdoor-v4',
  dark: 'outdoor-v4-dark',
} as const;

export type MapScheme = keyof typeof STYLE_ID;

export function mapStyleUrl(scheme: MapScheme): string {
  return `https://api.maptiler.com/maps/${STYLE_ID[scheme]}/style.json?key=${KEY}`;
}
