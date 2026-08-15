/**
 * MapTiler style resolution.
 *
 * Outdoor is the topographic schema — contours and hillshade, which is what
 * matters for mountain flying; the street styles carry none of it. MapTiler's
 * v4 generation ships each schema in a light and a dark theme, so the app's
 * colour scheme picks the style rather than tinting the map afterwards.
 *
 * The key is read at build time, not runtime: `EXPO_PUBLIC_*` is inlined by
 * Metro, so `process.env.EXPO_PUBLIC_MAPTILER_KEY` must be written out in full
 * here — destructuring or dynamic indexing defeats the substitution.
 */
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
