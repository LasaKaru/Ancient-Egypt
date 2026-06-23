# Roadmap — Whispers of the Fresco

A living backlog of features and improvements. Items are grouped by area and
tagged with a rough size: **S** (hours), **M** (a day or two), **L** (multi-day),
**XL** (major system). ✅ = already in the build.

> Engine: Babylon.js. Keep the flat-shaded low-poly art direction and the
> dual-perspective (3D explore ⇄ 2D fresco) core throughout.

---

## 0. Already implemented ✅
- First-person explorer with terrain-following camera, collisions, held flashlight
- 2D "step into the fresco" mode (orthographic) with torn-plaster come-alive reveal
- Puzzles: Nile walk (opens door), pillar climb (relights temple), Sacred Barque
  (slides a real 3D boat across the oasis — cross-dimension link)
- Peel-off animation → low-poly 3D companions that follow you
- Three-phase Anubis boss (3D → 2D fresco weak-spot → enraged 3D), health bar
- Low-poly multi-zone world: desert gate, temple hall, oasis, pyramid horizon
- God-ray shafts, dust motes, dusk gradient sky, flickering torches/candles
- Procedural canvas art + procedural Web Audio (no binary assets)
- Objectives HUD, toasts, crosshair, mobile touch controls

---

## 1. Player systems & progression
- [x] **Inventory system** — collectible Sacred Scarabs (5), inventory panel (I), HUD counter. ✅
- [x] **Save / load** — auto-save + Continue (objectives, door/light/boss, companions, scarabs, camera). ✅
- [ ] **Equippable tools** (M) — flashlight upgrades, a brush that "reveals" hidden frescoes, a chisel, a torch.
- [ ] **Hotbar / quick-use** (S) — number keys / radial for tools.
- [ ] **Ability unlocks** (L) — e.g. dash, double-jump, "ink dash" that lets the 2D figure leap gaps.
- [ ] **Skill tree / upgrades** (L) — spend collected scarabs on light range, strike power, climb speed.
- [x] **Health** — Vitality bar, enemy damage, out-of-combat regen, respawn at the gate. ✅
- [ ] **Lives / checkpoints / respawn** (M) — shrines act as checkpoints.
- [ ] **Collectibles & lore notes** (S–M) — hidden ankhs, papyri that expand the story.
- [ ] **Photo mode** (M) — free camera + filters for screenshots.

## 2. Inventory & crafting (deeper)
- [ ] **Item combining** (M) — combine fragments (e.g. amulet pieces) to unlock doors.
- [ ] **Consumables** (S) — oil for the flashlight, healing.
- [ ] **Resource gathering** (M) — pick up reeds/clay/gold for crafting or trading.
- [ ] **Merchant NPC / trading** (M).

## 3. World, environments & level design
- [ ] **More biomes / zones** (L): canyon with **mountains & cliffs**, a flooded crypt, a night desert, a marketplace, a pyramid interior, the underworld (Duat).
- [ ] **Mountains & rock formations** (M) — low-poly mountain meshes, mesas, layered cliffs, scree fields of **stones/boulders**.
- [ ] **Better water** (M–L) — reflective/refractive shader water, shoreline foam, the Nile river, waterfalls, ripples on interaction.
- [ ] **Rocks & props variety** (S) — more rock/cactus/plant variants, broken columns, statues, sphinxes, urns, braziers.
- [ ] **Level / world structure** (L) — discrete **levels ("worlds")** or a connected open hub with portals between zones; level-select screen.
- [ ] **Procedural scatter / variation** (M) — seeded placement so each zone feels rich but performant.
- [ ] **Day/night cycle & weather** (L) — moving sun, sandstorms, rain, dynamic sky.
- [ ] **Interactive environment** (M) — destructible pots, movable blocks, pressure plates, rope/pulley puzzles.
- [ ] **Verticality** (M) — staircases, ledges, climbable surfaces, elevators.

## 4. Dual-perspective mechanic expansion (the core hook)
- [ ] **More fresco puzzle types** (L): pour water in 2D to flood a 3D basin; light a 2D torch to open a 3D path; rotate a 2D gear that turns a 3D mechanism; a 2D bridge that becomes 3D-walkable.
- [ ] **Multiple 2D characters + collision** (M) — guide two painted figures; they block/help each other.
- [ ] **Painted hazards** (M) — 2D fire, snakes, falling blocks the figure must avoid.
- [ ] **Frescoes that span multiple walls / wrap corners** (M).
- [ ] **"Bring object to 3D"** (L) — peel off not just allies but objects (a painted ladder/boat becomes real).
- [ ] **Time-of-day painted scenes** (M) — same fresco changes with the 3D world state.

