import BottomSheet, {
  BottomSheetFooter,
  BottomSheetScrollView,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import * as Linking from 'expo-linking';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Path, Svg } from 'react-native-svg';

import { useTakeoffWeather } from '../../hooks/useTakeoffWeather';
import {
  distanceKm,
  dropMeters,
  flyingStyleLabels,
  formatDistance,
  launchWindowLabel,
  primaryAspect,
  type Takeoff,
  type Wind,
} from '../../lib/pgearth';
import { useScheme, useThemeColors, type Palette } from '../../lib/theme';
import { LABEL, font } from '../../lib/type';
import {
  cloudbaseMeters,
  flyable,
  windyUrl,
  type Flyable,
  type HourBar,
} from '../../lib/weather';
import { WindRose } from './WindRose';

const SNAP = ['74%'];
const DASH = '—';

export function SiteSheet({
  site,
  from = null,
  bottomInset = 0,
  onClose,
}: {
  site: Takeoff | null;
  from?: { latitude: number; longitude: number } | null;
  bottomInset?: number;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const scheme = useScheme();
  const forecast = useTakeoffWeather(site);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });
  const topBlurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 16], [0, 1], Extrapolation.CLAMP),
  }));

  const destLat = site?.parking?.lat ?? site?.latitude;
  const destLng = site?.parking?.lng ?? site?.longitude;

  const openMaps = useCallback(() => {
    if (destLat == null || destLng == null) return;
    Linking.openURL(`https://maps.apple.com/?daddr=${destLat},${destLng}`);
  }, [destLat, destLng]);

  const openPge = useCallback(() => {
    if (!site?.pgeLink) return;
    Linking.openURL(site.pgeLink);
  }, [site?.pgeLink]);

  const openWindy = useCallback(() => {
    if (!site) return;
    Linking.openURL(windyUrl(site.latitude, site.longitude));
  }, [site]);

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => {
      if (!site) return null;
      return (
        <BottomSheetFooter {...props} bottomInset={bottomInset}>
          <View
            className="flex-row items-center justify-end border-t border-rule bg-paper px-4 pt-3"
            style={{ paddingBottom: 12 }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Navigate to takeoff"
              onPress={openMaps}
              className="h-[52px] w-[52px] items-center justify-center rounded-[26px] active:opacity-70"
              style={{ borderWidth: 1.5, borderColor: colors.ruleStrong }}
            >
              <Svg width={17} height={17} viewBox="0 0 17 17" fill="none">
                <Path
                  d="M15.5 1.5L9.5 15.5L8 9L1.5 7.5Z"
                  stroke={colors.brand}
                  strokeWidth={1.8}
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          </View>
        </BottomSheetFooter>
      );
    },
    [bottomInset, colors.brand, colors.ruleStrong, openMaps, site],
  );

  if (!site) return null;

  const km = from
    ? distanceKm(
        { lat: from.latitude, lng: from.longitude },
        { lat: site.latitude, lng: site.longitude },
      )
    : null;
  const drop = dropMeters(site.altitude, site.landing?.altitude ?? null);
  const aspect = primaryAspect(site.wind);
  const window = launchWindowLabel(site.wind);
  const styles = flyingStyleLabels(site.styles);
  const kicker = [site.countryCode, 'Takeoff'].filter(Boolean).join(' · ');
  const meta = [
    km != null ? `${formatDistance(km).toUpperCase()} AWAY` : null,
    site.landing?.name ? site.landing.name.toUpperCase() : null,
  ].filter(Boolean);

  const caution =
    site.flightRules ??
    site.comments ??
    site.description ??
    site.landing?.description ??
    null;
  const extra = extraNotes(site, caution);

  return (
    <BottomSheet
      key={site.id}
      index={0}
      snapPoints={SNAP}
      enablePanDownToClose
      enableOverDrag={false}
      onClose={onClose}
      footerComponent={renderFooter}
      backgroundStyle={{ backgroundColor: colors.paper, borderRadius: 22 }}
      handleIndicatorStyle={{
        width: 38,
        height: 5,
        backgroundColor: colors.ruleStrong,
      }}
    >
      <View className="flex-1">
        <BottomSheetScrollView
          onScroll={onScroll}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: 88 + bottomInset,
          }}
        >
        <View className="px-4 pb-3.5 pt-2">
          <Text style={LABEL} className="text-ink-muted">
            {kicker}
          </Text>
          <View className="mt-[3px] flex-row items-center gap-2.5">
            <Text
              style={{
                fontFamily: font.sansSemibold,
                fontSize: 26,
                letterSpacing: -0.6,
                lineHeight: 30,
                flex: 1,
              }}
              className="text-ink"
            >
              {site.name}
            </Text>
            {forecast ? (
              <FlyableBadge status={flyable(site.wind, forecast.current)} />
            ) : null}
          </View>
          {meta.length > 0 ? (
            <Text
              style={{
                fontFamily: font.mono,
                fontSize: 11,
                marginTop: 6,
              }}
              className="text-ink-muted"
            >
              {meta.join(' · ')}
            </Text>
          ) : null}
        </View>

        <View className="flex-row border-y border-rule">
          <Stat label="Takeoff m" value={String(site.altitude)} lead />
          <Stat
            label="LZ m"
            value={
              site.landing?.altitude != null
                ? String(site.landing.altitude)
                : DASH
            }
          />
          <Stat label="Drop m" value={drop != null ? String(drop) : DASH} />
          <Stat label="Aspect" value={aspect ?? DASH} last />
        </View>

        <View className="flex-row gap-4 border-b border-rule px-4 py-4">
          <WindRose
            wind={site.wind}
            climb={colors.climbStrong}
            faint={colors.inkFaint}
            ink={colors.ink}
            fromDeg={forecast?.current.fromDeg}
          />
          <View className="flex-1 justify-center gap-2.5">
            {forecast ? (
              <View className="flex-row items-baseline gap-2">
                <Text
                  style={{
                    fontFamily: font.monoSemibold,
                    fontSize: 26,
                    letterSpacing: -0.8,
                    fontVariant: ['tabular-nums'],
                  }}
                  className="text-ink"
                >
                  {forecast.current.speedMs.toFixed(1)}
                </Text>
                <Text
                  style={{ fontFamily: font.sansSemibold, fontSize: 12 }}
                  className="text-ink-muted"
                >
                  m/s {forecast.current.fromLabel}
                </Text>
                <Text
                  style={{
                    fontFamily: font.mono,
                    fontSize: 11,
                    marginLeft: 'auto',
                  }}
                  className="text-ink-muted"
                >
                  GUST {forecast.current.gustMs.toFixed(1)}
                </Text>
              </View>
            ) : null}
            <Fact label="Launch window" value={window ?? 'None listed'} />
            {forecast ? (
              <Fact
                label="Cloudbase"
                value={`${cloudbaseMeters(forecast.temperatureC, forecast.dewPointC, site.altitude)} m · ${forecast.oktas}/8`}
              />
            ) : null}
            {styles.length > 0 ? (
              <Fact label="Flying" value={styles.join(' · ')} />
            ) : null}
            {site.landing?.name ? (
              <Fact label="Landing" value={site.landing.name} />
            ) : null}
          </View>
        </View>

        {caution ? (
          <View className="flex-row items-start gap-2.5 border-b border-rule px-4 py-3.5">
            <View className="mt-0.5">
              <Svg width={15} height={15} viewBox="0 0 15 15" fill="none">
                <Path
                  d="M7.5 1L14 13.5H1Z"
                  stroke={colors.sink}
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                />
                <Path
                  d="M7.5 6V9.5M7.5 11.4V11.5"
                  stroke={colors.sink}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
            <Text
              style={{ fontFamily: font.sans, fontSize: 13, lineHeight: 18 }}
              className="flex-1 text-ink-muted"
            >
              {caution}
            </Text>
          </View>
        ) : null}

        {extra.map((row) => (
          <View key={row.label} className="border-b border-rule px-4 py-3.5">
            <Text style={LABEL} className="mb-1 text-ink-faint">
              {row.label}
            </Text>
            <Text
              style={{ fontFamily: font.sans, fontSize: 13, lineHeight: 18 }}
              className="text-ink-muted"
            >
              {row.text}
            </Text>
          </View>
        ))}

        {forecast && forecast.hours.length > 0 ? (
          <WindHours hours={forecast.hours} siteWind={site.wind} colors={colors} />
        ) : null}

        {site.pgeLink ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open on ParaglidingEarth"
            onPress={openPge}
            className="px-4 py-3.5"
          >
            <Text
              style={{ fontFamily: font.sans, fontSize: 13 }}
              className="text-brand"
            >
              Source · ParaglidingEarth
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Open this takeoff on Windy"
          onPress={openWindy}
          className="px-4 py-3.5"
        >
          <Text
            style={{ fontFamily: font.sans, fontSize: 13 }}
            className="text-brand"
          >
            Open in Windy
          </Text>
          <Text
            style={{ fontFamily: font.sans, fontSize: 11, marginTop: 4 }}
            className="text-ink-faint"
          >
            Forecast · Open-Meteo
          </Text>
        </Pressable>
        </BottomSheetScrollView>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 48,
            },
            topBlurStyle,
          ]}
        >
          <BlurView intensity={48} tint={scheme} style={{ flex: 1 }} />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: `${colors.paper}73`,
            }}
          />
        </Animated.View>
      </View>
    </BottomSheet>
  );
}

