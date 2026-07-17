# GridWatch Backend

Multi-source polling service for GTA infrastructure conflict data.

## Quick start

```bash
cp .env.example .env
npm install
npm start
```

Server runs on `http://localhost:8787` by default.

## API

| Endpoint | Description |
|---|---|
| `GET /api/all` | Returns combined TTC + 511 + weather + mock data |
| `GET /api/status` | Returns status of each live feed |

## Feed status

| Feed | Status | Notes |
|---|---|---|
| TTC GTFS-RT | ⚠️ Needs endpoint update | Old `bustime.ttc.ca` endpoint retired; falls back to simulated data |
| Ontario 511 | ⚠️ Returns empty | Endpoint path/fields may need updating against current 511 docs |
| Environment Canada | ✅ Working | No key required, confirmed working from normal network |
| Mock | ✅ Always available | Realistic fallback so demos never break |

## Environment

See `.env.example` for all variables. Only `PORT` is required; missing feed URLs trigger graceful fallback to mock data.
