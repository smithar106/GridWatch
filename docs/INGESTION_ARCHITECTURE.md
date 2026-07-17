# GridWatch — Multi-Source Ingestion Architecture v2
*Adding TTC GTFS-RT, Ontario 511, 311, Construction/Permits, and Weather to the existing 4-source MVP*

---

## 0. Design principle

Not all sources update at the same speed. Treat this as **three tiers**, not one uniform pipeline:

| Tier | Update cadence | Sources | Role |
|---|---|---|---|
| **Real-time (push/poll <60s)** | seconds–1 min | TTC GTFS-RT (Vehicle Positions, Trip Updates, Service Alerts) | "What's happening right now" |
| **Near-real-time (poll 5–15 min)** | minutes | Ontario 511 (Events, Road Conditions, Alerts), Weather (Environment Canada) | "What's changing this hour" |
| **Slow/background (poll hourly–daily)** | hours–days | 311 service requests, Construction/permits, Ontario 511 Construction & Cameras metadata | "What's coming / structural context" |

Your risk-scoring engine should weight these differently — real-time tier drives the live risk score, slow tier drives the **predictive** 24–36hr layer. Don't average them together with equal weight; that's the mistake that would make the causal-chain diagram not actually work in practice.

---

## 1. Source-by-source integration notes

### 1.1 TTC GTFS-Realtime (Tier 1 — do this first)
- **Feeds:** Vehicle Positions, Trip Updates, Service Alerts — all three published as protobuf at fixed public URLs, no API key.
- **Poll interval:** 15–30 seconds for Vehicle Positions/Trip Updates; Service Alerts can poll every 60s.
- **Processing:**
  - Decode protobuf → JSON (use `gtfs-realtime-bindings` npm package or `gtfs-realtime-bindings` Python equivalent).
  - Compute **bunching**: two+ vehicles on the same route/direction within X meters or Y seconds of each other, sustained over 2+ polling cycles.
  - Compute **missing/ghost bus**: scheduled trip (from static GTFS) with no matching vehicle position for >N minutes past scheduled time.
  - Compute **delay severity**: `actual_arrival - scheduled_arrival` from Trip Updates, bucketed (on-time / minor / moderate / severe).
- **Storage:** don't persist every ping — store rolling 2-hour window in a fast store (Redis or in-memory), and only persist aggregated per-route/per-15-min summaries to your main DB. Otherwise this tier alone will drown your database.
- **Note:** you'll also want the **static GTFS** feed (schedule + shapes) as a one-time/weekly download — it's the reference your real-time deltas are computed against.

