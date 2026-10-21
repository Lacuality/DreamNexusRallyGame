# Dream Nexus Rally — game assessment & improvement pass (2026-10-21)

## Verdict: GO (after fixes) — the concept is fun and on-brand, but the live build was broken and not "fun" yet.

The game is a cute, readable idea (Pixel the Bunny rallying through Colombian landscapes)
in a proven genre (endless arcade racer / runner). The build in the repo, however, crashed
on load and the core loop had almost no feedback. This pass fixes the crash, rebuilds the
core loop around moment-to-moment rewards, and fixes sound and UI size.

## Core loop

Steer between 3 soft lanes → collect arequipe jars, thread gaps, hit ramps → combos raise
the score multiplier and fill nitro → fire nitro to smash through everything → lose all
3 hearts and the run ends → "Race again" in one tap.

## What was wrong (before)

| Area | Problem found |
|---|---|
| Loading | The game loaded 9 `.glb` models that had been deleted from the repo (car, sacks, plants, houses…). The server returned HTML instead, so the game **crashed with a red error screen before the title appeared**. |
| Music | Music only started after clicking the title screen, and **stopped the moment a race began** (title screen cleanup stopped it). |
| Engine sound | The "engine" was the crash sound (`hit.mp3`) looped and pitched up — a buzzing click. Nitro, shield, pickup and splash sounds pointed at files that never existed, so they were silent. |
| Mute | There were two separate audio systems; the mute button in one did nothing to the other. |
| Icons / UI | HUD text 16–18 px monospace, pause button was a small text button, power-up icons were 24 px circles, a debug "🔧 Tuning" button sat in the HUD. Touch buttons only reacted to single touch. |
| Road | The road's curve was frozen relative to the car (it looked bent but never changed), obstacles weren't on the curve, the ground ended after ~320 m and the sky after ~300 m. |
| Gameplay | No countdown, no lives (instant game over only above 120 km/h, otherwise hits did nothing), no combos, no near-miss reward, no jumps, nitro was random and automatic. Score screen said "Distance: {score} m". Restart sent you back to the name screen. |
| Performance | Obstacles/collectibles called React `setState` every frame; bunny model was 24.7 MB; logo image was 6700×5000 px. |

## What changed (after)

- **Always loads**: every 3D model is now built in code (car, Pixel in the sunroof with
  flapping ears, cones, rocks, coffee sacks, barriers, puddles, ramps, jars, power-ups,
  coffee bushes, wax palms, frailejones, colourful pueblo houses, bunting, sponsor boards,
  500 m checkpoint arches). No missing-file crashes. The 3D bunny on the title screen is
  optimised 24.7 MB → 0.7 MB and can't crash the page if it fails.
- **Sound**: music plays continuously from menu through races (ducks on pause / game over),
  synthesized engine that changes gear with speed + gravel rumble off-road, and real sound
  effects for jars (pitch climbs with your combo), nitro, shield, hearts, crash, smash,
  splash, near-miss whoosh, jump/land, countdown, milestones, game over. One mute button,
  music + effects volume sliders, settings remembered. Audio unlocks on first tap/key (needed
  on iPhone), pauses when the tab is hidden.
- **Big UI**: chunky Bungee/Nunito type, 60 px icon buttons (sound, fullscreen, pause), big
  hearts, big score with multiplier badge, big speedometer, wide nitro bar. Phone controls are
  ~100 px thumb buttons (◀ ▶ on the left; NITRO with a charge ring + brake on the right) with
  multi-touch.
- **Fun**: 3-2-1-GO countdown, 3 hearts with a blink-and-recover after hits, shield bubble,
  combo multiplier up to x5, near-miss bonus, ramps with BIG AIR bonus and jars in the air,
  nitro you fire yourself (Space / NITRO button) to smash obstacles for points, hand-made
  spawn patterns (jar lines, weaves, gap threading, cone slalom, ramp-over-wall, puddles,
  power-ups) that always leave a way through and get denser as you go, three regions with
  "Now entering…" banners, milestones every 500 m, floating score popups, screen shake and
  hit flash, phone vibration on crash, auto-pause when you switch apps.
- **Road**: one shared track shape drives road, car, obstacles and scenery, so curves and
  hills are real and endless; bends gently push you outward.
- **Game over**: count-up score, stats (distance, jars, near misses, best combo, jumps,
  top speed), NEW RECORD, one-tap **Race again**.

## Scorecard (current build, 1–5)

| Criterion | Score | Reason |
|---|---|---|
| Clarity of core loop (3-second read) | 4 | Jars, ramps and rocks read instantly; popups explain every reward. |
| Moment-to-moment feel | 4 | Combos, near misses, jumps and nitro smash give constant feedback. |
| Session hook / replay | 4 | One-tap restart, best score, combo chasing, 500 m milestones. |
| Theme / brand distinctiveness | 4 | Pixel the Bunny + Colombian regions is unusual in the genre. |
| Mobile fit | 4 | Big thumb controls, portrait camera, light assets. |
| Build cost to ship | 4 | No external art dependencies left; pure web stack. |
| Meta progression | 2 | Leaderboard exists but resets on server restart (in-memory); no unlocks yet. |
| **Total** | **26 / 35** | |

## Comparables (from general genre knowledge, not a live chart check)

| Title | Why relevant | Typical complaint to avoid |
|---|---|---|
| Subway Surfers | lane runner with jars-style coins, boosts, jumps | ads interrupting runs |
| Smash Karts / web kart games | browser racer, instant play | slow loading |
| Hill Climb Racing | cute vehicle, airtime fun | grindy upgrades |
| Traffic Rider / Racer | near-miss scoring | repetitive scenery |

## Best next steps

1. **Persistent leaderboard** — the leaderboard lives in server memory and resets on each
   deploy/restart. Hook `server/storage.ts` to Postgres/Supabase (the schema already exists).
2. **Unlocks** — spend jars on car colours / Pixel outfits (goggles, hats). Cheap and sticky.
3. **Daily challenge** — fixed seed per day ("today's road") for leaderboard fairness.
4. **Optional** — a second music track that kicks in during nitro.

## Kill switch / metrics to watch once live

Track average runs per session, % of players who press "Race again", and median run
length. If fewer than ~30 % of players start a second run, the early game needs tuning
(spawn density in `RaceSystem.tsx → spawnRow`).

## Assumptions & unknowns

- Market comparables are from general knowledge; no live store/chart search was run.
- Couldn't listen to `background.mp3` from the sandbox; it now plays reliably, but if the
  track itself is the problem it can be swapped in `client/src/lib/audio.ts`.
- Sound and frame rate were checked in a headless browser (software rendering), so real
  devices will run much smoother than the test screenshots suggest.
