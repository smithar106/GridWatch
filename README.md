# GridWatch

**GridWatch predicts infrastructure and transit conflicts across Toronto, Brampton, and Mississauga *before* they happen — instead of reporting them after, like Google Maps or Waze do.** It fuses road closures, construction, transit disruptions, and weather into one GTA-wide intelligence feed, so TTC, Brampton Transit, MiWay, EMS, and drivers can route around problems instead of into them.

> Built as a pitch/demo project for CivicTech Brampton and transit-agency conversations.

> ⚠️ **Before you dig in:** see `KNOWN_ISSUES.md` for current bugs and `LICENSE` for usage terms.

---

## Folder map

```
gridwatch/
├── README.md                        ← you are here
├── LICENSE                          ← usage terms
├── KNOWN_ISSUES.md                  ← what's broken right now
├── CHANGELOG.md                     ← version history (V2 → V4)
├── HANDOFF_CHECKLIST.md             ← pre-share checklist
├── Dockerfile                       ← Railway deployment
├── nginx.conf                       ← nginx config for Railway
├── railway.json                     ← Railway project config
├── app/
│   └── index.html                   ← full frontend (single-file React + MapLibre app)
├── backend/
│   ├── README.md                    ← how to run the backend
│   ├── package.json                 ← Node dependencies
│   ├── .env.example                 ← environment variables
│   └── src/
│       ├── server.js                ← Express server (API + static files)
│       └── feeds/
│           ├── ttc.js               ← TTC GTFS-RT poller
│           ├── on511.js             ← Ontario 511 poller
│           ├── weather.js           ← Environment Canada poller
│           └── mock.js              ← fallback data so demos never break
├── docs/
│   ├── PRD.md                       ← product requirements
│   ├── MAP_DEBUG_LOG.md             ← map bug history + fix applied
│   ├── INGESTION_ARCHITECTURE.md    ← data pipeline design (3-tier ingestion)
│   ├── architecture-v2-no-weather.md
│   ├── architecture-v3-routing-explanations.md
│   ├── gridwatch-flowchart.mermaid
│   └── gridwatch-mindmap.mermaid
└── tests/
    └── map_test.html                ← standalone MapLibre tile test
```

## Quick start

**Frontend only (demo mode, no backend needed):**
Open `app/index.html` in a browser. Works entirely with simulated data.

**With backend (live/mock API):**
```bash
cd backend
cp .env.example .env
npm install
npm start
```
Then open `http://localhost:8787` — the Express server serves both the API and frontend.

## Deploy on Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

1. Connect your GitHub repo
2. Set `PORT` to `8787` (Railway sets `PORT` automatically)
3. Add any feed API keys as environment variables (`ONTARIO_511_API_KEY`, `TTC_RT_URL`)
4. Deploy — the Dockerfile handles everything

## Current status

- ✅ Conflict detection, route intelligence, weather panels, role-based phrasing, AI chat — all working
- ✅ Map rendering fixed — CARTO dark matter tiles with auto-fallback
- ⚠️ TTC/511 live feeds need endpoint verification — see `backend/README.md`
- 🚧 Route recommendation engine (OSRM) and LLM explanation layer — documented in architecture docs, not yet built

## Version history
- **V4.1** — Map fix: reliable tile source, error handling, fallback chain
- **V4** — Route intelligence, weather geography, contributing-event explainer, resident role
- **V3** — Vector tiles, tiered data sources, predictive forecast, weather multiplier
- **V2** — GTA expansion, role switcher, 5-source data foundation

## Built by
Arthur Smith & Ashlee Thomas — Red Derby Ventures LLC
