# GridWatch — Product Requirements Document

## Vision
GridWatch predicts infrastructure and transit conflicts across the GTA *before* they happen — fusing road closures, construction, transit disruptions, and weather into one real-time intelligence layer for operators, drivers, and residents.

## Target users
- **TTC, Brampton Transit, MiWay** — route planning and live diversion decisions
- **EMS / Fire / Logistics** — corridor risk assessment and reroute
- **Residents** — everyday commuter awareness

## Core capabilities
1. **Multi-source ingestion** — 5+ public data feeds unified into one pipeline
2. **Conflict detection engine** — spatial + temporal clustering of overlapping events
3. **Role-aware dashboards** — EMS, Fire, Logistics, TTC, Brampton Transit, MiWay, Resident
4. **Route recommendation** — "take this street instead, saves ~6 min"
5. **Plain-language explanation** — LLM-synthesized cause + delay + action
6. **Predictive forecast** — 24–36h forward view

## Data sources
| Source | Type | Status |
|---|---|---|
| Toronto Open Data | Construction permits, road occupancy | Live |
| Brampton GeoHub | Road closures, construction | Live |
| Peel Region Data Portal | Regional infrastructure | Live |
| Transit GTFS-Realtime | TTC, Brampton Transit, MiWay | Needs endpoint update |
| Ontario 511 | Highway events, conditions | Needs API key |

## Current status
See `KNOWN_ISSUES.md` for known bugs and `CHANGELOG.md` for version history.
