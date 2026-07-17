# Known Issues

Read this before anything else — these are the things that will be obviously broken if you run the app right now.

## 🔴 Map does not reliably render
Opening `app/gridwatch_v4.html` and going to the Map tab may show a blank canvas instead of the street map and conflict markers. This has been through 8 rounds of debugging — full history, diagnosis, and the exact next step are in `docs/MAP_DEBUG_LOG.md`. Short version: it's not yet confirmed whether this is a code bug or a limitation of the preview environment it's been tested in. `tests/map_test.html` is a minimal isolation test built specifically to answer that question.

**Everything else in the app works** — Home, Forecast, Alerts, AI chat, role switching, and the conflict detail sheets all render and function normally even while the map is broken.

## 🟡 TTC live feed needs a current endpoint
The public TTC GTFS-Realtime endpoint used in earlier versions (`bustime.ttc.ca`) is retired (returns 403). The backend falls back to realistic simulated bus positions. To get real data, register a free key at transit.land and set `TTC_RT_URL` — see `backend/.env.example` and `backend/README.md`.

## 🟡 Ontario 511 feed returns empty
The backend successfully connects to 511on.ca but the response comes back empty in testing — the endpoint path or expected field names likely need updating against 511's current developer docs. Falls back to mock data. See `backend/src/feeds/on511.js`.

## 🟢 Environment Canada weather — works
Confirmed working from a normal network (returned 403 only inside a sandboxed dev environment that blocks external gov hosts). No key required.

## Not yet built (by design, not by accident)
- No auth/user accounts
- No push notifications
- No production hosting/deployment config
- No Redis/PostGIS (documented as the next scaling step in `docs/INGESTION_ARCHITECTURE.md`, not implemented)
- Location-specific route intelligence is hand-authored for 5 GTA locations, not yet automatic for arbitrary streets — needs a real routing engine
