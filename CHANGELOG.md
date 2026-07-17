# Changelog

## V4.1 — Map rendering fix & Railway deployment
- **Map fix:** switched from OpenFreeMap tiles to CARTO dark matter (CORS-enabled, no key needed) with automatic fallback to MapLibre demo tiles.
- **Map fix:** added error boundary with visual retry state — no more silent blank canvas.
- **Map fix:** fixed container dimension detection and tab-switching resize handling.
- **Map fix:** fixed font stack for symbol layers for cross-browser compatibility.
- Added full Railway deployment config: Dockerfile, nginx.conf, railway.json.
- Added `tests/map_test.html` — standalone MapLibre tile isolation test.
- Created backend Node/Express polling server with TTC/511/weather/mock feed modules.
- Added `.env.example` with documented environment variables.
- Created `docs/PRD.md` and updated `docs/MAP_DEBUG_LOG.md`.

## V4 — Specific route intelligence & weather geography
- Per-location intelligence for key GTA conflict points: named lane/direction, specific reason, named detour street, estimated added minutes.
- Weather reframed from a pure risk multiplier into geographic consequence: named flood-prone intersections, named at-risk construction sites, drainage-behavior explanation per weather type (rain/snow/freezing rain).
- Contributing-events explainer: each event now shows what/why/fix/source in plain language.
- New **Resident** role — same data, everyday-language phrasing, toggled alongside the existing operational roles (EMS/Fire/Logistics/TTC/Brampton Transit/MiWay).
- Frontend now calls the real Node backend (`/api/all`) for TTC/weather/511, falling back to simulated data with an honest status indicator when the backend isn't running.

## V3 — Predictive layer, tiered sources, live map fixes
- Vector-tile map rebuild: GeoJSON source + GPU circle/symbol layers instead of DOM markers (performance).
- 24–36h predictive forecast layer with confidence %, time horizon, and causal-chain explanation.
- Weather-as-multiplier: Clear / Rain / Snow / Freezing Rain scenarios amplifying conflict severity scores.
- TTC GTFS-RT live-attempt with honest SIMULATED fallback labelling (no fake "live" claims).
- Data sources reorganized into 3 tiers: Real-time / Near-real-time / Predictive, matching the ingestion architecture.
- 3D map pitch toggle, Live/Forecast/Both map mode toggle.
- Multiple map-rendering bug fixes (see `docs/MAP_DEBUG_LOG.md` for the full history — map rendering is still not fully resolved as of V4).

## V2 — GTA expansion, role switcher
- Expanded from single-city to GTA-wide (Toronto, Brampton, Mississauga) conflict detection.
- Role switcher: EMS, Fire, Logistics, TTC, Brampton Transit, MiWay — each with focus-specific framing.
- AI chat with role-aware quick prompts and a local fallback answer engine.
- 5-source data foundation: Toronto Open Data, Brampton GeoHub, Peel Region Data Portal, Transit GTFS-Realtime, Ontario 511.

## Earlier
- Original GridWatch concept: real-time Canadian electricity grid / holographic terminal visualization, later evolved into the GTA infrastructure-conflict-prediction platform.
