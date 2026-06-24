# Roadmap — Whispers of the Fresco

A living backlog of features and improvements. Items are grouped by area and
tagged with a rough size: **S** (hours), **M** (a day or two), **L** (multi-day),
**XL** (major system). ✅ = already in the build.

> Engine: Babylon.js. Keep the flat-shaded low-poly art direction and the
> dual-perspective (3D explore ⇄ 2D fresco) core throughout.

> **Scope note.** Client-side gameplay/UX items are being implemented and
> marked ✅. A handful are **infrastructure-bound and out of scope for this
> single-page, asset-free build**: live chat / voice & co-op netcode, accounts &
> cloud saves, analytics, leaderboards / community sharing, a Steam release, and
> a *recorded* score / hi-res "realistic" asset pack. Those need a backend
> (server + DB), store accounts, or licensed assets, so they're left unchecked
> on purpose — the next phase once hosting exists.

---

## 0. Already implemented ✅
- First-person explorer with terrain-following camera, collisions, held flashlight
- 2D "step into the fresco" mode (orthographic) with torn-plaster come-alive reveal
- Puzzles: Nile walk (opens door), pillar climb (relights temple), Sacred Barque
  (slides a real 3D boat across the oasis — cross-dimension link)
- Peel-off animation → low-poly 3D companions that follow you
- Three-phase Anubis boss (3D → 2D fresco weak-spot → enraged 3D), health bar
- Low-poly multi-zone world: desert gate, temple hall, oasis, pyramid horizon
- Five structured city districts (grids of houses + multi-storey towers, plazas,
  market stalls, lamp-lined avenues) that fill the map, shown on the world map
- God-ray shafts, dust motes, dusk gradient sky, flickering torches/candles
- Procedural canvas art + procedural Web Audio (no binary assets)
- Objectives HUD, toasts, crosshair, mobile touch controls

---

## 1. Player systems & progression
- [x] **Inventory system** — collectible Sacred Scarabs (5), inventory panel (I), HUD counter. ✅
- [x] **Save / load** — auto-save + Continue (objectives, door/light/boss, companions, scarabs, camera). ✅
- [x] **Equippable weapons** — khopesh / spear / bow with viewmodels, switching & pickups. ✅ (tool variants TBD)
- [x] **Hotbar / quick-use** — number keys 1/2/3 + Q to switch weapons. ✅
- [ ] **Ability unlocks** (L) — e.g. dash, double-jump, "ink dash" that lets the 2D figure leap gaps.
- [ ] **Skill tree / upgrades** (L) — spend collected scarabs on light range, strike power, climb speed.
- [x] **Health** — Vitality bar, enemy damage, out-of-combat regen, respawn at the gate. ✅
- [ ] **Lives / checkpoints / respawn** (M) — shrines act as checkpoints.
- [x] **Collectibles & lore notes** — papyrus scrolls scattered to collect. ✅
- [x] **Photo mode** — `P` hides all HUD for clean screenshots. ✅

## 2. Inventory & crafting (deeper)
- [ ] **Item combining** (M) — combine fragments (e.g. amulet pieces) to unlock doors.
- [x] **Consumables** — collectible water jars heal Vitality (`H`). ✅
- [ ] **Resource gathering** (M) — pick up reeds/clay/gold for crafting or trading.
- [ ] **Merchant NPC / trading** (M).

## 3. World, environments & level design
- [~] **Theme variants per mission** — wild/nature (grass, trees, flowers, camels) and modernised-city overlays ✅; a sealed **Crypt/Duat** underground biome (portal-reached, torchlit, sarcophagi + hieroglyph walls) ✅; pyramid-interior biome TBD.
- [ ] **Mountains & rock formations** (M) — low-poly mountain meshes, mesas, layered cliffs, scree fields of **stones/boulders**.
- [~] **Better water** — animated ripples + oasis foam ring ✅; reflective shader / Nile / waterfalls TBD.
- [ ] **Rocks & props variety** (S) — more rock/cactus/plant variants, broken columns, statues, sphinxes, urns, braziers.
- [x] **Level / world structure** — a 27-mission campaign with a level-select screen and sequential unlocks over the open world. ✅
- [ ] **Procedural scatter / variation** (M) — seeded placement so each zone feels rich but performant.
- [~] **Day/night cycle + weather** — sun/sky/fog day→night (T to skip) ✅; periodic sandstorms ✅; rain TBD.
- [ ] **Interactive environment** (M) — destructible pots, movable blocks, pressure plates, rope/pulley puzzles.
- [ ] **Verticality** (M) — staircases, ledges, climbable surfaces, elevators.