### 1.2 Ontario 511 (Tier 2)
- **Requires:** developer registration + API key (budget a day for onboarding/approval, don't assume instant access).
- **Feeds you actually want:** Events, Construction, Road Conditions, Alerts. Cameras is optional/nice-to-have (image snapshots, heavier bandwidth, lower analytical value — treat as Tier 3 or skip for v2).
- **Poll interval:** 5–15 minutes is sufficient; these don't update faster than that in practice.
- **Processing:** geofence-match incidents against your existing corridor/route geometry so they can be joined with TTC delay data spatially.

### 1.3 311 (Tier 3 — verify before you architect around it)
- **Before building:** confirm whether Brampton/Mississauga expose 311 as a **live API** or only a **periodic open-data CSV export**. Toronto's pattern is historical bulk export, not real-time — assume the same until you've confirmed otherwise for Peel/Brampton.
- **If live API exists:** poll hourly, filter to categories that matter (road obstruction, flooding, watermain break, signal outage, fallen tree, sinkhole, streetlight outage).
- **If only bulk export exists:** treat as a **lagging validation layer**, not a live sensor — use it to backtest your risk model after the fact ("did a 311 flood spike correlate with the road closure we predicted?"), not as a live input.

### 1.4 Construction / Permits (Tier 3)
- Aggregate: building permits, road occupancy permits, utility work, lane closures, capital projects, watermain/sewer work.
- **Cadence:** weekly poll is usually sufficient — this data moves slowly and is often stale by nature (posted before work starts, not updated live).
- **Role:** this is your predictive layer — a permit + upcoming weekend event + highway lane closure is a *leading* indicator, computed hours to days ahead, not a live signal.

### 1.5 Weather (Tier 2)
- **Source:** Environment Canada's public alerts/API (free, no key, well-documented) — use this over a commercial weather API for v1 to keep costs at zero.
- **Poll interval:** 10–15 minutes for alerts, hourly for radar/rainfall accumulation.
- **Role:** the multiplier signal in your causal chain — rain/snow intensity raises the weight of 311 flood reports and 511 road conditions.

---

## 2. Pipeline architecture

```
                     ┌─────────────────────────────────────────┐
                     │            SCHEDULER / POLLER             │
                     │   (cron-style workers, per-tier interval) │
                     └───────────────┬─────────────────────────┘
                                     │
        ┌─────────────┬─────────────┼─────────────┬─────────────┐
        ▼             ▼             ▼             ▼             ▼
   TTC GTFS-RT    Ontario 511    Weather (EC)     311          Construction
   (15-30s)       (5-15min)      (10-15min)      (hourly)      (weekly)
        │             │             │             │             │
        └─────────────┴──────┬──────┴─────────────┴─────────────┘
                              ▼
                  ┌───────────────────────┐
                  │   NORMALIZATION LAYER   │
                  │  - unify to GeoJSON      │
                  │  - common schema:        │
                  │    {source, type,        │
                  │     severity, lat, lng,   │
                  │     geometry, timestamp,  │
                  │     ttl, confidence}      │
                  └───────────┬───────────┘
                              ▼
                  ┌───────────────────────┐
                  │   SPATIAL JOIN ENGINE   │
                  │  match events to        │
                  │  corridors/routes via    │
                  │  geofencing (PostGIS or  │
                  │  turf.js buffer/within)  │
                  └───────────┬───────────┘
                              ▼
                  ┌───────────────────────┐
                  │   RISK SCORING ENGINE   │
                  │  weighted combination:   │
                  │  Tier1 (live) x 0.5      │
                  │  Tier2 (near-RT) x 0.3   │
                  │  Tier3 (predictive)x 0.2 │
                  └───────────┬───────────┘
                              ▼
                  ┌───────────────────────┐
                  │   DASHBOARD / MAP LAYER │
                  │   (see section 3)        │
                  └───────────────────────┘
```

### Storage recommendation
- **Hot layer:** Redis (or Supabase's built-in realtime) for Tier 1 rolling window — sub-minute writes, short TTL.
- **Warm layer:** Postgres + PostGIS for everything that needs spatial joins (511, 311, construction, corridor geometry). PostGIS is the right call here specifically because you're joining point/line events against route corridors — plain Postgres will make this painful.
- **Cold layer:** flat storage (S3-compatible or just files) for historical snapshots used in backtesting the causal chain.

### Backend note
Given your existing prototype is React + Leaflet, the cleanest way to bolt this on without a rewrite is a small **Node/Express polling service** running these pollers on separate intervals (use `node-cron` or simple `setInterval` workers per tier), writing normalized GeoJSON into Postgres/PostGIS, and exposing a single `/api/live-layer` endpoint your frontend polls or subscribes to via WebSocket. Don't have the frontend hit TTC/511/etc directly — CORS and rate limits will bite you exactly like your RSS dashboard did.

---

## 3. Map source — the actual fix for lag/rotation/glitching

**Your Leaflet + OpenStreetMap setup is the core problem, not a config issue.** Leaflet renders with the DOM/Canvas and has no native 3D rotation/tilt — any "360 rotate" bolted onto Leaflet is a hack (CSS transform on the tile container) and it *will* glitch, especially with live markers layered on top. That's very likely what you're already seeing.

### Recommendation: switch the map engine to **MapLibre GL JS**

- **Why:** WebGL-rendered (GPU-accelerated), so panning/zooming/rotating is smooth even with hundreds of live markers updating every 15–30 seconds — which Leaflet will choke on.
- **True 3D rotation & pitch** is a first-class feature (`map.rotateTo()`, `map.setPitch()`, drag-to-rotate) — not a hack. This directly solves your "rotates 360 degrees" requirement.
- **Free and open-source**, no vendor lock-in (it's the community fork of Mapbox GL after Mapbox went proprietary) — important for a startup budget.
- **Vector tiles** instead of raster tiles = crisper zoom at any level, much less bandwidth, no pixelation.

### Tile source pairing
- **Protomaps** — free, self-hostable vector tiles built from OpenStreetMap data, no per-request billing, no API key required for self-hosted. Best fit for a bootstrapped civic tech project since you control cost as usage grows.
- Alternative if you want managed/hosted tiles with less ops overhead: **MapTiler** (has a generous free tier, drop-in MapLibre style JSON, GTA coverage is solid) — easier to start with, costs kick in at scale.

### Migration path (low-risk, incremental)
1. Swap `react-leaflet` for `react-map-gl` (the React wrapper that works with MapLibre) — API is conceptually similar (markers, popups, layers), so this isn't a full rebuild.
2. Point it at a MapLibre style JSON (Protomaps or MapTiler).
3. Re-plug your existing four data sources + new live layer as GeoJSON sources on top — MapLibre handles frequent GeoJSON source updates (`map.getSource(id).setData(...)`) efficiently, which is exactly your live-marker use case.
4. Enable `dragRotate` and `touchZoomRotate` for the 360° interaction, and `pitch`/`bearing` props for tilt.

This is genuinely your strongest selling-point fix — a smooth, rotatable, GPU-rendered live map is a visibly different demo experience from a laggy Leaflet instance, and it's a legitimate architecture upgrade, not just cosmetic.

---

## 4. Suggested build order

1. MapLibre GL migration (fixes the demo-killing lag/rotation issue immediately — do this before adding more data, since more live markers will only stress Leaflet further).
2. TTC GTFS-RT ingestion (free, fastest path to a genuinely new capability).
3. Node/Express polling service + PostGIS (the backbone everything else plugs into).
4. Ontario 511 + Weather (once polling infra exists, these are quick additions).
5. 311 + Construction as the predictive/backtest layer (lowest urgency, verify live-vs-static first).
