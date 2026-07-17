# GridWatch — Multi-Source Ingestion Architecture v3
*Adding best-route diversion scoring and plain-language incident explanations on top of the v2 pipeline (TTC GTFS-RT, Ontario 511, 311, Construction/Permits)*

---

## 0. Design principle

Not all sources update at the same speed. Treat this as **three tiers**, not one uniform pipeline:

| Tier | Update cadence | Sources | Role |
|---|---|---|---|
| **Real-time (push/poll <60s)** | seconds–1 min | TTC GTFS-RT (Vehicle Positions, Trip Updates, Service Alerts) | "What's happening right now" |
| **Near-real-time (poll 5–15 min)** | minutes | Ontario 511 (Events, Road Conditions, Alerts) | "What's changing this hour" |
| **Slow/background (poll hourly–daily)** | hours–days | 311 service requests, Construction/permits, Ontario 511 Construction & Cameras metadata | "What's coming / structural context" |

Your risk-scoring engine should weight these differently — real-time tier drives the live risk score, slow tier drives the **predictive** 24–36hr layer. Don't average them together with equal weight; that's the mistake that would make the causal-chain diagram not actually work in practice.

**New in v3:** the risk score is no longer the end product shown to a user — it's an input to two new consumer layers: a route recommendation engine (section 5) and a plain-language explanation layer (section 6). Neither layer recalculates risk itself; they both read from the same scoring output so a fix to the scoring logic automatically propagates everywhere.

---

## 1. Source-by-source integration notes

### 1.1 TTC GTFS-Realtime (Tier 1 — do this first)

- **Feeds:** Vehicle Positions, Trip Updates, Service Alerts — all three published as protobuf at fixed public URLs, no API key.
- **Poll interval:** 15–30 seconds for Vehicle Positions/Trip Updates; Service Alerts can poll every 60s.
- **Processing:**
  - Decode protobuf → JSON (use `gtfs-realtime-bindings` npm package or `gtfs-realtime-bindings` Python equivalent).
  - Compute **bunching**: two+ vehicles on the same route/direction within X meters or Y seconds of each other, sustained over 2+ polling cycles.
  - Compute **missing/ghost bus**: scheduled trip (from static GTFS) with no matching vehicle position for >N minutes past scheduled time.
  - Compute **delay severity**: `actual_arrival - scheduled_arrival` from Trip Updates, bucketed (on-time / minor / moderate / severe) — this delay-in-minutes number is what section 6 quotes verbatim, not a re-estimate.
- **Storage:** don't persist every ping — store rolling 2-hour window in a fast store (Redis or in-memory), and only persist aggregated per-route/per-15-min summaries to your main DB.
- **Note:** you'll also want the **static GTFS** feed (schedule + shapes) as a one-time/weekly download — it's the reference your real-time deltas are computed against, and it's also the road/rail geometry the route recommendation engine matches against.

### 1.2 Ontario 511 (Tier 2)

