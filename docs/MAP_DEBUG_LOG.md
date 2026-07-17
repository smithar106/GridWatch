# Map Debug Log

## Known issue
The map does not reliably render on first load — may show blank canvas instead of street tiles and conflict markers.

## Root cause analysis
The original build used Leaflet + OpenStreetMap raster tiles with a CSS-transform hack for rotation. The v2 rewrite migrated to MapLibre GL JS with vector tiles, but tile loading depends on:
1. CDN availability for MapLibre GL JS (v4.7.1)
2. Tile server CORS configuration
3. Container visibility at init time (map must be mounted and measured before `maplibregl.Map()` is called)

## Fix applied (v4.1)
- Switched default tile source from OpenFreeMap to **CARTO dark matter** (free, no key, CORS-enabled)
- Added automatic fallback to **MapLibre demo tiles** if CARTO fails
- Added visual error state with retry button (no more silent blank canvas)
- Fixed container dimension check to retry until measured
- Fixed font stack for symbol layers (Open Sans → Noto Sans → Arial)
- Map is now kept alive when tabbing away (display:none instead of unmount)

## To test
Run `tests/map_test.html` in a browser. It loads CARTO dark matter, MapLibre demo, and OpenFreeMap with status indicators for each.

## If map still fails
1. Check browser console for CORS or network errors
2. Verify `maplibregl` object is loaded (v4.7.1 from CDN)
3. Try a different browser (WebGL support varies)
4. Open `tests/map_test.html` directly (isolates map code from React app)
