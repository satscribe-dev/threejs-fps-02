# NOTES.md — CINDERLINE YARD: diagnosis of the translucent rectangle

## Definite cause

**The impact-dust `THREE.Points` system in `game/src/game.js`** (`_initFx` /
`spawnDust` / the dust block in `update()`). It is NOT the sky, NOT bloom, NOT
shadows, NOT the DOM/HUD, NOT tracers, NOT transparent planes, NOT sprites.

Mechanism, verified step by step:

1. Dust is 240 points, `PointsMaterial({ color: 0xb8a88a, size: .14,
   transparent: true, opacity: .7, depthWrite: false })` — **no texture map**,
   so every point renders as a **hard-edged square**, grey-beige.
2. `dustPos` starts as all zeros: the 230 points never spawned sit at the world
   origin (0,0,0) at opacity .7 (a latent blob; harmless from the combat camera
   because the origin is behind it, but wrong).
3. When a shot hits, `spawnDust` places 6–10 points at the hit point. In the
   combat staging the player's shot hits ~1.3 m from the camera (tracer length
   measured 1.25–1.32 m), so **the cloud sits ~1 m from the lens**. At 1 m a
   .14 m point is ~66 px wide; 10 clustered points form a **~400×200 px
   translucent grey-beige rectangle** in the upper-centre of the frame.
4. Timing matches exactly: at shot+0.1 s the points are still tightly clustered
   (no rectangle in the base screenshot); they spread over 1–2 s (rectangle
   appears, x≈300–950, y≈0–420); gravity pulls them below y=.02 after ~5 s and
   the code teleports them to y=-10 (rectangle vanishes). The rectangle moves
   between frames because the points drift with velocity.

## Isolation evidence (all screenshots in /tmp, 15 Nov 2026 ~22:40–23:20 WIB)

| Step | What was hidden/disabled | Rectangle? | File |
|---|---|---|---|
| probe-band2 base | nothing | absent at t+0.1 s | /tmp/b2-0-base.jpg |
| probe-band2 step 1 | sky sphere | PRESENT | /tmp/b2-1-sky.jpg |
| probe-band2 step 2 | sprites (name tags, smoke) | PRESENT | /tmp/b2-2-sprites.jpg |
| probe-band2 step 3 | transparent planes (signs, decals, flash) | PRESENT | /tmp/b2-3-planes.jpg |
| probe-band2 step 4 | tracers (transparent BoxGeometry) | absent — but dustLife had just hit 0 (timing coincidence, see below) | /tmp/b2-4-tracers.jpg |
| probe-band2 step 5 | dust points | absent | /tmp/b2-5-dust.jpg |
| probe-band2 step 6 | viewmodel | absent | /tmp/b2-6-viewmodel.jpg |
| probe-band3 base | nothing (tracer dump: 1 active tracer, pos (-12.33,1.59,-4.53), scale z 1.25, op .7) | absent | /tmp/b3-0-base.jpg |
| probe-band3 step 1 | tracers ONLY | PRESENT (x≈300–950, y≈0–420) — tracers ruled out | /tmp/b3-1-notracer.jpg |
| probe-band3 step 2 | shadows off (renderer.shadowMap.enabled=false, sun castShadow=false) | PRESENT | /tmp/b3-2-noshadow.jpg |
| probe-band3 step 3 | all DOM overlays hidden | absent — but ~5 s after the shot, dust already fell (timing, not DOM) | /tmp/b3-3-nodom.jpg |
| probe-band4 | raycast through rectangle pixels | first hits: dead tracer (op 0, d=0) then sky sphere at ~167 m — no object at the rectangle | /tmp/b4-0.jpg / /tmp/b4-1.jpg |
| probe-band5 | **DOM hidden BEFORE the shot** | PRESENT at shot+2.5 s (x≈520–820, y≈0–110) and shot+4 s (x≈30–260, y≈0–100) — DOM ruled out, rectangle MOVES | /tmp/b5-0-nodom.jpg / /tmp/b5-1-nodom.jpg |

State dump at the moment the rectangle was visible (probe-band5):
`dustLife 2, dustOp 0.12, 10 active points at (-12.4..-11.5, 1.7..2.1, -4.4..-3.6)`
— i.e. a ~0.9 m cloud ~1 m from the camera at (-12, 1.6, -4), 230 points still
at the origin. Tracers: all life 0 / invisible. Flash: frames 0, invisible.

## Ruled out by code + test

- **(b) bloom / post-processing:** does not exist. `grep -rn
  "EffectComposer|UnrealBloom|BloomPass|Helper|postprocess" game/src` → no
  matches. No `EffectComposer` anywhere; the renderer is a plain
  `WebGLRenderer` with ACES tone mapping.
- **(f) light helpers:** none exist (same grep: no `Helper`).
- **(c) shadows:** rectangle persists with `shadowMap.enabled=false` and the
  sun's `castShadow=false` (b3-2).
- **(d) sprite + HUD overlay (DOM):** rectangle persists with every DOM node
  except the canvas hidden, hidden *before* the shot (b5-0, b5-1).
- **(a) sky sphere:** rectangle persists with the sky mesh hidden (b2-1); it
  is visible *against* the black sky in that shot.
- **(e) transparent planes:** persists with all transparent planes hidden
  (b2-3).
- **Tracers:** persists with all tracers hidden (b3-1); the only active tracer
  at shot time was 1.25 m long, .008 m thick, at the muzzle.

## The b2 "tracers step" coincidence, explained

In probe-band2 the rectangles vanished at the tracers step, which at first
looked like tracers were the cause. It was timing: `dustLife` counts down one
per `update()` call and hit 0 exactly at that step (12 → 9 → 5 → 2 → 0), and
the dust opacity is `dustLife/12 * .7`, so the cloud faded out at the same
moment. Probe-band3 (tracers hidden alone, dust still alive) shows the
rectangle PRESENT — tracers are not the cause.

## Fix (applied in the rebuild, point 5)

1. Initialise all 240 dust points at y=-10 (never at the origin).
2. Give the `PointsMaterial` a soft radial-gradient sprite texture (`map` +
   `alphaTest 0.01`, `depthWrite: false`) so each point is a soft round puff,
   never a hard square.
3. Size .14 → .09, and clamp the spawn: points that would land within 1.5 m of
   the camera are pushed out along the shot direction (or skipped) — no cloud
   may sit on the lens.
4. Fade opacity faster (`dustLife/12` → squared falloff) and cap the cloud
   spread so it reads as a small impact puff, not a wall of fog.
5. Verification: fire the staged shot, screenshot at +2.5 s and +4 s — the
   rectangle must be gone in both, with only a small soft puff at the impact
   point.