- **Requires:** developer registration + API key (budget a day for onboarding/approval, don't assume instant access).
- **Feeds you actually want:** Events, Construction, Road Conditions, Alerts. Cameras is optional/nice-to-have — treat as Tier 3 or skip for v2.
- **Poll interval:** 5–15 minutes is sufficient; these don't update faster than that in practice.
- **Processing:** geofence-match incidents against your existing corridor/route geometry so they can be joined with TTC delay data spatially, and so section 5 can price them into route cost.

### 1.3 311 (Tier 3 — verify before you architect around it)

- **Before building:** confirm whether Brampton/Mississauga expose 311 as a **live API** or only a **periodic open-data CSV export**. Toronto's pattern is historical bulk export, not real-time — assume the same until you've confirmed otherwise for Peel/Brampton.
- **If live API exists:** poll hourly, filter to categories that matter (road obstruction, flooding, watermain break, signal outage, fallen tree, sinkhole, streetlight outage).
- **If only bulk export exists:** treat as a **lagging validation layer** — use it to backtest your risk model after the fact, not as a live input.

### 1.4 Construction / Permits (Tier 3)

- Aggregate: building permits, road occupancy permits, utility work, lane closures, capital projects, watermain/sewer work.
- **Cadence:** weekly poll is usually sufficient — this data moves slowly and is often stale by nature.
- **Role:** this is your predictive layer, and a key input to explanation clusters — a permit record is usually the single best "why" a lane closure exists, so it's the fact section 6 leans on most for the "why it matters" sentence.

---

## 2. Pipeline architecture

```
                     ┌─────────────────────────────────────────┐
                     │            SCHEDULER / POLLER             │
                     │   (cron-style workers, per-tier interval) │
                     └───────────────┬─────────────────────────┘
                                     │
        ┌─────────────┬─────────────┼─────────────┐
        ▼             ▼             ▼             ▼
   TTC GTFS-RT    Ontario 511      311          Construction
   (15-30s)       (5-15min)      (hourly)      (weekly)
        │             │             │             │
        └─────────────┴──────┬──────┴─────────────┘
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
                  └─────┬─────────────┬─────┘
                        ▼             ▼
          ┌───────────────────┐  ┌─────────────────────────┐
          │  ROUTE RECOMMEND-   │  │  EXPLANATION LAYER (LLM) │
          │  ATION ENGINE        │  │  cluster → plain-English  │
          │  (section 5)          │  │  cause + delay + action    │
          │                       │  │  (section 6)                │
          └───────────┬───────┘  └───────────┬─────────────┘
                       └─────────────┬────────┘
                                     ▼
                  ┌───────────────────────┐
                  │   DASHBOARD / MAP LAYER │
                  │   (see section 7)        │
                  └───────────────────────┘
```

### Storage recommendation

- **Hot layer:** Redis (or Supabase's built-in realtime) for Tier 1 rolling window — sub-minute writes, short TTL.
- **Warm layer:** Postgres + PostGIS for spatial joins, incident clusters, and cached route/explanation output.
- **Cold layer:** flat storage (S3-compatible or files) for historical snapshots used in backtesting.

### Backend note

Given your existing prototype is React + Leaflet, the cleanest way to bolt this on without a rewrite is a small **Node/Express polling service** running these pollers on separate intervals, writing normalized GeoJSON into Postgres/PostGIS, and exposing a single `/api/live-layer` endpoint your frontend polls or subscribes to via WebSocket. Don't have the frontend hit TTC/511/etc directly.

---

## 3. Source-by-source integration notes *(carried over, unchanged from v2)*

See section 1 above — this section intentionally left as a pointer so the doc stays in the same order you're used to; no separate content here in v3.

---

## 5. Route Recommendation Engine ("take this route instead")

The risk score alone tells you a corridor is bad. It doesn't tell a rider or driver what to do about it. This layer's job is to answer, specifically: *given where you are and where you're going, which of the 2–3 realistic paths is actually better right now, and how much better.*

**Design principle:** this is a comparison/decision layer, not a new risk calculation. It only consumes the output already produced by the Risk Scoring Engine (section 2) — it never scores anything independently. That keeps routing and the live map permanently in sync.

- **Candidate route generation:** self-host **OSRM** (free, open-source, runs on the same OpenStreetMap extract you're already pulling for Protomaps tiles — no new data source). Call it with `alternatives=true` to get 2–3 geometrically distinct paths between an origin/destination pair. For the ambient "ahead of time" view (no specific trip requested yet), maintain a small table of known chronic bottleneck pairs (e.g., Gardiner ↔ Lakeshore, Bloor ↔ Harbord) so the dashboard can show live recommendations without waiting on a user query.
- **Segment risk lookup:** match each candidate route's polyline against the corridor segments already indexed in PostGIS from the spatial join step, and sum the weighted risk along the route.
- **Delay translation:** convert accumulated segment risk plus live TTC delay / 511 duration data into an actual **added-minutes number** — not a raw score. A user needs "adds about 8 minutes," not "risk index 0.62."
- **Recommendation output** (per route pair):

  ```
  {
    recommended_route_id,
    alternate_route_id,
    time_saved_min,
    primary_reason,        // e.g. "lane closure at Bloor & Dufferin"
    avoid_segment,          // street name / cross streets, not lat/lng
    source                  // feed(s) the reason was drawn from
  }
  ```

- **Refresh cadence:** recompute on-demand when a specific route is requested; background-refresh the chronic-bottleneck-pair table every 2–3 minutes so ambient dashboard callouts ("Lakeshore is currently the better call") stay current without per-user load.
- **Presentation rule (matches section 6's tone):** the UI sentence should read like *"Avoid the curb lane on Bloor St W near Dufferin — watermain repair, adds ~6 min. Take Harbord St instead."* Not a score, not a heatmap value — a lane, a reason, a number of minutes, and the alternative.

---

## 6. Plain-Language Incident Explanation Layer

The goal: turn a normalized event (or a cluster of correlated events) into 2–3 sentences a resident, a BIA, or a city ops person can read once and act on — with the source cited and a delay in minutes, not a severity score.

**Design principle — separate the facts from the phrasing.** Every number in the output (delay minutes, ETA, severity bucket) is computed deterministically upstream in sections 1–2. The LLM's only job is to phrase those facts and stitch correlated events into one causal sentence — it never invents or recalculates a number. This matters for a civic-safety tool: a hallucinated number silently erodes trust, but plain-language synthesis is exactly the kind of task an LLM does well and safely when it's fed fixed facts instead of asked to compute them.

**Pipeline:**

1. **Event correlation:** before anything is written, group events that spatially/temporally overlap (e.g., a 511 lane closure + a construction permit + a 311 watermain report on the same block) into one *incident cluster* instead of three separate alerts. This is the causal-chain step referenced in section 0.
2. **Fact assembly:** build a small structured record per cluster:

   ```
   {
     what: [event types in the cluster],
     where: "Bloor St W between Dufferin and Lansdowne",
     since: timestamp,
     delay_min: 14,                 // from TTC Trip Updates delta or 511 estimated duration
     severity: "moderate",
     sources: [
       { feed: "TTC Service Alerts", fetched_at: ... },
       { feed: "Ontario 511", fetched_at: ... },
       { feed: "City of Toronto Permit #12345", fetched_at: ... }
     ]
   }
   ```

3. **LLM call** — one short prompt per *new or changed* cluster, not per raw event. Input is the fact record above; output follows a fixed 3-line template so it reads the same way every time:
   - **What's happening:** "Watermain repair on Bloor St W between Dufferin and Lansdowne."
   - **Why it matters:** "This is causing the 29 bus to run about 14 minutes behind schedule and has closed the curb lane."
   - **What to do:** "Avoid the curb lane. Use the centre lane, or divert via Harbord St — adds about 6 minutes."
4. **Caching:** store the generated summary keyed to the incident cluster ID; only regenerate when the underlying facts change materially (delay bucket shifts, status changes, cluster membership changes) — not every 15–30s poll. This keeps LLM calls roughly one per incident lifecycle rather than one per poll cycle.
5. **Source line on every summary:** *"Source: TTC Service Alerts, Ontario 511, City of Toronto Permit #12345 — as of 3:42pm."* This lets a reader or organization verify the claim instead of just trusting the sentence, and it's what makes the tool usable by other orgs, not just individual commuters.

**Serving:** cache the generated text alongside the incident cluster row in Postgres and serve it as an extra field on the same `/api/live-layer` endpoint — no second round-trip for the frontend.

---

## 7. Map source — the actual fix for lag/rotation/glitching

**Your Leaflet + OpenStreetMap setup is the core problem, not a config issue.** Leaflet renders with the DOM/Canvas and has no native 3D rotation/tilt — any "360 rotate" bolted onto Leaflet is a hack (CSS transform on the tile container) and it *will* glitch, especially with live markers layered on top.

### Recommendation: switch the map engine to **MapLibre GL JS**

- **Why:** WebGL-rendered (GPU-accelerated), so panning/zooming/rotating is smooth even with hundreds of live markers updating every 15–30 seconds — which Leaflet will choke on.
- **True 3D rotation & pitch** is a first-class feature (`map.rotateTo()`, `map.setPitch()`, drag-to-rotate) — not a hack.
- **Free and open-source**, no vendor lock-in — important for a startup budget.
- **Vector tiles** instead of raster tiles = crisper zoom at any level, much less bandwidth, no pixelation.

### Tile source pairing

- **Protomaps** — free, self-hostable vector tiles built from OpenStreetMap data, no per-request billing, no API key required for self-hosted.
- Alternative if you want managed/hosted tiles with less ops overhead: **MapTiler** (generous free tier, drop-in MapLibre style JSON, GTA coverage is solid).

### Migration path (low-risk, incremental)

1. Swap `react-leaflet` for `react-map-gl` — API is conceptually similar (markers, popups, layers), so this isn't a full rebuild.
2. Point it at a MapLibre style JSON (Protomaps or MapTiler).
3. Re-plug your existing data sources plus the new route-recommendation and explanation layers as GeoJSON sources — MapLibre handles frequent GeoJSON updates (`map.getSource(id).setData(...)`) efficiently.
4. Enable `dragRotate` and `touchZoomRotate` for the 360° interaction, and `pitch`/`bearing` props for tilt.

---

## 8. Suggested build order

1. MapLibre GL migration (fixes the demo-killing lag/rotation issue immediately — do this before adding more data or logic).
2. TTC GTFS-RT ingestion (free, fastest path to a genuinely new capability).
3. Node/Express polling service + PostGIS (the backbone everything else plugs into).
4. Ontario 511 (once polling infra exists, this is a quick addition).
5. 311 + Construction as the predictive/backtest layer (lowest urgency, verify live-vs-static first).
6. Route Recommendation Engine — stand up OSRM against your OSM extract, wire it to the existing risk scores (section 5).
7. Plain-Language Explanation Layer — event clustering + fact assembly first, LLM phrasing last; this is the piece that turns raw feeds into something a non-technical reader or partner org can act on (section 6).