## 5. Characters, companions & NPCs
- [ ] **Companion abilities** (M) — allies that fight, carry, boost, or activate switches.
- [ ] **Companion commands** (M) — point them somewhere, hold position.
- [ ] **NPCs with dialogue** (M) — villagers, priests, a quest-giver; branching dialogue UI.
- [ ] **Enemies / patrols** (L) — scarab swarms, mummies, temple guards with simple AI (patrol/chase/attack).
- [ ] **Animation upgrades** (M–L) — skeletal-rigged characters or richer procedural animation than the current limb-swing.

## 6. Combat & bosses
- [ ] **Combat depth** (L) — light vs. shadow damage types, blocking/dodge, combos, charged strikes.
- [ ] **More bosses** (XL) — a spider-guardian, a serpent (Apophis), a sphinx riddle-boss; each with a unique 2D/3D gimmick.
- [ ] **Boss telegraphs & dodgeable attacks** (M) — currently roars are cosmetic; make them real attacks.
- [ ] **Enemy variety & spawning** (M).
- [ ] **Difficulty modes** (S) — Story / Normal / Hard scaling HP, damage, weak-spot windows.

## 7. Story, quests & content
- [ ] **Quest/objective system** (M) — main + side quests, a journal/quest log UI (extends the current objectives panel).
- [ ] **Narrative & cutscenes** (L) — intro, between-zone story beats, ending.
- [ ] **Lore codex** (S) — unlockable entries on gods, glyphs, history.
- [ ] **Hieroglyph "language" puzzle** (M) — learn glyphs to decode doors.
- [ ] **Branching outcomes / multiple endings** (L).

## 8. UI / UX & menus
- [ ] **Main menu & pause menu** (S–M) — start, continue, options, quit.
- [ ] **Settings menu** (M) — graphics quality, sensitivity, volume, language, key rebinding.
- [x] **World map & minimap** — live minimap + full map (M) showing player, treasure, secrets, buildings, oasis. ✅ (fast travel TBD)
- [ ] **In-world markers/waypoints** (S).
- [ ] **Tutorial / onboarding** (M) — contextual hints, a guided first room.
- [ ] **Better HUD** (S) — health, stamina, equipped tool, objective tracker.
- [ ] **Localization / i18n** (M) — externalize strings; multi-language.

## 9. Audio
- [ ] **Real recorded audio** (M) — ambient beds, SFX, a proper score (replace procedural placeholders, keep procedural as fallback).
- [ ] **Adaptive/dynamic music** (L) — calm explore → tense boss layers.
- [ ] **3D positional audio** (S) — Babylon spatial sound for torches, water, enemies.
- [ ] **Voice / narration** (M).
- [ ] **Audio settings & ducking** (S).

## 10. Multiplayer & social
- [ ] **In-game chat option** (M) — text chat overlay (needs a backend/websocket server).
- [ ] **Live chat / voice** (L–XL) — real-time chat (WebRTC/WebSocket); requires server + moderation.
- [ ] **Co-op (2 players)** (XL) — e.g. one in 3D, one controlling the 2D fresco simultaneously — perfect fit for the core mechanic.
- [ ] **Networked sync & authority** (XL) — state sync, lag handling.
- [ ] **Leaderboards / shared puzzle times** (M).
- [ ] **Friends / lobbies / matchmaking** (L).
- [ ] **Community fresco sharing** (L) — players paint frescoes others can play.

## 11. Persistence & backend
- [ ] **Save / load** (M) — localStorage first, then cloud saves.
- [ ] **Accounts / profiles** (L) — needs backend (e.g. Node + DB).
- [ ] **Cloud progression & settings sync** (L).
- [ ] **Analytics / telemetry** (M) — funnel, puzzle drop-off, balancing data.

