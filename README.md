# Whispers of the Fresco — Ancient Egypt

A browser-based **first/second-person puzzle-adventure** set in an Ancient
Egyptian temple, inspired by *Fresco* (Kelonia Games). Its core mechanic lets
you switch between **exploring the temple in 3D** and **controlling flat,
painted figures that come alive inside the wall murals** to solve
interconnected puzzles.

Built with **[Babylon.js](https://www.babylonjs.com/)** — chosen over Three.js
for this project because it ships first-person `FreeCamera`, trivial
orthographic ⇄ perspective switching, ray picking, easy parenting of flat
sprites onto rotated walls, and a built-in input/GUI system, which is exactly
what the "2D-painting-inside-3D-world" mechanic needs.

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

Click **Enter the Temple** to start (this also unlocks audio, which browsers
require to begin from a user gesture).

## Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Look | Mouse (click to lock) | Drag |
| Move (3D) | `W A S D` / arrows | — |
| Interact with a mural | `E` | ⚔ button |
| Move painted figure (2D) | `←` `→` / `A` `D` | ◀ ▶ buttons |
| Exit a painting | `E` | ✕ button |
| Strike the guardian | Click / `Space` | ⚔ button |

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
   sealed door. → worker peels off as an ally.
2. **The Journey of Ra** — carry the sun-disk to the horizon to flood the dark
   temple with light. → priest peels off as an ally.
3. **The Guardian of the Dead** — once the door is open and the light restored,
   the Anubis mural awakens as a glowing 3D **boss**. Strike it with Ra's light
   to cleanse the temple.

## Project layout

```
index.html      # markup, CDN scripts, HUD elements
styles.css      # all UI styling (HUD, overlay, touch controls, boss bar)
src/art.js      # procedural Egyptian art (murals, figures, hieroglyphs) via canvas
src/audio.js    # procedural ambient + SFX via the Web Audio API (no asset files)
src/temple.js   # temple geometry: walls, pillars, flickering torches
src/game.js     # game loop, 2D/3D switching, puzzles, peel-off, boss, input
```

Everything (art, sound) is generated at runtime, so the repo carries no binary
assets and runs from a single folder.

## Roadmap / ideas

- More murals & puzzle types (a boat that moves a real 3D boat; gods that
  summon companions).
- Richer peel-off animation and companion abilities.
- Multiple simultaneous 2D characters with collision.
- Light/torch puzzles solvable only from the 2D side.
- A multi-phase boss that fights across both 2D and 3D.
- Loadable hi-res art and recorded audio to replace the procedural placeholders.
