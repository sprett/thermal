import { useColorScheme } from 'react-native';

/**
 * The palette, in JavaScript.
 *
 * `global.css` is the source of truth for anything styled with a class. This
 * mirrors it for the things that cannot take one: SVG fills and strokes, glass
 * tint colours, and native props. Keep the two in step — a token changed in one
 * and not the other shows up as a single wrong-coloured element, which is
 * exactly the kind of bug nobody notices until it ships.
 */
const light = {
  paper: '#FCFCFA',
  paperSunk: '#F4F4F1',
  rule: '#E2E2DC',
  ruleStrong: '#C4C4BC',
  ink: '#16181A',
  inkMuted: '#6B6F73',
  inkFaint: '#9BA0A4',
  brand: '#1B3A6B',
  climb: '#1E8E5A',
  climbStrong: '#0F6B41',
  sink: '#C2410C',
  sinkStrong: '#8A2A05',
  neutralAir: '#8B8F94',
  airspaceCtr: '#B3197A',
  airspaceTma: '#2563A8',
  warn: '#B45309',
} as const;

/** Values are plain strings; only the key set is fixed, so dark must be total. */
export type Palette = Record<keyof typeof light, string>;

const dark: Palette = {
  paper: '#0B0C0D',
  paperSunk: '#141618',
  rule: '#26292C',
  ruleStrong: '#3A3E42',
  ink: '#F2F3F4',
  inkMuted: '#9DA3A8',
  inkFaint: '#63696E',
  brand: '#7FA8E0',
  climb: '#3FD08A',
  climbStrong: '#6FE5AC',
  sink: '#FF8A4C',
  sinkStrong: '#FFB088',
  neutralAir: '#6E7478',
  airspaceCtr: '#F062BE',
  airspaceTma: '#5FA0E8',
  warn: '#E8A33D',
};

export function useThemeColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export function useScheme(): 'light' | 'dark' {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}