## 12. Visuals & realism
- [ ] **PBR materials & better lighting** (L) — move from StandardMaterial to PBR where it helps; keep stylized look.
- [ ] **Shadows** (M) — shadow maps for sun/torches.
- [ ] **Post-processing** (M) — bloom, color grading, vignette, SSAO, depth of field, true volumetric god-rays.
- [ ] **Particle upgrades** (S–M) — embers, sand drift, splashes, magic wisps.
- [ ] **Decals & weathering** (M) — cracks, moss, sand piles.
- [ ] **LOD & impostors** (M) — for distant pyramids/mountains.
- [ ] **Higher-detail art option** (L) — optional asset pack for a "more realistic" mode (toggle low-poly ⇄ detailed).
- [ ] **Animated water/cloth/foliage** (M).

## 13. Controls & accessibility
- [ ] **Gamepad support** (M).
- [ ] **Key rebinding** (S).
- [ ] **Full mobile controls for 3D** (M) — virtual joystick + look drag (currently 2D-focused).
- [ ] **Accessibility** (M) — colorblind modes, subtitles, text scaling, reduced-motion, remappable everything, difficulty assists.

## 14. Performance & technical
- [ ] **Asset/mesh instancing & merging** (M) — thin instances for props (rocks, grass, pillars).
- [ ] **Frustum/occlusion culling tuning** (S).
- [ ] **Texture atlasing** (M).
- [ ] **Loading screen + async asset streaming** (M).
- [ ] **Fixed-timestep / frame-rate independence audit** (S) — verify all movement is dt-based.
- [ ] **Object pooling** (S) — projectiles, particles, enemies.
- [ ] **Build pipeline** (M) — bundler (Vite/esbuild), minification, optional TypeScript, ES modules.
- [ ] **Automated tests** (M) — headless Playwright smoke tests for each scene/puzzle (already prototyped during dev).

## 15. Game design & balancing
- [ ] **Difficulty curve tuning** (ongoing) — puzzle complexity ramp, boss HP/weak-spot windows, enemy density.
- [ ] **Economy balancing** (M) — collectible/upgrade costs once inventory exists.
- [ ] **Pacing** (ongoing) — explore vs. puzzle vs. combat rhythm.
- [ ] **Playtest loop & metrics** (ongoing) — use analytics to find frustration points.
- [ ] **Hint system** (S–M) — escalating hints if the player is stuck.

## 16. Tooling & content pipeline
- [ ] **Level editor** (L) — place props/murals/puzzles in-engine, export to data.
- [ ] **Data-driven content** (M) — define zones/puzzles/dialogue in JSON instead of code.
- [ ] **Fresco/puzzle authoring tool** (L).
- [ ] **Debug console & cheats** (S) — teleport, skip puzzle, spawn boss (handy for testing).

## 17. Platform & distribution
- [ ] **PWA / installable + offline** (M).
- [ ] **Mobile (Capacitor) / desktop (Electron/Tauri) builds** (L).
- [ ] **Steam release** (L) — achievements, cloud saves.
- [ ] **itch.io / web build hosting** (S).
- [ ] **Achievements** (M).

## 18. Polish & "juice"
- [ ] **Screen shake, hit-stop, impact FX** (S).
- [ ] **Camera transitions** (S) — smooth 3D⇄2D blends, boss intro cams.
- [ ] **UI animations & sound feedback** (S).
- [ ] **Haptics on mobile/gamepad** (S).
- [ ] **Seasonal/easter-egg content** (S).

---

## Suggested phased plan
**Phase A — make it a "game" (S/M):** main menu + pause, save/load, settings,
gamepad + full mobile 3D controls, health/checkpoints, hint system.

**Phase B — depth (M/L):** inventory + tools, 2–3 new fresco puzzle types,
multiple 2D characters + collision, enemies with AI, a second boss, quest log.

**Phase C — world (L):** 2–3 new zones (mountains/canyon, crypt, Duat), better
water, day/night + weather, level/world structure + map & fast travel.

**Phase D — fidelity (L):** shadows + post-processing, PBR/optional realistic
asset pack, recorded audio + adaptive music, LOD/instancing performance pass.

**Phase E — social (XL):** save backend/accounts, in-game text chat, then
**co-op (3D + 2D players)**, leaderboards, community fresco sharing.

> Highest-leverage next steps for this prototype: **save/load + main/pause menu**,
> **inventory + a tool that reveals hidden frescoes**, **one new zone with
> mountains & better water**, and **multiple 2D characters with collision**.
