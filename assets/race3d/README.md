# Edurena 3D Race (Unity view)

The Unity WebGL build only DRAWS the race. Login, questions, answer checking and the live room stay in the existing stack.

| File | Role |
|---|---|
| `Build/RaceGame.*` | Unity WebGL build (27 MB, gzip; loads on any static host, no special headers) |
| `raceCommon.js` | shared code: race rules (`configFor`), Unity loader, snapshot builder, sounds |
| `../../Race3D.html` | student page (join, lobby, questions, 3D view) |
| `../../RaceHost3D.html` | projector page (3D view following the leader or a chosen driver, standings, End Race, podium) |

## Flow (nothing changes for the teacher)
LiveHost -> `createRaceSession` (GAS) -> students join `Race.html`/`Race3D.html` -> LiveHost writes `race/<code>/state = {phase:'started', startedAt: server time}`.
Green light = `startedAt + 3 s`. Each student answers at their own pace; `validateRaceAnswer` (GAS) checks the answer AND decides the boost from server-measured time
(`_raceBoostFor` in code.gs). The boost becomes an event `race/<code>/events/<player>/<id> = {t, boost}`; every screen turns the same events into car positions with the same formula, so nothing else is streamed.
Race length = about 110 m per question (800-3000 m), stored via `race/<code>/cfg.totalQ` by the first student to join.

## Switching it on
`Race.html` and `RaceHost.html` start with `USE_3D=false`. `?v=3d` opens the 3D page (testing); set `USE_3D=true` to send everybody there. `Race3D.html` falls back to the 2D page on devices without WebGL2. `?q=low|medium|high` overrides graphics.

## Deploy checklist
1. Upload `assets/race3d/` (Build files are under GitHub's 25 MB web-upload limit), `Race3D.html`, `RaceHost3D.html`, `Race.html`, `RaceHost.html`.
2. Paste `code.gs` into Apps Script and deploy a new version (same /exec URL).
3. Optional hardening: add script properties `FIREBASE_DB_SECRET` (and `FIREBASE_DB_URL` if not the default). The server then writes boost events itself; after that set the database rule so clients cannot write `race/*/events`.
4. Test on a real mid-range Android phone before turning `USE_3D` on for everyone.

## Rules must match in three places
`RACE_BOOST` (code.gs), `configFor`/`distance` (raceCommon.js), `RaceMath.cs` (Unity source zip in the handoff folder).
