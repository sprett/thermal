/**
 * Two families, both used for a reason.
 *
 * Instrument Sans carries the UI: a slightly narrow grotesk with a high
 * x-height, so it holds up small and in sunlight.
 *
 * Martian Mono carries every flight number — altitude, climb, speed, glide,
 * track. It is wide and tabular, and the width is the point: digits stay
 * glanceable at arm's length in turbulence, and a changing value never shifts
 * the ones beside it.
 */
export const font = {
  sans: 'InstrumentSans_400Regular',
  sansMedium: 'InstrumentSans_500Medium',
  sansSemibold: 'InstrumentSans_600SemiBold',
  mono: 'MartianMono_400Regular',
  monoMedium: 'MartianMono_500Medium',
  monoSemibold: 'MartianMono_600SemiBold',
} as const;

/**
 * The label that sits above every readout. Small, spaced, uppercase — it must
 * read as a caption at a glance and never compete with the number under it.
 */
export const LABEL = {
  fontFamily: font.sansSemibold,
  fontSize: 10,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
} as const;