## 4. Dual-perspective mechanic expansion (the core hook)
- [ ] **More fresco puzzle types** (L): pour water in 2D to flood a 3D basin; light a 2D torch to open a 3D path; rotate a 2D gear that turns a 3D mechanism; a 2D bridge that becomes 3D-walkable.
- [ ] **Multiple 2D characters + collision** (M) — guide two painted figures; they block/help each other.
- [x] **Painted hazards** — a moving flame in the Nile fresco sends the figure back if touched. ✅
- [ ] **Frescoes that span multiple walls / wrap corners** (M).
- [ ] **"Bring object to 3D"** (L) — peel off not just allies but objects (a painted ladder/boat becomes real).
- [ ] **Time-of-day painted scenes** (M) — same fresco changes with the 3D world state.

## 5. Characters, companions & NPCs
- [ ] **Companion abilities** (M) — allies that fight, carry, boost, or activate switches.
- [x] **Companion commands** — toggle companions between follow / hold (G). ✅
- [x] **NPCs with dialogue** — merchant, priest, child in the city; proximity-talk dialogue UI. ✅ (branching TBD)
- [ ] **Enemies / patrols** (L) — scarab swarms, mummies, temple guards with simple AI (patrol/chase/attack).
- [~] **Animation/variety** — varied citizen types (men/women/children/monks/queens/soldiers); skeletal rigs TBD.

## 6. Combat & bosses
- [~] **Combat depth** — melee (khopesh/spear) + ranged (bow arrows) vs. shades & boss; dodge/combos TBD.
- [~] **More bosses** (XL) — Apophis the serpent (segmented chain body, weave + telegraphed lunge, head weak-spot, dedicated mission + Spawn-Serpent cheat) is in. ✅ Spider-guardian & sphinx riddle-boss still TBD.
- [x] **Boss telegraphs & dodgeable attacks** — Anubis emits a telegraphed ground shockwave you must back away from. ✅
- [ ] **Enemy variety & spawning** (M).
- [x] **Difficulty modes** — Story / Normal / Hard scale enemy damage (Settings). ✅

## 7. Story, quests & content
- [x] **Quest log + a side quest** — journal (J) with main story + NPC side quest (Scarabs for Khufu). ✅ (more quests TBD)
- [ ] **Narrative & cutscenes** (L) — intro, between-zone story beats, ending.
- [x] **Lore codex** — discovered scroll entries shown in a Codex panel (C). ✅
- [ ] **Hieroglyph "language" puzzle** (M) — learn glyphs to decode doors.
- [ ] **Branching outcomes / multiple endings** (L).

## 8. UI / UX & menus
- [x] **Main menu & pause menu** — title, continue, missions, free roam, settings, credits, pause. ✅
- [x] **Settings menu** — volume/mute/sensitivity/FOV/quality/fog/music/difficulty/reduced-motion. ✅ (rebinding/language TBD)
- [x] **World map & minimap** — live minimap + full map (M) showing player, treasure, secrets, buildings, oasis. ✅ (fast travel TBD)
- [x] **In-world markers/waypoints** — glowing beacon + minimap ring on the active objective. ✅
- [x] **Tutorial / onboarding** — staged contextual hints on a new game. ✅
- [ ] **Better HUD** (S) — health, stamina, equipped tool, objective tracker.
- [ ] **Localization / i18n** (M) — externalize strings; multi-language.

## 9. Audio
- [x] **Procedural Egyptian music** — Hijaz-scale oud/harp + frame-drum + drone, with a Music toggle. ✅ (recorded score TBD)
- [x] **Adaptive music** — tempo/percussion intensify during boss fights. ✅
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
- [x] **Save / load** — localStorage auto-save + Continue. ✅ (cloud TBD)
- [ ] **Accounts / profiles** (L) — needs backend (e.g. Node + DB).
- [ ] **Cloud progression & settings sync** (L).
- [ ] **Analytics / telemetry** (M) — funnel, puzzle drop-off, balancing data.

