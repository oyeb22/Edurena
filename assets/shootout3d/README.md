# Edurena 3D Penalty Shootout (Unity view)

Same pattern as `assets/race3d/`: the Unity WebGL build only DRAWS the kick. Pairing, questions,
answer checking, and who wins each duel all stay in the existing stack — nothing in
`PenaltyShootout.html`, `PenaltyShootoutHost.html`, or `code.gs`'s `validateContestedAnswer` was
changed.

| File | Role |
|---|---|
| `Build/PenaltyGame.*` | Unity build for the student page (13 MB, gzip; loads on any static host) |
| `Build/PenaltyHostGame.*` | Unity build for the projector — same scene, adds a standings panel |
| `shootoutCommon.js` | shared code: `seedFor()`, `loadUnity()` |
| `test.html` | standalone check — loads the build and fires goal/save/miss kicks with fake names, no Firebase needed. Open it directly (served over http) to sanity-check a build without a live game. |
| `../../PenaltyShootout3D.html` | student page (join, lobby, questions, 3D view) |
| `../../PenaltyShootoutHost3D.html` | projector page (3D replay reel + standings) |

## How a kick reaches the screen

1. Student answers (unchanged): `submitAns()` claims the Firebase transaction, calls
   `validateContestedAnswer`, and on a correct fastest answer writes
   `shootout/{id}/duels/{qIdx}/{pairId}.outcome = 'goal' | 'save'`. If nobody wins it, the host's
   `doReveal()` writes `'miss'` once the round's timer runs out — all exactly as before.
2. Each page listens for that `outcome` the same way the video-clip version did, then calls
   `view.queueKick({ id, outcome, seed, kickerName, keeperName, roundLabel })` instead of playing
   an mp4.
3. `seed` is `SHOOT3D.seedFor(raceId+'_'+qIdx+'_'+pairId)` — a plain string hash, computed
   identically by the kicker's phone, the keeper's phone, and the projector. Unity uses it to
   pick which corner the ball goes to and which way the keeper dives, so everyone watching the
   same kick sees the same thing without sending anything about the animation over the wire.
4. Unity plays the kick (~3 s) and calls back `onPenaltyKickDone({id, outcome})`. The student
   page doesn't wait on this to move to the next question (same as before — the host's round
   timer paces things); the projector uses it to queue the next replay and refresh standings.

## Switching it on

Not on any visible button yet — same status as the 3D race. In `LiveHost.html`, run
`selectMode('shootout3d')` in the browser console (from the teacher's device) after picking a
quiz, then launch as normal; players get a link to `PenaltyShootout3D.html`, and "Open Projector
(3D, controls live there)" opens `PenaltyShootoutHost3D.html`. Both fall back to the classic 2D
page on a device without WebGL2 (same `canRunUnity()` check as the race view); `?v=3d` forces the
3D page for testing regardless of device.

## The character models

`Assets/Characters/Penalty/` in the Unity project (`C:\Users\USER\Desktop\RaceGame`) — 7 Mixamo
FBX files (free, no attribution required): a kicker shot animation (3 variants) and a goalkeeper
dive animation (left/middle/right). No textures were included in the export, so skin/kit/shoe/
hair are flat colours assigned in code (`Assets/Editor/PenaltyWorld.cs`), not imported materials.
Contact/extension timing per clip was measured (`Assets/Editor/AnalyzeKick.cs` samples the actual
foot/hip motion), not guessed.

## Rebuilding

```
Unity.exe -batchmode -projectPath ... -executeMethod BuildScene.BuildPenalty -quit       # student scene
Unity.exe -batchmode -projectPath ... -executeMethod BuildScene.BuildPenaltyHost -quit   # projector scene
Unity.exe -batchmode -projectPath ... -buildTarget WebGL -executeMethod BuildWebGL.RunPenalty -quit
Unity.exe -batchmode -projectPath ... -buildTarget WebGL -executeMethod BuildWebGL.RunPenaltyHost -quit
```
Both builds land in `RaceGame-Handoff/PenaltyGame/` and `PenaltyHostGame/` — copy each `Build/`
folder's contents into this `assets/shootout3d/Build/` folder (they share it; the files are
prefixed by product name so they don't collide). Close Unity before running any of these, and
switch the build target back to `StandaloneWindows64` afterwards or the Editor won't reopen
normally.

## Known gaps

- Not deployed yet — these files exist locally; they still need pushing to GitHub (same as the
  rest of this repo, which is currently well behind `origin/main`) and, if hosted differently,
  copying to wherever `assets/race3d/` ends up.
- No sound.
- Not tested on a real phone/projector, only headlessly (Unity batch-mode self-test, and a
  browser test of `test.html` in headless Edge) and against fake data — the real Firebase/GAS
  flow (`selectMode('shootout3d')`) hasn't been run end-to-end with a live session.
- Camera is a single fixed angle; doesn't yet do anything special for a "hot streak" or dramatic
  moment beyond playing the next queued kick.
