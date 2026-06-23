# Whispers of the Fresco — Ancient Egypt

A browser-based, **low-poly**, **first/second-person puzzle-adventure** set in
Ancient Egypt, inspired by *Fresco* (Kelonia Games). Its core mechanic lets you
switch between **exploring a 3D world** and **controlling flat, painted figures
that come alive inside the wall murals** to solve interconnected puzzles.

The whole game uses a single, cohesive **flat-shaded low-poly art style** — a
bigger world built from several connected zones:

- **Desert Gate** — the entrance plaza with obelisks, rock-sphinxes and a sand
  path across rolling dunes.
- **The Temple** — an open-air pillared hall holding the interactive murals,
  puzzles and the boss arena.
- **The Oasis** — a low-poly lake with palms, reeds and grass (unlocked by the
  Nile puzzle).
- **Pyramid Horizon** — pyramids and scattered cacti/rocks across the dunes.

Everything (terrain, props, characters, the guardian) is generated from
primitives + flat shading at runtime, so the world stays stylistically unified
and carries **no binary assets**.

Built with **[Babylon.js](https://www.babylonjs.com/)** — chosen over Three.js
because it ships first-person `FreeCamera`, trivial orthographic ⇄ perspective
switching, ray picking, easy parenting of flat sprites onto rotated walls, and a
built-in input system, which is exactly what the "2D-painting-inside-3D-world"
mechanic needs.

## Play

The game is a static site with **no build step**.

- **Easiest:** serve the folder and open it (recommended, avoids any
  browser file:// restrictions):
  ```bash
  npx serve .        # or:  python3 -m http.server 8000
  ```
  then open the printed URL.
- Or just open `index.html` directly in a modern browser (needs internet for
  the Babylon.js CDN).

On launch you get a **HelaO2 Studio** intro, then the **main menu**
(Continue / New Game / Settings / Credits) over a slowly orbiting view of the
world. **Settings** (master volume, mute, look sensitivity, FOV, graphics
quality, fog) apply live and are saved to `localStorage`. Press **Esc** in-game
for the **pause menu** (Resume / Settings / Main Menu) and **I** for the
**inventory**.

Progress **auto-saves** (objectives, opened door/light, defeated boss,
companions, collected scarabs); **Continue** appears on the menu when a save
exists. Find the **5 hidden Sacred Scarabs** scattered around the world —
walk near one to collect it.

## Controls

| Action | Desktop | Mobile | Gamepad |
| --- | --- | --- | --- |
| Look | Mouse (click to lock) | Drag right side | Right stick |
| Move (3D) | `W A S D` / arrows | Left joystick | Left stick |
| Interact with a mural | `E` | ⚔ button | A |
| Move painted figure (2D) | `←` `→` / `A` `D` | ◀ ▶ buttons | Left stick / A |
| Exit a painting | `E` | ⚔ button | A / B |
| Strike the guardian | Click / `Space` | ⚔ button | A |
| Pause | `Esc` | ⏸ button | Start |
| Inventory | `I` | — | — |

Mobile uses an on-screen movement **joystick** (left) and **drag‑to‑look**
(right side); a connected **gamepad** drives movement and look automatically.

## The mechanic

1. Explore the temple in **first person**.
2. Look at a wall mural and press **E** — the camera flies in, switches to a
   true **orthographic 2D view**, and a painted figure comes alive on the wall.
3. Move the figure to solve the mural's puzzle. Solving it **changes the 3D
   world** (a sealed door lifts, the temple's torches relight, …).
4. Solved figures **peel off the wall** and become 3D companions that follow
   you.

## Objectives (current build)

1. **Daily Life on the Nile** — walk the worker to the rope to raise the
   sealed eastern door (opening the way to the oasis). → worker peels off as an
   ally.
2. **The Painted Climber** — a frescoed pillar; *climb* the figure (vertical 2D
   mechanic) to the sun-disk at the top to flood the temple with light. → priest
   peels off as an ally.
3. **The Guardian of the Dead** — once the door is open and the light restored,
   the Anubis mural awakens as a glowing 3D **boss** in a candle-lit hall with
   violet eyes. The fight has **three phases across both dimensions**:
   - *Phase 1 (3D):* strike the advancing guardian with Ra's light.
   - *Phase 2 (2D):* it flattens and flees into the back-wall fresco; strike
     the **glowing heart** weak-spot when it surfaces along the wall.
   - *Phase 3 (3D):* it bursts back out **enraged** (faster, magenta eyes) —
     finish it to cleanse the temple.

**Bonus — The Sacred Barque:** a fresco on the east wall. Sliding the painted
barque drives a real low-poly **3D boat across the oasis** in real time
(cross-dimension link) — the headline "2D action changes the 3D world" idea.

Figures **peel off the wall** with an animation (they emerge from the plane,
gaining 3D depth) and then follow you as low-poly companions. The player also
carries a **first-person flashlight**, and the temple has god-ray shafts and
floating dust.

## Project layout

```
index.html      # markup, CDN scripts, HUD elements
styles.css      # all UI styling (HUD, overlay, touch controls, boss bar)
src/art.js      # procedural mural / painted-figure art (canvas) for the 2D layer
src/audio.js    # procedural ambient + SFX via the Web Audio API (no asset files)
src/lowpoly.js  # flat-shaded low-poly toolkit: palms, rocks, pyramids, dunes,
                #   water, sky, clouds, low-poly characters + the guardian boss
src/world.js    # builds the bigger world: terrain height-field + all zones + temple
src/game.js     # game loop, 2D/3D switching, puzzles, peel-off, boss, input
```

Everything (art, sound) is generated at runtime, so the repo carries no binary
assets and runs from a single folder.

## Roadmap / ideas

- Multiple simultaneous 2D characters with collision.
- Companion abilities (allies that help solve puzzles or fight).
- More cross-dimension puzzles (gods that summon companions, levers, fire).
- Loadable hi-res art and recorded audio to replace the procedural placeholders.