## 12. Visuals & realism
- [ ] **PBR materials & better lighting** (L) — move from StandardMaterial to PBR where it helps; keep stylized look.
- [x] **Shadows** (M) — sun shadow maps (PCF) on buildings/people/props, enabled in the Realistic visual style. ✅ (torch shadows TBD)
- [~] **Post-processing** (M) — bloom + vignette via DefaultRenderingPipeline; Realistic style adds FXAA, sharpen, ACES tone mapping, contrast/exposure grading & film grain. ✅ SSAO, DoF, true volumetric god-rays still TBD.
- [x] **Particle upgrades** — torch embers + sandstorm sand drift. ✅ (splashes/wisps TBD)
- [ ] **Decals & weathering** (M) — cracks, moss, sand piles.
- [ ] **LOD & impostors** (M) — for distant pyramids/mountains.
- [x] **Visual-style option** — Settings → Visual Style: Stylized / Balanced / Realistic (specular, haze, shadows, grading). ✅
- [ ] **Animated water/cloth/foliage** (M).

## 13. Controls & accessibility
- [x] **Gamepad support** — Babylon gamepad camera + button polling (attack/switch/pause). ✅
- [ ] **Key rebinding** (S).
- [x] **Full mobile controls for 3D** — left joystick + drag-look + action/pause/map buttons. ✅
- [~] **Accessibility** — reduced-motion + difficulty assists done; colorblind/subtitles/text-scaling/rebinding TBD.

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
- [x] **Hint system** — escalating hints toast if you stall on the active objective. ✅

## 16. Tooling & content pipeline
- [ ] **Level editor** (L) — place props/murals/puzzles in-engine, export to data.
- [ ] **Data-driven content** (M) — define zones/puzzles/dialogue in JSON instead of code.
- [ ] **Fresco/puzzle authoring tool** (L).
- [x] **Debug console & cheats** — cheat panel (backquote): heal, weapons, scarabs, themes, unlock missions… ✅

## 17. Platform & distribution
- [x] **PWA / installable + offline** — manifest + service worker (app shell cached). ✅
- [ ] **Mobile (Capacitor) / desktop (Electron/Tauri) builds** (L).
- [ ] **Steam release** (L) — achievements, cloud saves.
- [ ] **itch.io / web build hosting** (S).
- [x] **Achievements** — 12 local achievements with toasts + a panel (K). ✅

## 18. Polish & "juice"
- [~] **Screen shake / impact FX** — camera shake + hit SFX ✅; hit-stop TBD.
- [ ] **Camera transitions** (S) — smooth 3D⇄2D blends, boss intro cams.
- [ ] **UI animations & sound feedback** (S).
- [ ] **Haptics on mobile/gamepad** (S).
- [x] **Secret codes / easter eggs** — type words in-game (camel→ride a camel, ankh, ra, night, khepri, apophis, smite, arsenal). ✅

---

## Suggested phased plan
**Phase A — make it a "game" (S/M):** main menu + pause, save/load, settings,
gamepad + full mobile 3D controls, health/checkpoints, hint system.

**Phase B — depth (M/L):** inventory + tools, 2–3 new fresco puzzle types,
multiple 2D characters + collision, enemies with AI, a second boss, quest log.

**Phase C — world (L):** 2–3 new zones (mountains/canyon, crypt, Duat), better
water, day/night + weather, level/world structure. (map & fast travel ✅)

**Phase D — fidelity (L):** shadows + post-processing, PBR/optional realistic
asset pack, recorded audio + adaptive music, LOD/instancing performance pass.

**Phase E — social (XL):** save backend/accounts, in-game text chat, then
**co-op (3D + 2D players)**, leaderboards, community fresco sharing.

> Highest-leverage next steps for this prototype: **save/load + main/pause menu**,
> **inventory + a tool that reveals hidden frescoes**, **one new zone with
> mountains & better water**, and **multiple 2D characters with collision**.
