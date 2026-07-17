# Handoff Checklist — What This Project Needs Before Sharing

This file is the brief itself: a running checklist of what a project folder needs before you send it to someone else to review cold (investor, CivicTech collaborator, hiring manager). Kept separate from `LICENSE` so the legal/usage terms stay their own clean file.

---

## License & usage terms
- [x] `LICENSE` file present at project root — states "all rights reserved, personal project," with an explicit note that reviewers may read/run/discuss but must ask before reusing.
- [ ] If this ever goes open-source or gets a co-founder/contributor, revisit and pick a real license (MIT, Apache 2.0, etc.) instead of all-rights-reserved.

## Critical — fix before sharing, or the reviewer bounces immediately
- [ ] **Screenshots or a short GIF** of the app actually working (Home / Forecast / Alerts screens), placed near the top of the root README. Right now the map is broken — if that's the first thing a reviewer sees, they may assume the whole project doesn't work.
- [ ] **One-paragraph pitch at the very top of the root README**, above the folder map — what GridWatch is and why it matters, in plain language, before any technical structure.
- [ ] **Node version requirement** stated in `backend/package.json` via an `"engines"` field, so a reviewer isn't guessing why `npm start` fails on an old Node install.

## Important — standard trust/maturity signals
- [ ] `LICENSE` — done, see above.
- [ ] `.env.example` in `backend/` — lists every environment variable the backend reads (`TTC_RT_URL`, `PORT`, etc.) without requiring someone to read `server.js` source to discover they exist.
- [ ] **Known Issues surfaced at the top level**, not buried inside `docs/MAP_DEBUG_LOG.md`. A reviewer should learn "map doesn't render yet" within 10 seconds of opening the repo, not after digging into docs.

## Nice-to-have — makes it read as more finished
- [ ] `CHANGELOG.md` — a few bullets per version (V2 / V3 / V4) so progress reads as a maintained project, not "check the chat history."
- [ ] A live/hosted demo link, once deployed — removes the friction of "clone this and run it locally" for anyone reviewing remotely.
- [ ] Your name + contact + project framing ("built for CivicTech Brampton pitch") visible in the README — ties the code to your actual narrative instead of reading as an anonymous drop.

## Already in good shape
- [x] PRD (`docs/PRD.md`)
- [x] Architecture doc (`docs/INGESTION_ARCHITECTURE.md`)
- [x] Honest, detailed debug log (`docs/MAP_DEBUG_LOG.md`)
- [x] Backend with its own README and clear run instructions
- [x] Clean separation of `app/` / `backend/` / `docs/` / `tests/`

---

*Update the checkboxes above as each item gets built — this file is meant to stay in the repo as a living pre-share checklist, not just a one-time note.*
