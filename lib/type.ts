export const font = {
  sans: 'InstrumentSans_400Regular',
  sansMedium: 'InstrumentSans_500Medium',
  sansSemibold: 'InstrumentSans_600SemiBold',
  mono: 'MartianMono_400Regular',
  monoMedium: 'MartianMono_500Medium',
  monoSemibold: 'MartianMono_600SemiBold',
} as const;

export const LABEL = {
  fontFamily: font.sansSemibold,
  fontSize: 10,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
} as const;