function Stat({
  label,
  value,
  lead = false,
  last = false,
}: {
  label: string;
  value: string;
  lead?: boolean;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-1 py-3 ${last ? '' : 'border-r border-rule'}`}
      style={{ paddingLeft: lead ? 16 : 14 }}
    >
      <Text style={LABEL} className="text-ink-faint">
        {label}
      </Text>
      <Text
        style={{
          fontFamily: font.monoSemibold,
          fontSize: 24,
          letterSpacing: -0.8,
          fontVariant: ['tabular-nums'],
        }}
        className="text-ink"
      >
        {value}
      </Text>
    </View>
  );
}

function extraNotes(
  site: Takeoff,
  caution: string | null,
): { label: string; text: string }[] {
  const seen = new Set(caution ? [caution] : []);
  const rows: { label: string; text: string }[] = [];
  const add = (label: string, text: string | null) => {
    if (!text || seen.has(text)) return;
    seen.add(text);
    rows.push({ label, text });
  };
  add('Getting there', site.goingThere);
  add('Site weather notes', site.weatherNotes);
  add('Notes', site.comments);
  add('Takeoff', site.description);
  add('Landing', site.landing?.description ?? null);
  return rows;
}

function flyableLabel(status: Flyable): string {
  switch (status) {
    case 'good':
      return 'Flyable now';
    case 'possible':
      return 'Possible';
    case 'off':
      return 'Off window';
    case 'strong':
      return 'Too strong';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function flyableColor(status: Flyable, colors: Palette): string {
  switch (status) {
    case 'good':
      return colors.climbStrong;
    case 'possible':
      return colors.warn;
    case 'off':
      return colors.inkFaint;
    case 'strong':
      return colors.sink;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function FlyableBadge({ status }: { status: Flyable }) {
  const colors = useThemeColors();
  const color = flyableColor(status, colors);
  return (
    <View
      className="flex-row items-center gap-1.5 self-center rounded-xl px-2.5"
      style={{ height: 24, backgroundColor: `${color}1A` }}
    >
      <View
        className="rounded-full"
        style={{ width: 7, height: 7, backgroundColor: color }}
      />
      <Text
        style={{ fontFamily: font.sansSemibold, fontSize: 11, color }}
      >
        {flyableLabel(status)}
      </Text>
    </View>
  );
}

function WindHours({
  hours,
  siteWind,
  colors,
}: {
  hours: HourBar[];
  siteWind: Wind;
  colors: Palette;
}) {
  const peak = Math.max(...hours.map((hour) => hour.speedMs), 1);
  return (
    <View className="border-t border-rule px-4 pt-2 pb-4">
      <View className="flex-row items-baseline justify-between pb-2.5 pt-2">
        <Text style={LABEL} className="text-ink-faint">
          Wind at takeoff
        </Text>
        <Text
          style={{ fontFamily: font.mono, fontSize: 10 }}
          className="text-ink-faint"
        >
          M/S · GUST
        </Text>
      </View>
      <View className="flex-row items-end gap-2">
        {hours.slice(0, 7).map((hour, index) => {
          const status = flyable(siteWind, hour);
          const height = 8 + (hour.speedMs / peak) * 37;
          return (
            <View
              key={`${hour.hourLabel}-${index}`}
              className="flex-1 items-center gap-1.5"
            >
              <Text
                style={{
                  fontFamily: font.monoSemibold,
                  fontSize: 11,
                  fontVariant: ['tabular-nums'],
                }}
                className="text-ink"
              >
                {hour.speedMs.toFixed(1)}
              </Text>
              <View
                className="w-full"
                style={{
                  height,
                  backgroundColor: flyableColor(status, colors),
                }}
              />
              <Text
                style={{ fontFamily: font.mono, fontSize: 10 }}
                className="text-ink-muted"
              >
                {hour.hourLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-3">
      <Text
        style={{ fontFamily: font.sans, fontSize: 12 }}
        className="text-ink-muted"
      >
        {label}
      </Text>
      <Text
        style={{ fontFamily: font.sansSemibold, fontSize: 12 }}
        className="shrink text-right text-ink"
      >
        {value}
      </Text>
    </View>
  );
}
