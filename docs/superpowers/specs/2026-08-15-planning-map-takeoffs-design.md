# Planning map takeoffs (ParaglidingEarth)

Date: 2026-08-15  
Status: approved for planning; not yet implemented

Show ParaglidingEarth takeoffs on the **planning map** (Fly tab) so a pilot can scout spots before starting a flight. Weather-on-tap is later. This slice only plots takeoffs and identifies them.

## Context

- Planning map: `app/(tabs)/index.tsx` — MapTiler outdoor style, user location, **Fly** CTA into `/fly`.
- In-flight HUD: `app/fly.tsx` — **no sites** in this slice.
- MapLibre React Native 11: `GeoJSONSource`, circle `Layer`, `onRegionDidChange`, source `onPress`.
- Bottom sheets already use `@gorhom/bottom-sheet` (see `ReadoutSheet`).
- PGE API: [paraglidingearth.com/api](https://paraglidingearth.com/api/). HTTPS works. Responses are GeoJSON `FeatureCollection` of takeoff `Point`s. Property values are **strings** (`takeoff_altitude: "560"`, wind `W: "2"`).
- License: CC BY-SA 3.0. Credit ParaglidingEarth in the UI.

## Product decisions

| Choice | Decision |
|---|---|
| Where | Planning map only, never `/fly` |
| Marks | Quiet navy dots (`#1B3A6B`), white stroke |
| What plots | Takeoffs only. Landings are not dots |
| Tap | Glass bottom sheet |
| Fly CTA | May sit **behind** the sheet. Tap empty map to dismiss and get Fly back |
| Load | Follow the visible map (bounding box), not a GPS radius, not a country dump |
| Weather | Out of scope |

## Architecture

```
Map onRegionDidChange
  → useTakeoffSites (debounce ~400ms, zoom ≥ 8, abort stale)
    → lib/pgearth (HTTPS bbox GeoJSON, coerce types)
      → GeoJSONSource + circle Layer
        → onPress → SiteSheet
```

Failed refetch keeps the last good collection. Zoom below 8: no request, clear dots.

## Files

| File | Responsibility |
|---|---|
| `lib/pgearth.ts` | URL, fetch, types, string→number coercion, paragliding filter |
| `hooks/useTakeoffSites.ts` | Viewport subscription, debounce, min zoom, abort, last-good cache |
| `components/sites/TakeoffLayer.tsx` | GeoJSONSource, circle paint, selected scale, press |
| `components/sites/SiteSheet.tsx` | Glass sheet: name, altitude, wind rose, optional landing |
| `components/sites/WindRose.tsx` | Eight ticks for N…NW at 0 / 1 / 2 |
| `app/(tabs)/index.tsx` | Wire hook, layer, sheet, attribution. Leave `/fly` unchanged |

## Data

Request:

`GET https://www.paraglidingearth.com/api/geojson/getBoundingBoxSites.php`

Query: `south`, `north`, `west`, `east`, `style=detailled`. No `limit` — min zoom is the safety valve. Do not use HTTP; iOS ATS would block it.

Keep a feature if `paragliding` is truthy (`"1"`). Drop hang-gliding-only sites.

Normalize at the library boundary so the UI never sees PGE strings:

- `id`: `pge_site_id`
- `name`
- `altitude` (meters, number)
- `wind`: `{ N, NE, E, SE, S, SW, W, NW }` each `0 \| 1 \| 2`
- `landing`: `{ lat, lng }` or `null` if lat/lng missing or `""`
- `geometry`: takeoff Point

Skip a refetch if the new bounds are still inside the last requested box (small pans). Abort the in-flight request when a newer one starts.

## Map layer

- Circle color: theme `brand` (`#1B3A6B` light / `#7FA8E0` dark).
- White (paper) stroke, ~2px.
- Selected site: larger radius. Unselected stay quiet.
- `GeoJSONSource` `onPress` selects by `pge_site_id`. Press on empty map (Map `onPress` with no takeoff features) clears selection and closes the sheet.
- Tap another site: replace sheet contents; do not stack sheets.

## Site sheet

Glass surface, same family as the HUD (Instrument Sans name, Martian Mono altitude, `LABEL` caps).

Always:

- Caps label **Takeoff**
- Site name
- Caps label **Alt m** + integer altitude

Wind rose: eight ticks. `0` faint, `1` possible (muted), `2` good (brand). No numeric legend.

Landing line **only** when `landing` is non-null, e.g. `Landing recorded`. No fake name/altitude — PGE often has coords only. Omit the row entirely when null.

Not in this slice: weather, PGE deep-link, takeoff description, parking.

Sheet covers the Fly button. That is intended.

## Empty and error

| Situation | UI |
|---|---|
| First load / waiting on PGE | Map, no dots, no spinner |
| Refetch fails | Keep last good dots, no toast |
| Zoom &lt; 8 | Clear dots, no request |
| Box has no takeoffs | Empty map |
| Site with no wind / all zeros | Rose still renders, all faint |
| No GPS | Still works; camera starts at the existing Voss default |

## Attribution

Small “ParaglidingEarth” credit near the existing MapTiler attribution (bottom-left). Required by CC BY-SA 3.0.

## Out of scope

- Weather on tap
- Landing dots
- Clustering
- Disk / country cache
- Sites on the in-flight HUD
- Offline guarantee beyond “last good collection this session”

## Testing

- `npm run typecheck`
- Manual on device/simulator:
  1. Open Fly tab around Voss — navy dots appear after the map settles.
  2. Tap a takeoff (e.g. Bjørnestigen) — sheet with name, altitude, wind (W good on the sample site).
  3. Tap empty map — sheet closes, Fly visible again.
  4. Pinch out past zoom 8 — dots clear.
  5. After a successful load, kill the network and pan slightly inside the last box — dots remain.
