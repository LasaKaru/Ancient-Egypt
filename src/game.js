/* ============================================================
   game.js — Whispers of the Fresco
   Low-poly, first/second-person dual-perspective Egyptian
   puzzle-adventure across a bigger multi-zone world.
   Engine: Babylon.js.

   Depends on: art.js, audio.js, lowpoly.js, world.js
   ============================================================ */
(function () {
  "use strict";

  const B = BABYLON;
  const EYE = 1.7;
  const canvas = document.getElementById("renderCanvas");
  const engine = new B.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new B.Scene(engine);
  scene.collisionsEnabled = true;

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const dom = {
    instructions: $("instructions"), objList: $("objList"), crosshair: $("crosshair"),
    toast: $("toast"), bossBar: $("bossBar"), bossFill: $("bossFill"),
    touch: $("touchControls"), tcLeft: $("tcLeft"), tcRight: $("tcRight"), tcAction: $("tcAction"),
    tcPause: $("tcPause"), joystick: $("joystick"), joyKnob: $("joyKnob"),
    // screens
    splash: $("splash"), menu: $("menu"), settings: $("settings"), credits: $("credits"), pause: $("pause"),
    btnPlay: $("btnPlay"), btnSettings: $("btnSettings"), btnCredits: $("btnCredits"),
    btnSettingsBack: $("btnSettingsBack"), btnCreditsBack: $("btnCreditsBack"),
    btnResume: $("btnResume"), btnPauseSettings: $("btnPauseSettings"), btnMainMenu: $("btnMainMenu"),
    btnContinue: $("btnContinue"), btnPlay: $("btnPlay"),
    inventory: $("inventory"), invScarabs: $("invScarabs"), invCompanions: $("invCompanions"),
    btnInvClose: $("btnInvClose"), scarabHud: $("scarabHud"), scarabCount: $("scarabCount"),
    victory: $("victory"), victoryStats: $("victoryStats"), btnVictoryMenu: $("btnVictoryMenu"),
    healthHud: $("healthHud"), hpFill: $("hpFill"), damageFlash: $("damageFlash"),
    minimap: $("minimap"), map: $("map"), mapCanvas: $("mapCanvas"), btnMapClose: $("btnMapClose"), tcMap: $("tcMap"),
    fastTravel: $("fastTravel"), dialogue: $("dialogue"), dlgName: $("dlgName"), dlgText: $("dlgText"),
    // settings inputs
    setVolume: $("setVolume"), setVolumeVal: $("setVolumeVal"), setMute: $("setMute"),
    setSens: $("setSens"), setSensVal: $("setSensVal"), setFov: $("setFov"), setFovVal: $("setFovVal"),
    setQuality: $("setQuality"), setFog: $("setFog"), setMusic: $("setMusic"),
    setDifficulty: $("setDifficulty"), setReduced: $("setReduced"), potionHud: $("potionHud"),
    weaponHud: $("weaponHud"), weaponName: $("weaponName"), weaponKeys: $("weaponKeys"),
    codex: $("codex"), codexList: $("codexList"), btnCodexClose: $("btnCodexClose"), clockHud: $("clockHud"),
    quests: $("quests"), questMain: $("questMain"), questSide: $("questSide"), btnQuestsClose: $("btnQuestsClose"),
  };
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  // ---------- WORLD ----------
  const world = World.build(scene);
  const { walls, torches, ROOM, heightAt, pillars } = world;

  // ---------- CAMERA (first-person) ----------
  const camera = new B.FreeCamera("player", world.spawn.clone(), scene);
  camera.attachControl(canvas, true);
  camera.speed = 0.42;
  camera.angularSensibility = 2800;
  camera.minZ = 0.05;
  camera.maxZ = 700;
  camera.checkCollisions = true;
  camera.applyGravity = false;
  camera.ellipsoid = new B.Vector3(0.5, 0.85, 0.5);
  camera.keysUp = [87, 38];
  camera.keysDown = [83, 40];
  camera.keysLeft = [65, 37];
  camera.keysRight = [68, 39];
  camera.setTarget(new B.Vector3(0, EYE, 0));
  try { camera.inputs.addGamepad(); } catch (e) {} // move + look when a controller is connected
  camera.detachControl(); // gameplay camera stays inactive until PLAY

  // ---------- menu camera (slow cinematic orbit behind the menus) ----------
  const menuCam = new B.ArcRotateCamera("menuCam", Math.PI * 0.85, 1.12, 30, new B.Vector3(0, 2.2, 0), scene);
  menuCam.fov = 0.9;
  scene.activeCamera = menuCam;

  // ---------- held flashlight (first-person viewmodel + spotlight) ----------
  const flashlight = LP.flashlight();
  flashlight.parent = camera;
  flashlight.position.set(0.34, -0.3, 0.7);
  flashlight.rotation.set(-0.05, 0, 0);
  const flashSpot = new B.SpotLight("flashSpot", new B.Vector3(0.2, -0.1, 0.4),
    new B.Vector3(0, -0.04, 1), Math.PI / 3.6, 14, scene);
  flashSpot.parent = camera;
  flashSpot.intensity = 0.75;
  flashSpot.diffuse = new B.Color3(1, 0.92, 0.72);
  flashSpot.range = 22;
  flashlight.setEnabled(false); flashSpot.setEnabled(false); // off until gameplay

  // ---------- weapon viewmodels (parented to camera, bottom-right) ----------
  const WEAPON_INFO = { khopesh: { name: "⚔ Khopesh", key: "1" }, spear: { name: "🔱 Spear", key: "2" }, bow: { name: "🏹 Bow", key: "3" } };
  const weaponViews = {};
  ["khopesh", "spear", "bow"].forEach((t) => {
    const v = LP.weapon(t); v.parent = camera; v.position.set(0.34, -0.3, 0.7); v.rotation.set(-0.05, 0, 0);
    v.setEnabled(false); weaponViews[t] = v;
  });

  // ---------- sealed door (low-poly) — fills the eastern doorway to the oasis ----------
  const door = LP.box(0.6, 4, 6, LP.mat("#b89a5e"), "door");
  LP.flat(door);
  door.position.set(ROOM.w / 2, 2, 0);
  door.checkCollisions = true;

  // ============================================================
  // STATE
  // ============================================================
  const state = {
    started: false,
    paused: false,
    mode: "3d",
    currentMural: null,
    paintedChar: null,
    patch: null,
    savedCam: null,
    move2D: { neg: false, pos: false },
    touchMove: { x: 0, y: 0 },
    cam2D: null,
    companions: [],
    bossProps: [],
    boss: null,
    treasure: null,
    enemies: [],
    npcs: [],
    dialogue: null,
    quests: { khufu: "unstarted" },
    potions: 0, photo: false, enemyDamage: 8, reducedMotion: false,
    weapons: ["khopesh"], weapon: "khopesh", arrows: [],
    codex: [],
    health: 100, maxHealth: 100, lastHit: 0,
    objectives: { door: false, light: false, barque: false, boss: false, treasure: false },
  };

  // ============================================================
  // MURALS / PUZZLES  (parented to temple walls)
  // ============================================================
  // The front-left pillar carries a climbable fresco (vertical 2D mechanic).
  const climbPillar = pillars[0]; // pillar at (-4, -6)
  const muralDefs = [
    { id: "nile", title: "Daily Life on the Nile", scene: "nile", char: "worker",
      wall: walls.backWall, local: new B.Vector3(0, 0.2, 0.33), size: { w: 8, h: 3.4 },
      puzzle: "walk", axis: "x",
      hint: "Walk the worker to the far side to haul the rope that lifts the eastern door to the oasis." },
    { id: "climb", title: "The Painted Climber", char: "climber",
      wall: climbPillar, local: new B.Vector3(0, 0.0, -0.52), facing: Math.PI, size: { w: 0.95, h: 4.4 },
      puzzle: "climb", axis: "y", panel: true,
      hint: "Climb the painted figure to the sun-disk at the top to flood the temple with light." },
    { id: "boat", title: "The Sacred Barque", scene: "barque", char: "boat",
      wall: walls.rightWall, local: new B.Vector3(0, 0.3, 0.33), size: { w: 6, h: 3.2 },
      puzzle: "walk", axis: "x",
      hint: "Slide the painted barque across the river — the real boat sails the oasis." },
    { id: "anubis", title: "The Guardian of the Dead", scene: "anubis", char: "anubis",
      wall: walls.leftWall, local: new B.Vector3(0, 0.4, 0.33), size: { w: 5, h: 3.6 },
      puzzle: "boss", gated: true, hint: "The guardian stirs. Press E to face Anubis." },
  ];

  const murals = [];
  muralDefs.forEach((def) => {
    const m = B.MeshBuilder.CreatePlane("mural_" + def.id,
      { width: def.size.w, height: def.size.h, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
    m.parent = def.wall;
    m.position = def.local.clone();
    if (def.facing != null) m.rotation.y = def.facing;
    const mat = new B.StandardMaterial("muralMat_" + def.id, scene);
    mat.diffuseTexture = def.panel ? Art.glyphPanelTexture(B, scene, def.id) : Art.muralTexture(B, scene, def);
    // some walls are rotated such that their texture appears mirrored — flip U so text reads correctly
    if ((def.wall === walls.backWall || def.wall === walls.rightWall) && !def.panel) {
      mat.diffuseTexture.uScale = -1; mat.diffuseTexture.uOffset = 1;
    }
    mat.specularColor = new B.Color3(0.1, 0.1, 0.1);
    mat.emissiveColor = new B.Color3(0.12, 0.1, 0.06);
    mat.maxSimultaneousLights = 8;
    m.material = mat;
    m.metadata = { interactive: true, def };
    def.mesh = m;
    murals.push(m);
  });

  // ============================================================
  // HUD HELPERS
  // ============================================================
  function setInstr(t) { dom.instructions.textContent = t; }
  let toastTimer = null;
  function toast(t, ms) {
    dom.toast.textContent = t; dom.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.remove("show"), ms || 2200);
  }
  function renderObjectives() {
    const got = world.scarabs.filter((s) => s.collected).length;
    const total = world.scarabs.length;
    const items = [
      { done: state.objectives.door, text: "Open the sealed eastern door (Nile fresco)" },
      { done: state.objectives.light, text: "Restore Ra's light (climb the painted pillar)" },
      { done: state.objectives.barque, text: "Sail the Sacred Barque across the oasis" },
      { done: got >= total, text: "Recover the Sacred Scarabs (" + got + "/" + total + ")" },
      { done: state.objectives.boss, text: "Awaken and defeat the guardian Anubis" },
    ];
    if (state.objectives.boss) items.push({ done: state.objectives.treasure, text: "Claim the Pharaoh's treasure" });
    let activeSet = false;
    dom.objList.innerHTML = "";
    items.forEach((it) => {
      const li = document.createElement("li");
      li.textContent = it.text;
      if (it.done) li.className = "done";
      else if (!activeSet) { li.className = "active"; activeSet = true; }
      dom.objList.appendChild(li);
    });
  }
  function defaultInstr() {
    return isTouch ? "Drag to look • ◀ ▶ move • ⚔ interact"
                   : "Click to lock mouse • WASD to move • look at a mural and press E";
  }

  // ============================================================
  // TWEENS
  // ============================================================
  const tweens = [];
  function tweenPos(node, target, dur, onDone) {
    tweens.push({ node, from: node.position.clone(), to: target.clone(), t: 0, dur, onDone });
  }
  function updateTweens(dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      tw.node.position = B.Vector3.Lerp(tw.from, tw.to, e);
      if (k >= 1) { tweens.splice(i, 1); if (tw.onDone) tw.onDone(); }
    }
  }
  const tweening = (node) => tweens.some((tw) => tw.node === node);

  // ============================================================
  // 2D PAINTING MODE
  // ============================================================
  function canActivate(def) {
    if (def.gated) return state.objectives.door && state.objectives.light;
    return true;
  }

  function enter2DMode(mural) {
    const def = mural.metadata.def;
    if (state.mode !== "3d") return;
    if (def.puzzle === "boss") {
      if (state.objectives.boss) { toast("The guardian has been vanquished.", 1800); return; }
      if (!canActivate(def)) { toast("The guardian sleeps…", 1800);
        setInstr("Restore the light and open the door before the guardian will wake."); return; }
      startBossFight(def); return;
    }

    Sound.whoosh();
    state.mode = "2d";
    state.currentMural = mural;
    document.exitPointerLock && document.exitPointerLock();
    state.savedCam = { position: camera.position.clone(), rotation: camera.rotation.clone(), mode: camera.mode };
    camera.detachControl();
    camera.mode = B.Camera.ORTHOGRAPHIC_CAMERA;
    flashSpot.setEnabled(false); showHeld(false);

    // place the ortho camera squarely in front of the fresco using its own normal
    const wpos = mural.getAbsolutePosition();
    let normal = mural.getDirection(B.Axis.Z); normal.y = 0;
    if (normal.lengthSquared() < 0.001) normal = world.center.subtract(wpos);
    normal.y = 0; normal.normalize();
    const camDist = 4;
    state.cam2D = { normal, dist: camDist };
    camera.position = wpos.add(normal.scale(camDist));
    camera.setTarget(wpos);
    const half = def.size.h * 0.62, aspect = engine.getAspectRatio(camera);
    camera.orthoTop = half; camera.orthoBottom = -half;
    camera.orthoLeft = -half * aspect; camera.orthoRight = half * aspect;

    const axis = def.axis || "x";
    const charH = axis === "y" ? Math.min(1.5, def.size.h * 0.32) : def.size.h * 0.55;
    const charW = charH * 0.55;
    // figure & patch are parented to the MURAL plane, so their local +Z is
    // always the mural's front (toward the camera) regardless of wall rotation.
    const span = (axis === "x" ? def.size.w : def.size.h) * 0.42;

    // torn-plaster patch the figure "comes alive" in
    if (state.patch) state.patch.dispose();
    const patch = B.MeshBuilder.CreatePlane("patch",
      { width: charW * 2.4, height: charH * 1.5, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
    patch.parent = mural;
    const pmat = new B.StandardMaterial("patchMat", scene);
    pmat.diffuseTexture = Art.tornPatchTexture(B, scene);
    pmat.diffuseTexture.hasAlpha = true;
    pmat.useAlphaFromDiffuseTexture = true;
    pmat.specularColor = new B.Color3(0, 0, 0);
    pmat.emissiveColor = new B.Color3(0.55, 0.5, 0.38);
    pmat.backFaceCulling = false;
    patch.material = pmat;
    state.patch = patch;

    // the living painted figure
    if (state.paintedChar) state.paintedChar.dispose();
    const ch = B.MeshBuilder.CreatePlane("paintedChar",
      { width: charW, height: charH, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
    ch.parent = mural;
    const cmat = new B.StandardMaterial("pcMat", scene);
    cmat.diffuseTexture = Art.characterTexture(B, scene, def.char);
    cmat.diffuseTexture.hasAlpha = true;
    cmat.useAlphaFromDiffuseTexture = true;
    cmat.specularColor = new B.Color3(0, 0, 0);
    cmat.emissiveColor = new B.Color3(0.55, 0.46, 0.3);
    cmat.backFaceCulling = false;
    ch.material = cmat;

    // start at one end of the mural; travel toward the other end (mural-local)
    const start = new B.Vector3(0, 0, 0.06);
    if (axis === "x") start.x = -span; else start.y = -span;
    ch.position = start.clone();
    patch.position = new B.Vector3(start.x, start.y, 0.04);
    ch.metadata = { axis, min: -span, max: span, otherX: 0, otherY: 0, phase: 0 };
    state.paintedChar = ch;

    // touch button glyphs depend on the movement axis
    dom.tcLeft.textContent = axis === "y" ? "▼" : "◀";
    dom.tcRight.textContent = axis === "y" ? "▲" : "▶";

    setInstr(isTouch
      ? (axis === "y" ? "▲ ▼ climb the figure   •   ✕ exits" : "◀ ▶ move the figure   •   ✕ exits")
      : (axis === "y" ? "↑ ↓ (W/S) climb the figure   •   E exits"
                      : "← → (A/D) move the painted figure   •   E exits"));
    toast(def.hint, 2600);
    showTouch(true);
  }

  function exit2DMode() {
    if (state.mode !== "2d" || !state.savedCam) return;
    Sound.unwhoosh();
    state.mode = "3d";
    camera.mode = state.savedCam.mode || B.Camera.PERSPECTIVE_CAMERA;
    camera.position = state.savedCam.position;
    camera.rotation = state.savedCam.rotation;
    camera.attachControl(canvas, true);
    flashSpot.setEnabled(true); showHeld(true);
    if (state.paintedChar) { state.paintedChar.dispose(); state.paintedChar = null; }
    if (state.patch) { state.patch.dispose(); state.patch = null; }
    state.currentMural = null;
    state.cam2D = null;
    state.move2D.neg = state.move2D.pos = false;
    dom.tcLeft.textContent = "◀"; dom.tcRight.textContent = "▶";
    showTouch(isTouch);
    setInstr(defaultInstr());
  }

  let stepCd = 0;
  function update2D(dt) {
    const ch = state.paintedChar; if (!ch) return;
    const meta = ch.metadata, speed = 1.6 * dt, axis = meta.axis;
    const key = axis === "x" ? "x" : "y";
    let v = ch.position[key], moved = false;
    if (state.move2D.neg) { v = Math.max(meta.min, v - speed); moved = true; }
    if (state.move2D.pos) { v = Math.min(meta.max, v + speed); moved = true; }
    ch.position[key] = v;

    // gentle walk/climb bob on the cross axis
    if (moved) {
      meta.phase += dt * 10;
      const wobble = Math.abs(Math.sin(meta.phase)) * 0.05;
      if (axis === "x") ch.position.y = meta.otherY + wobble;
      else ch.position.x = meta.otherX + (Math.sin(meta.phase) * 0.03);
      stepCd -= dt; if (stepCd <= 0) { Sound.step(); stepCd = axis === "y" ? 0.34 : 0.28; }
    }
    // patch trails the figure
    if (state.patch) { state.patch.position.x = ch.position.x; state.patch.position.y = ch.position.y; }

    // cross-dimension link: the painted barque drives the real 3D boat
    const cur = state.currentMural.metadata.def;
    if (cur.id === "boat" && world.boat3D) {
      const prog = (v - meta.min) / (meta.max - meta.min);
      const np = B.Vector3.Lerp(world.boatDock, world.boatFar, prog);
      world.boat3D.position.x = np.x; world.boat3D.position.z = np.z;
    }

    // camera pans to follow the figure (true side-scroller / climb feel)
    if (state.cam2D) {
      const fw = ch.getAbsolutePosition();
      camera.position = fw.add(state.cam2D.normal.scale(state.cam2D.dist));
      camera.setTarget(fw);
    }

    const def = state.currentMural.metadata.def;
    if (!def.solved && v > meta.max - 0.05) solvePuzzle(def);
  }

  function solvePuzzle(def) {
    def.solved = true; Sound.success();
    if (def.id === "nile") {
      tweenPos(door, door.position.add(new B.Vector3(0, 4.2, 0)), 1.6, () => { door.checkCollisions = false; });
      Sound.stoneSlide();
      state.objectives.door = true;
      toast("The eastern door grinds open — the oasis awaits!", 2600);
      peelOff(def, { cloth: "#bb3b22", skin: "#c8854f" });
    } else if (def.id === "climb") {
      lightTemple();
      state.objectives.light = true;
      toast("Ra's light floods the temple!", 2400);
      peelOff(def, { cloth: "#2f8f7e", skin: "#d99b63", hair: "#2c1d0f" });
    } else if (def.id === "boat") {
      state.objectives.barque = true;
      toast("The sacred barque reaches the far shore!", 2600);
      peelOff(def, { cloth: "#efe6cf", skin: "#c8854f", hair: "#2c1d0f" });
    }
    renderObjectives();
    saveGame();
    setTimeout(() => setInstr("Press " + (isTouch ? "✕" : "E") + " to return to the temple."), 600);
    if (state.objectives.door && state.objectives.light)
      setTimeout(() => toast("A growl echoes from the left wall…", 2600), 2600);
  }

  function lightTemple() {
    Sound.lightUp();
    const startT = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - startT) / 1500);
      torches.forEach((tc) => { tc.light.intensity = 0.2 + 1.2 * k; });
      world.hemi.intensity = 0.55 + 0.25 * k;
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  }

  // ============================================================
  // PEEL-OFF — painted figure becomes a low-poly 3D companion
  // ============================================================
  function peelOff(def, colors) {
    Sound.whoosh();
    const api = LP.humanoid(colors);
    const wpos = (state.paintedChar ? state.paintedChar.getAbsolutePosition() : def.mesh.getAbsolutePosition()).clone();
    const ground = heightAt(wpos.x, wpos.z);
    const from = new B.Vector3(wpos.x, ground, wpos.z);
    api.root.position = from.clone();
    // direction out of the wall toward the room interior
    const out = world.center.subtract(new B.Vector3(wpos.x, 0, wpos.z)); out.y = 0;
    if (out.lengthSquared() < 0.01) out.set(0, 0, -1);
    out.normalize();
    api.root.rotation.y = Math.atan2(out.x, out.z);
    // start paper-thin & flat against the wall, then gain depth as it peels off
    api.root.scaling.set(1, 1, 0.05);
    const to = from.add(out.scale(2.6)); to.y = heightAt(to.x, to.z);
    state.companions.push({
      api, colors, offset: 2.2 + state.companions.length * 0.8, bob: Math.random() * 6,
      peel: { t: 0, dur: 1.4, from, to },
    });
  }

  // recreate a companion instantly (used when loading a save)
  function spawnCompanion(colors) {
    const api = LP.humanoid(colors || {});
    const a = state.companions.length;
    const pos = world.spawn.clone();
    pos.x += (a % 2 ? 1.2 : -1.2); pos.y = heightAt(pos.x, pos.z);
    api.root.position = pos;
    state.companions.push({ api, colors, offset: 2.2 + a * 0.8, bob: Math.random() * 6 });
  }

  function updateCompanions(dt) {
    state.companions.forEach((c, i) => {
      const root = c.api.root;
      // peel-off: emerge from the wall, gaining 3D depth
      if (c.peel) {
        c.peel.t += dt;
        const k = Math.min(1, c.peel.t / c.peel.dur);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        root.position = B.Vector3.Lerp(c.peel.from, c.peel.to, e);
        root.position.y = heightAt(root.position.x, root.position.z);
        root.scaling.z = 0.05 + 0.95 * e;
        c.api.update(dt, true);
        if (k >= 1) { root.scaling.set(1, 1, 1); c.peel = null; }
        return;
      }
      const back = camera.getDirection(B.Axis.Z).scale(-c.offset);
      const side = camera.getDirection(B.Axis.X).scale((i % 2 ? 1 : -1) * 1.0);
      const want = camera.position.add(back).add(side);
      want.y = 0;
      const before = root.position.clone();
      const flat2 = root.position.clone(); flat2.y = 0;
      const next = B.Vector3.Lerp(flat2, want, Math.min(1, dt * 2));
      next.y = heightAt(next.x, next.z);
      root.position = next;
      const moving = B.Vector3.Distance(before, root.position) > 0.01;
      // face travel direction
      if (moving) {
        const dir = want.subtract(flat2);
        if (dir.lengthSquared() > 0.001) root.rotation.y = Math.atan2(dir.x, dir.z);
      }
      c.api.update(dt, moving);
    });
  }

  // ============================================================
  // BOSS — low-poly guardian Anubis
  // ============================================================
  // Three-phase fight: 3D melee → 2D fresco (strike the glowing heart) → enraged 3D.
  const BOSS = { p1: 6, p2: 4, p3: 5 };
  const EYE_VIOLET = B.Color3.FromHexString("#7a2dff").scale(1.6);
  const EYE_RAGE = B.Color3.FromHexString("#ff3df0").scale(1.8);

  function startBossFight(def) {
    if (state.boss) return;
    Sound.bossRoar();
    state.mode = "boss";
    toast("THE GUARDIAN AWAKENS", 2600);
    def.mesh.material.emissiveColor = new B.Color3(0.7, 0.25, 0.05);
    world.hemi.intensity = 0.28; // dim hall for the violet, candle-lit reveal

    const total = BOSS.p1 + BOSS.p2 + BOSS.p3;
    state.boss = {
      phase: 0, g: null, painted: null, weak: null,
      total, hpLeft: total, hitCd: 0, t: 0, attackCd: 3.5,
      transitioning: false, arena: new B.Vector3(0, 0, 5),
      slideDir: 1, weakTimer: 1.6, weakOn: false,
    };

    // ring of floor candles (emissive only, to stay in the light budget)
    const R = 4.4;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const px = state.boss.arena.x + Math.cos(a) * R, pz = state.boss.arena.z + Math.sin(a) * R;
      const c = LP.candle(new B.Vector3(px, heightAt(px, pz), pz), 0.4 + Math.random() * 0.2, false);
      state.bossProps.push(c.root);
    }

    dom.bossBar.style.display = "block";
    spawn3DGuardian(false);
    state.boss.phase = 1;
    updateBossBar();
    setInstr(isTouch ? "Tap ⚔ to strike the guardian!"
                     : "Click (or SPACE) to strike the guardian with Ra's light!");
    if (!isTouch && document.pointerLockElement !== canvas) canvas.requestPointerLock();
  }

  function spawn3DGuardian(enraged) {
    const g = LP.guardian();
    const a = state.boss.arena;
    g.root.position.set(a.x, heightAt(a.x, a.z), a.z);
    g.eyeMat.emissiveColor = enraged ? EYE_RAGE.clone() : EYE_VIOLET.clone();
    if (enraged) g.glow.diffuse = new B.Color3(1, 0.2, 0.9);
    state.boss.g = g;
  }

  // Phase 2 — the guardian flattens and flees into the back-wall fresco
  function enterPhase2() {
    const b = state.boss; b.transitioning = true;
    toast("Anubis flees into the fresco!", 2400); Sound.bossRoar();
    const g = b.g, startT = performance.now(), z0 = g.root.position.z;
    const anim = () => {
      const k = Math.min(1, (performance.now() - startT) / 900);
      g.root.scaling.z = 1 - 0.96 * k;
      g.glow.intensity = 1.8 * (1 - k);
      g.root.position.z = z0 + (10.4 - z0) * k; // drift to the wall
      if (k < 1) requestAnimationFrame(anim);
      else { g.root.dispose(); b.g = null; buildPaintedBoss(); }
    };
    anim();
  }

  function buildPaintedBoss() {
    const b = state.boss;
    const plane = B.MeshBuilder.CreatePlane("paintedBoss",
      { width: 2.6, height: 4.0, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
    plane.parent = walls.backWall;
    plane.position = new B.Vector3(0, 0.4, 0.42);
    const m = new B.StandardMaterial("pbMat", scene);
    m.diffuseTexture = Art.characterTexture(B, scene, "anubis");
    m.diffuseTexture.hasAlpha = true; m.useAlphaFromDiffuseTexture = true;
    m.specularColor = new B.Color3(0, 0, 0);
    m.emissiveColor = new B.Color3(0.5, 0.28, 0.6);
    m.backFaceCulling = false; m.maxSimultaneousLights = 8;
    plane.material = m;
    // glowing "heart" weak-spot — only pickable while lit
    const weak = LP.lowSphere(0.5, 1, LP.mat("#ff6bf0", "#ff1ad0", 1.6), "bossWeak");
    weak.parent = plane; weak.position.set(0, -0.1, 0.08);
    weak.metadata = { weakHit: true }; weak.visibility = 0; weak.isPickable = false;
    b.painted = plane; b.weak = weak;
    b.weakOn = false; b.weakTimer = 1.4; b.slideDir = 1; b.phase = 2; b.transitioning = false;
    setInstr(isTouch ? "Strike the glowing heart when Anubis surfaces!"
                     : "Strike the glowing heart (click/SPACE) when it appears!");
  }

  // Phase 3 — the guardian bursts back out, enraged
  function enterPhase3() {
    const b = state.boss; b.transitioning = true;
    toast("THE GUARDIAN RETURNS — ENRAGED", 2600); Sound.bossRoar();
    if (b.painted) { b.painted.dispose(); b.painted = null; b.weak = null; }
    spawn3DGuardian(true);
    b.phase = 3; b.transitioning = false;
    setInstr(isTouch ? "Finish the guardian — tap ⚔!" : "Finish the guardian — click/SPACE!");
  }

  function updateBossBar() {
    dom.bossFill.style.width = Math.max(0, (state.boss.hpLeft / state.boss.total) * 100) + "%";
  }

  function flashEyes() {
    const b = state.boss; if (!b.g) return;
    b.g.eyeMat.emissiveColor = new B.Color3(1, 1, 0.8);
    setTimeout(() => {
      if (state.boss && state.boss.g)
        state.boss.g.eyeMat.emissiveColor = (state.boss.phase === 3 ? EYE_RAGE : EYE_VIOLET).clone();
    }, 90);
  }

  function damageBoss() {
    const b = state.boss; b.hpLeft -= 1; b.hitCd = 0.32; Sound.hit(); shake(); updateBossBar();
    if (b.phase === 1 && b.hpLeft <= BOSS.p2 + BOSS.p3) { enterPhase2(); return; }
    if (b.phase === 2 && b.hpLeft <= BOSS.p3) { enterPhase3(); return; }
    if (b.hpLeft <= 0) defeatBoss();
  }

  function hitBoss() {
    const b = state.boss; if (!b || b.transitioning || b.hitCd > 0) return;
    if (b.phase === 1 || b.phase === 3) {
      if (!b.g) return;
      const pick = scene.pickWithRay(camera.getForwardRay(24), (m) => m.metadata && m.metadata.bossHit);
      if (!pick.hit) { setInstr("Face the guardian to strike it!"); return; }
      if (B.Vector3.Distance(camera.position, b.g.root.position) > 16) { setInstr("Get closer to strike!"); return; }
      damageBoss(); flashEyes();
    } else if (b.phase === 2) {
      if (!b.weakOn) { setInstr("Wait for the glowing heart to surface!"); return; }
      const pick = scene.pickWithRay(camera.getForwardRay(30), (m) => m.metadata && m.metadata.weakHit);
      if (!pick.hit) { setInstr("Aim at the glowing heart!"); return; }
      damageBoss();
      b.weakOn = false; b.weak.visibility = 0; b.weak.isPickable = false; b.weakTimer = 0.8 + Math.random();
    }
  }

  function defeatBoss() {
    const b = state.boss; Sound.bossDown();
    state.objectives.boss = true; renderObjectives(); saveGame();
    toast("THE GUARDIAN IS VANQUISHED", 3200);
    dom.bossBar.style.display = "none";
    const g = b.g, startT = performance.now();
    const anim = () => {
      const k = Math.min(1, (performance.now() - startT) / 1400);
      if (g) { g.root.scaling.setAll(1 - k); g.glow.intensity = 1.8 * (1 - k); }
      if (k < 1) requestAnimationFrame(anim);
      else {
        if (g) g.root.dispose();
        state.bossProps.forEach((p) => p.dispose());
        state.bossProps = [];
        world.hemi.intensity = 0.8;
        state.boss = null; state.mode = "3d";
        spawnTreasure();
        setInstr("The Pharaoh's treasure rises! Approach it to claim your prize.");
        setTimeout(() => toast("✦  THE TREASURE RISES  ✦", 3600), 1000);
      }
    };
    anim();
  }

  // ============================================================
  // TREASURE + VICTORY
  // ============================================================
  function spawnTreasure() {
    if (state.treasure) return;
    const x = 0, z = 5, ground = heightAt(x, z);
    const t = LP.treasure(new B.Vector3(x, ground - 2.6, z));
    state.treasure = t;
    tweenPos(t.root, new B.Vector3(x, ground, z), 1.6);
    Sound.success();
  }
  function checkTreasurePickup() {
    const t = state.treasure;
    if (!t || state.objectives.treasure) return;
    const dx = camera.position.x - t.root.position.x, dz = camera.position.z - t.root.position.z;
    if (dx * dx + dz * dz < 2.8 * 2.8) {
      state.objectives.treasure = true;
      renderObjectives(); saveGame();
      showVictory();
    }
  }
  // ============================================================
  // ENEMIES (Shades of the Duat) + HEALTH / COMBAT
  // ============================================================
  const ENEMY_SPOTS = [[3, 2], [-3, 4], [6, -3], [34, -10], [-15, 4]];
  function clearEnemies() { state.enemies.forEach((e) => e.sh.root.dispose()); state.enemies = []; }
  function spawnEnemies() {
    clearEnemies();
    ENEMY_SPOTS.forEach((s) => {
      const sh = LP.shade();
      sh.root.position.set(s[0], heightAt(s[0], s[1]), s[1]);
      state.enemies.push({ sh, hp: 2, t: Math.random() * 6, cd: 0, heading: Math.random() * Math.PI * 2, wt: 0 });
    });
  }
  function updateEnemies(dt) {
    const ph = camera.position;
    state.enemies.forEach((e) => {
      const r = e.sh.root; e.t += dt; e.cd = Math.max(0, e.cd - dt);
      r.position.y = heightAt(r.position.x, r.position.z) + 0.2 + Math.sin(e.t * 3) * 0.15;
      const dx = ph.x - r.position.x, dz = ph.z - r.position.z, d = Math.hypot(dx, dz) || 1;
      if (d < 13) {
        const sp = 2.2 * dt; r.position.x += (dx / d) * sp; r.position.z += (dz / d) * sp;
        r.rotation.y = Math.atan2(dx / d, dz / d);
        if (d < 1.7 && e.cd <= 0) { damagePlayer(state.enemyDamage); e.cd = 1.1; }
      } else {
        e.wt -= dt; if (e.wt <= 0) { e.heading += (Math.random() - 0.5) * 1.5; e.wt = 1 + Math.random() * 2; }
        r.position.x += Math.sin(e.heading) * 0.6 * dt; r.position.z += Math.cos(e.heading) * 0.6 * dt;
        r.rotation.y = e.heading;
      }
    });
  }
  function strikeShades() {
    if (state.mode !== "3d") return false;
    const pick = scene.pickWithRay(camera.getForwardRay(8), (m) => m.metadata && m.metadata.shade);
    if (!pick.hit) return false;
    const e = state.enemies.find((x) => x.sh.col === pick.pickedMesh);
    if (!e) return false;
    e.hp -= 1; Sound.hit(); e.sh.root.scaling.scaleInPlace(0.9);
    e.sh.eyeMat.emissiveColor = new B.Color3(1, 1, 0.9);
    if (e.hp <= 0) {
      Sound.unwhoosh(); e.sh.root.dispose();
      state.enemies = state.enemies.filter((x) => x !== e);
      toast("A shade is banished by Ra's light!", 1400);
    }
    return true;
  }
  function updateHealthHud() {
    dom.hpFill.style.width = Math.max(0, state.health / state.maxHealth * 100) + "%";
    dom.potionHud.textContent = "🏺 " + state.potions;
  }
  function shake() {
    if (state.reducedMotion) return;
    canvas.classList.remove("shake"); void canvas.offsetWidth; canvas.classList.add("shake");
  }
  function damagePlayer(n) {
    if (!state.started || state.paused || state.photo) return;
    state.health -= n; state.lastHit = performance.now(); updateHealthHud();
    Sound.hit(); shake();
    if (!state.reducedMotion) {
      dom.damageFlash.classList.add("show");
      setTimeout(() => dom.damageFlash.classList.remove("show"), 180);
    }
    if (state.health <= 0) respawn();
  }
  // ---- consumables (healing jars) ----
  function checkJarPickup() {
    world.jars.forEach((j) => {
      if (j.used) return;
      const dx = camera.position.x - j.root.position.x, dz = camera.position.z - j.root.position.z;
      if (dx * dx + dz * dz < 2.6 * 2.6) {
        j.used = true; j.root.setEnabled(false); state.potions++;
        Sound.lightUp(); updateHealthHud();
        toast("Picked up a water jar  (press H to drink)", 1800);
        saveGame();
      }
    });
  }
  function usePotion() {
    if (state.potions <= 0) { toast("No water jars left.", 1200); return; }
    if (state.health >= state.maxHealth) { toast("Vitality already full.", 1200); return; }
    state.potions--; state.health = Math.min(state.maxHealth, state.health + 45);
    updateHealthHud(); Sound.success(); toast("You drink — vitality restored.", 1400); saveGame();
  }
  // ============================================================
  // WEAPONS (khopesh / spear / bow)
  // ============================================================
  function showHeld(on) {
    Object.values(weaponViews).forEach((v) => v.setEnabled(false));
    if (on && weaponViews[state.weapon]) weaponViews[state.weapon].setEnabled(true);
  }
  function updateWeaponHud() {
    dom.weaponName.textContent = WEAPON_INFO[state.weapon].name;
    dom.weaponKeys.textContent = state.weapons.map((w) => WEAPON_INFO[w].key + ":" + WEAPON_INFO[w].name.split(" ")[1]).join("  ");
  }
  function equipWeapon(type) {
    if (state.weapons.indexOf(type) < 0) return;
    state.weapon = type; showHeld(true); updateWeaponHud(); Sound.step();
  }
  function cycleWeapon() {
    const i = state.weapons.indexOf(state.weapon);
    equipWeapon(state.weapons[(i + 1) % state.weapons.length]);
  }
  function ownWeapon(type) {
    if (state.weapons.indexOf(type) >= 0) return;
    state.weapons.push(type); equipWeapon(type);
    toast("Acquired the " + WEAPON_INFO[type].name.split(" ")[1] + "!  (press " + WEAPON_INFO[type].key + ")", 2400);
    saveGame();
  }
  function checkWeaponPickup() {
    world.weaponPickups.forEach((w) => {
      if (w.taken) return;
      const dx = camera.position.x - w.root.position.x, dz = camera.position.z - w.root.position.z;
      if (dx * dx + dz * dz < 2.8 * 2.8) { w.taken = true; w.root.setEnabled(false); ownWeapon(w.type); }
    });
  }
  // unified attack — melee (khopesh/spear) or bow
  function attack() {
    if (state.mode === "2d" || state.paused || state.dialogue) return;
    if (state.weapon === "bow") { fireArrow(); return; }
    if (state.mode === "boss") { hitBoss(); return; }
    strikeMelee();
  }
  function strikeMelee() {
    const range = state.weapon === "spear" ? 6.5 : 4.5;
    const pick = scene.pickWithRay(camera.getForwardRay(range), (m) => m.metadata && m.metadata.shade);
    if (!pick.hit) return;
    const e = state.enemies.find((x) => x.sh.col === pick.pickedMesh);
    if (!e) return;
    e.hp -= 2; Sound.hit(); shake(); e.sh.root.scaling.scaleInPlace(0.9);
    if (e.hp <= 0) { Sound.unwhoosh(); e.sh.root.dispose(); state.enemies = state.enemies.filter((x) => x !== e); toast("A shade is banished!", 1200); }
  }
  function fireArrow() {
    const a = LP.arrow();
    const dir = camera.getForwardRay(1).direction.clone();
    a.position = camera.position.add(dir.scale(0.9));
    a.rotation.y = Math.atan2(dir.x, dir.z); a.rotation.x = -Math.asin(Math.max(-1, Math.min(1, dir.y)));
    state.arrows.push({ root: a, dir, t: 0 });
    Sound.whoosh();
  }
  function updateArrows(dt) {
    for (let i = state.arrows.length - 1; i >= 0; i--) {
      const ar = state.arrows[i]; ar.t += dt;
      ar.root.position.addInPlace(ar.dir.scale(30 * dt));
      let hit = false;
      for (const e of state.enemies) {
        if (B.Vector3.Distance(ar.root.position, e.sh.root.position.add(new B.Vector3(0, 1, 0))) < 1.3) {
          e.hp -= 2; Sound.hit();
          if (e.hp <= 0) { e.sh.root.dispose(); state.enemies = state.enemies.filter((x) => x !== e); toast("A shade is banished!", 1000); }
          hit = true; break;
        }
      }
      const b = state.boss;
      if (!hit && b && b.g && !b.transitioning && b.hitCd <= 0 && (b.phase === 1 || b.phase === 3) &&
          B.Vector3.Distance(ar.root.position, b.g.root.position.add(new B.Vector3(0, 2, 0))) < 2.6) {
        damageBoss(); flashEyes(); hit = true;
      }
      if (hit || ar.t > 2.6) { ar.root.dispose(); state.arrows.splice(i, 1); }
    }
  }

  // ============================================================
  // LORE NOTES + CODEX
  // ============================================================
  const LORE = {
    0: { title: "The Two Worlds", text: "The frescoes are windows to the spirit-world; what stirs within the paint shapes the stone around us." },
    1: { title: "The Journey of Ra", text: "Each dawn Ra sails his barque across the sky; each dusk he descends into the Duat to battle the serpent of darkness." },
    2: { title: "Khepri the Scarab", text: "The sacred scarab rolls the sun across the heavens — a sign of rebirth and the turning of the world." },
    3: { title: "Anubis, Guardian of the Dead", text: "Jackal-headed Anubis weighs each heart against the feather of Ma'at. The unworthy he does not let pass." },
  };
  function checkScrollPickup() {
    world.scrolls.forEach((s) => {
      if (s.taken) return;
      const dx = camera.position.x - s.root.position.x, dz = camera.position.z - s.root.position.z;
      if (dx * dx + dz * dz < 2.8 * 2.8) {
        s.taken = true; s.root.setEnabled(false);
        if (state.codex.indexOf(s.id) < 0) state.codex.push(s.id);
        Sound.lightUp(); toast("Lore discovered: " + LORE[s.id].title + "  (press C)", 2400);
        renderCodex(); saveGame();
      }
    });
  }
  function renderCodex() {
    const items = state.codex.map((id) => LORE[id]).filter(Boolean);
    dom.codexList.innerHTML = items.length
      ? items.map((e) => `<div class="codex-entry"><h4>${e.title}</h4><p>${e.text}</p></div>`).join("")
      : '<div class="codex-empty">Find papyrus scrolls scattered across the land to uncover the lore.</div>';
  }
  function toggleCodex() {
    if (!state.started || state.mode === "2d") return;
    if (currentOverlay === "codex") closeOverlay();
    else if (!currentOverlay) { renderCodex(); openOverlay("codex"); }
  }

  // ---- objective waypoint beacon ----
  const beacon = LP.beacon(); beacon.setEnabled(false);
  function activeWaypoint() {
    if (!state.objectives.door) return { x: 0, z: 9 };          // Nile fresco (back wall)
    if (!state.objectives.light) return { x: -4, z: -6 };       // climb pillar
    if (!state.objectives.barque) return { x: 8, z: -7 };       // barque fresco (east wall)
    if (collectedScarabs() < world.scarabs.length) {            // nearest uncollected scarab
      let best = null, bd = 1e9;
      world.scarabs.forEach((s) => { if (s.collected) return; const d = (s.root.position.x - camera.position.x) ** 2 + (s.root.position.z - camera.position.z) ** 2; if (d < bd) { bd = d; best = s; } });
      if (best) return { x: best.root.position.x, z: best.root.position.z };
    }
    if (!state.objectives.boss) return { x: -9, z: 0 };         // Anubis (left wall)
    if (state.treasure && !state.objectives.treasure) return { x: state.treasure.root.position.x, z: state.treasure.root.position.z };
    return null;
  }
  function updateWaypoint() {
    const w = activeWaypoint();
    if (!w) { beacon.setEnabled(false); return; }
    beacon.setEnabled(true);
    beacon.position.x = w.x; beacon.position.z = w.z;
    beacon.position.y = heightAt(w.x, w.z) + 17;
    state._wp = w;
  }
  function respawn() {
    state.health = state.maxHealth; updateHealthHud();
    camera.position = world.spawn.clone();
    spawnEnemies();
    toast("The shades overwhelmed you — restored at the gate.", 2600);
  }
  function regen(dt) {
    if (state.health < state.maxHealth && performance.now() - state.lastHit > 4000) {
      state.health = Math.min(state.maxHealth, state.health + 12 * dt); updateHealthHud();
    }
  }

  // ============================================================
  // NPCs + DIALOGUE
  // ============================================================
  const NPC_DEFS = [
    { name: "Merchant Khufu", x: -34, z: -3, colors: { cloth: "#2f6f8f", skin: "#c8854f" },
      dynamic: () => {
        const got = collectedScarabs();
        if (state.quests.khufu === "done")
          return { lines: ["Thank you again, friend — the city prospers thanks to you."] };
        if (state.quests.khufu === "active") {
          if (got >= 3) return {
            lines: ["You found three sacred scarabs! Bless you, traveller.", "Take Ra's blessing — your vigour is restored."],
            onClose: () => { state.quests.khufu = "done"; state.health = state.maxHealth; updateHealthHud(); renderQuests(); saveGame(); toast("Quest complete: Scarabs for Khufu!", 2600); },
          };
          return { lines: ["You have " + got + " of 3 sacred scarabs.", "They glint on rooftops and by the old shrine — keep looking!"] };
        }
        return {
          lines: ["Greetings, wanderer! Welcome to our humble city.", "Trade is slow with shades about… Could you gather 3 sacred scarabs?", "Find them and return to me for a blessing."],
          onClose: () => { state.quests.khufu = "active"; renderQuests(); saveGame(); toast("New quest: Scarabs for Khufu", 2400); },
        };
      } },
    { name: "High Priest Senu", x: -2, z: -7, colors: { cloth: "#efe6cf", skin: "#c8854f", hair: "#2c1d0f" },
      lines: [
        "The frescoes remember what stone forgets.",
        "Open the Nile's door, restore Ra's light, then face the Guardian.",
        "Only then shall the Pharaoh's treasure reveal itself.",
      ] },
    { name: "Street Child Ipy", x: -28, z: 1, colors: { cloth: "#bb3b22", skin: "#d99b63" },
      lines: [
        "Pssst! Looking for the sacred scarabs?",
        "I've seen them glinting on rooftops and by the old shrine…",
        "Open your map with M — they shine green if you know where to look!",
      ] },
  ];
  function spawnNPCs() {
    state.npcs.forEach((n) => n.api.root.dispose()); state.npcs = [];
    NPC_DEFS.forEach((d) => {
      const api = LP.humanoid(d.colors);
      api.root.position.set(d.x, heightAt(d.x, d.z), d.z);
      api.root.rotation.y = Math.atan2(0 - d.x, 0 - d.z); // face the city/temple centre
      state.npcs.push({ api, def: d, t: Math.random() * 6 });
    });
  }
  function updateNPCs(dt) {
    state.npcs.forEach((n) => { n.t += dt; n.api.root.position.y = heightAt(n.api.root.position.x, n.api.root.position.z) + Math.sin(n.t * 1.5) * 0.03; n.api.update(dt, false); });
  }
  function nearestNPC() {
    let best = null, bd = 3.2 * 3.2;
    state.npcs.forEach((n) => {
      const dx = camera.position.x - n.api.root.position.x, dz = camera.position.z - n.api.root.position.z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = n; }
    });
    return best;
  }
  const collectedScarabs = () => world.scarabs.filter((s) => s.collected).length;
  function openDialogue(n) {
    const d = n.def.dynamic ? n.def.dynamic() : { lines: n.def.lines };
    state.dialogue = { n, i: 0, lines: d.lines, onClose: d.onClose };
    camera.detachControl(); // freeze the player while talking
    dom.dlgName.textContent = n.def.name;
    dom.dlgText.textContent = d.lines[0];
    dom.dialogue.classList.remove("hidden");
    document.exitPointerLock && document.exitPointerLock();
  }
  function advanceDialogue() {
    const d = state.dialogue; if (!d) return;
    d.i++;
    if (d.i >= d.lines.length) { closeDialogue(); return; }
    dom.dlgText.textContent = d.lines[d.i];
  }
  function closeDialogue() {
    if (!state.dialogue) return;
    const onClose = state.dialogue.onClose;
    state.dialogue = null;
    dom.dialogue.classList.add("hidden");
    camera.attachControl(canvas, true);
    if (onClose) onClose();
    if (!isTouch) setTimeout(() => canvas.requestPointerLock && canvas.requestPointerLock(), 60);
  }
  // ---- quest log ----
  function renderQuests() {
    // main story = current objectives
    const got = collectedScarabs(), total = world.scarabs.length;
    const main = [
      { done: state.objectives.door, t: "Open the sealed eastern door" },
      { done: state.objectives.light, t: "Restore Ra's light" },
      { done: state.objectives.barque, t: "Sail the Sacred Barque" },
      { done: got >= total, t: "Recover the Sacred Scarabs (" + got + "/" + total + ")" },
      { done: state.objectives.boss, t: "Defeat the guardian Anubis" },
    ];
    if (state.objectives.boss) main.push({ done: state.objectives.treasure, t: "Claim the Pharaoh's treasure" });
    dom.questMain.innerHTML = main.map((q) => `<li class="${q.done ? "done" : ""}">${q.t}</li>`).join("");
    // side quests
    const side = [];
    const q = state.quests.khufu;
    if (q !== "unstarted") {
      const done = q === "done";
      side.push(`<li class="${done ? "done" : ""}">Scarabs for Khufu <span class="q-prog">— ${done ? "complete" : Math.min(3, got) + "/3 collected"}</span></li>`);
    }
    dom.questSide.innerHTML = side.length ? side.join("") : '<li class="quest-empty">Talk to citizens to find side quests.</li>';
  }
  function toggleQuests() {
    if (!state.started || state.mode === "2d") return;
    if (currentOverlay === "quests") closeOverlay();
    else if (!currentOverlay) { renderQuests(); openOverlay("quests"); }
  }
  // clicking/tapping the dialogue box itself advances (box is a DOM element over the canvas)
  dom.dialogue.addEventListener("click", advanceDialogue);
  dom.dialogue.addEventListener("touchstart", (e) => { e.preventDefault(); advanceDialogue(); }, { passive: false });

  // ============================================================
  // MAP + MINIMAP
  // ============================================================
  const LOCATIONS = [
    { name: "Temple Gate", x: 0, z: -30 },
    { name: "Temple Hall", x: 0, z: 0 },
    { name: "Ancient City", x: -34, z: -6 },
    { name: "Oasis", x: 34, z: -6 },
  ];
  const miniCtx = dom.minimap.getContext("2d");
  function drawWorldMap(ctx, size, range, cx, cz, showScarabs) {
    const sc = size / (2 * range);
    const px = (x) => size / 2 + (x - cx) * sc;
    const py = (z) => size / 2 + (z - cz) * sc;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#d8bd86"; ctx.fillRect(0, 0, size, size);
    // oasis
    ctx.fillStyle = "#2c7da0"; ctx.beginPath();
    ctx.arc(px(world.oasis.x), py(world.oasis.z), world.oasis.r * sc, 0, Math.PI * 2); ctx.fill();
    // buildings
    ctx.fillStyle = "#9a7d4f";
    world.cityBuildings.forEach((b) => ctx.fillRect(px(b.x - b.w / 2), py(b.z - b.d / 2), b.w * sc, b.d * sc));
    // temple
    ctx.fillStyle = "#b89a5e"; ctx.strokeStyle = "#5a3010"; ctx.lineWidth = 2;
    ctx.fillRect(px(-9), py(-11), 18 * sc, 22 * sc);
    ctx.strokeRect(px(-9), py(-11), 18 * sc, 22 * sc);
    // secret scarabs (uncollected)
    if (showScarabs) {
      world.scarabs.forEach((s) => {
        if (s.collected) return;
        ctx.fillStyle = "#43c06a";
        ctx.beginPath(); ctx.arc(px(s.root.position.x), py(s.root.position.z), 5, 0, Math.PI * 2); ctx.fill();
      });
    }
    // named locations (full map only)
    if (showScarabs) {
      ctx.font = "12px Trebuchet MS, sans-serif"; ctx.textAlign = "center";
      LOCATIONS.forEach((l) => {
        const lx = px(l.x), ly = py(l.z);
        ctx.fillStyle = "#caa05a";
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(Math.PI / 4); ctx.fillRect(-3, -3, 6, 6); ctx.restore();
        ctx.fillStyle = "rgba(40,25,12,0.85)"; ctx.fillText(l.name, lx, ly - 8);
      });
    }
    // active objective waypoint ring
    if (state._wp) {
      ctx.strokeStyle = "#ffd24a"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px(state._wp.x), py(state._wp.z), 7, 0, Math.PI * 2); ctx.stroke();
    }
    // treasure
    if (state.treasure) {
      const tx = px(state.treasure.root.position.x), ty = py(state.treasure.root.position.z);
      ctx.fillStyle = "#ffd24a"; star(ctx, tx, ty, 8, 4, 5);
    }
    // player arrow
    const plx = px(camera.position.x), ply = py(camera.position.z);
    const hx = Math.sin(camera.rotation.y), hz = Math.cos(camera.rotation.y);
    const ppx = -hz, ppz = hx;
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.moveTo(plx + hx * 9, ply + hz * 9);
    ctx.lineTo(plx - hx * 5 + ppx * 5, ply - hz * 5 + ppz * 5);
    ctx.lineTo(plx - hx * 5 - ppx * 5, ply - hz * 5 - ppz * 5);
    ctx.closePath(); ctx.fill();
  }
  function star(ctx, x, y, rO, rI, n) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? rI : rO, a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  }
  function updateMinimap() {
    drawWorldMap(miniCtx, 160, 56, camera.position.x, camera.position.z, false);
  }
  function buildFastTravel() {
    dom.fastTravel.innerHTML = "";
    LOCATIONS.forEach((loc) => {
      const btn = document.createElement("button");
      btn.className = "ft-btn"; btn.textContent = loc.name;
      btn.addEventListener("click", () => fastTravelTo(loc));
      dom.fastTravel.appendChild(btn);
    });
  }
  function fastTravelTo(loc) {
    camera.position = new B.Vector3(loc.x, heightAt(loc.x, loc.z) + EYE, loc.z);
    closeOverlay();
    toast("Traveled to " + loc.name, 2000);
  }
  function openMap() {
    const c = dom.mapCanvas;
    drawWorldMap(c.getContext("2d"), c.width, 95, 0, 0, true);
    buildFastTravel();
    openOverlay("map");
  }
  function toggleMap() {
    if (!state.started || state.mode === "2d") return;
    if (currentOverlay === "map") closeOverlay();
    else if (!currentOverlay) openMap();
  }

  function showVictory() {
    Sound.success();
    const got = world.scarabs.filter((s) => s.collected).length;
    dom.victoryStats.innerHTML =
      "Sacred Scarabs: " + got + " / " + world.scarabs.length + "<br>" +
      "Companions awakened: " + state.companions.length + "<br>" +
      "Sacred Barque: " + (state.objectives.barque ? "sailed" : "not sailed");
    currentOverlay = "victory"; state.paused = true;
    showScreen("victory");
    document.exitPointerLock && document.exitPointerLock();
  }

  // telegraphed ground shockwave — back away or take damage
  function bossShockwave() {
    const b = state.boss; if (!b || !b.g) return;
    Sound.bossRoar();
    const c = b.g.root.position.clone();
    const ring = B.MeshBuilder.CreateTorus("shock", { diameter: 1, thickness: 0.35, tessellation: 24 }, scene);
    const m = new B.StandardMaterial("shockM", scene);
    m.emissiveColor = new B.Color3(1, 0.3, 0.1); m.diffuseColor = new B.Color3(0, 0, 0);
    m.disableLighting = true; m.alpha = 0.75; m.fogEnabled = false;
    ring.material = m; ring.isPickable = false;
    ring.position.set(c.x, heightAt(c.x, c.z) + 0.2, c.z); ring.rotation.x = Math.PI / 2;
    const maxR = 7, startT = performance.now();
    const anim = () => {
      const k = Math.min(1, (performance.now() - startT) / 800);
      ring.scaling.setAll(0.5 + k * maxR * 2);
      m.alpha = 0.75 * (1 - k);
      if (k < 1) requestAnimationFrame(anim);
      else {
        ring.dispose();
        if (state.boss && B.Vector3.Distance(camera.position, c) < maxR) damagePlayer(16);
      }
    };
    anim();
  }

  function updateBoss(dt) {
    const b = state.boss; if (!b) return;
    b.t += dt; b.hitCd = Math.max(0, b.hitCd - dt);
    if (b.transitioning) return;

    if (b.phase === 1 || b.phase === 3) {
      const g = b.g; if (!g) return;
      g.update(dt);
      const speed = b.phase === 3 ? 1.4 : 0.8;
      g.root.position.y = heightAt(g.root.position.x, g.root.position.z) + Math.sin(b.t * 2) * 0.15;
      const toP = camera.position.subtract(g.root.position); toP.y = 0;
      if (toP.length() > 4.5) { toP.normalize(); g.root.position.addInPlace(toP.scale(dt * speed)); g.root.rotation.y = Math.atan2(toP.x, toP.z); }
      b.attackCd -= dt;
      if (b.attackCd <= 0) {
        b.attackCd = (b.phase === 3 ? 3.0 : 4.5) + Math.random() * 2;
        bossShockwave();
      }
    } else if (b.phase === 2) {
      const p = b.painted; if (!p) return;
      // slide along the wall (ping-pong)
      p.position.x += b.slideDir * dt * 2.2;
      if (p.position.x > 3.5) { p.position.x = 3.5; b.slideDir = -1; }
      if (p.position.x < -3.5) { p.position.x = -3.5; b.slideDir = 1; }
      // pulse the weak-spot on and off
      b.weakTimer -= dt;
      if (b.weakTimer <= 0) {
        b.weakOn = !b.weakOn;
        b.weakTimer = b.weakOn ? 2.0 : 1.2 + Math.random();
        b.weak.visibility = b.weakOn ? 1 : 0;
        b.weak.isPickable = b.weakOn;
        if (b.weakOn) Sound.lightUp();
      }
      if (b.weakOn) b.weak.scaling.setAll(1 + Math.sin(b.t * 10) * 0.15);
    }
  }

  // ============================================================
  // INTERACTION + INPUT
  // ============================================================
  function lookedAtInteractive() {
    const ray = camera.getForwardRay(7);
    const pick = scene.pickWithRay(ray, (m) => m.metadata && m.metadata.interactive);
    return pick.hit ? pick.pickedMesh : null;
  }

  scene.onKeyboardObservable.add((kb) => {
    if (!state.started || state.paused) return;
    const down = kb.type === B.KeyboardEventTypes.KEYDOWN;
    const key = kb.event.key.toLowerCase();
    if (state.dialogue) { if (down && (key === "e" || key === " " || key === "spacebar" || key === "enter")) advanceDialogue(); return; }
    if (state.mode === "2d") {
      if (key === "arrowleft" || key === "a" || key === "arrowdown" || key === "s") state.move2D.neg = down;
      if (key === "arrowright" || key === "d" || key === "arrowup" || key === "w") state.move2D.pos = down;
      if (down && key === "e") exit2DMode();
      return;
    }
    if (!down) return;
    if (key === "1") { equipWeapon("khopesh"); return; }
    if (key === "2") { equipWeapon("spear"); return; }
    if (key === "3") { equipWeapon("bow"); return; }
    if (key === "q") { cycleWeapon(); return; }
    if (state.mode === "boss") { if (key === " " || key === "spacebar") attack(); return; }
    if (key === "e") {
      const m = lookedAtInteractive();
      if (m) enter2DMode(m);
      else { const npc = nearestNPC(); if (npc) openDialogue(npc); }
      return;
    }
    if (key === " " || key === "spacebar") attack();
  });

  scene.onPointerObservable.add((pi) => {
    if (pi.type !== B.PointerEventTypes.POINTERDOWN) return;
    if (!state.started || state.paused) return;
    if (state.dialogue) { advanceDialogue(); return; }
    if (state.mode === "boss") { attack(); return; }
    if (state.mode === "3d") {
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
      else attack();
    }
  });

  // Esc = pause/back, I = inventory (handled at window level so it works unlocked)
  window.addEventListener("keydown", (e) => {
    if (!state.started) return;
    const k = e.key.toLowerCase();
    if (state.dialogue) { if (e.key === "Escape") closeDialogue(); return; }
    if (k === "i" && state.mode !== "2d") { toggleInventory(); return; }
    if (k === "m" && state.mode !== "2d") { toggleMap(); return; }
    if (k === "j" && state.mode !== "2d") { toggleQuests(); return; }
    if (k === "c" && state.mode !== "2d") { toggleCodex(); return; }
    if (k === "t" && state.mode !== "2d") { world.skipTime(); toast("Time passes — " + world.timeLabel(), 1400); return; }
    if (k === "h" && state.mode !== "2d") { usePotion(); return; }
    if (k === "p" && state.mode !== "2d") { state.photo = !state.photo; document.body.classList.toggle("photo", state.photo); return; }
    if (e.key === "Escape") {
      if (state.mode === "2d") return;
      if (!dom.settings.classList.contains("hidden")) { showScreen(settingsReturn === "pause" ? "pause" : "menu"); return; }
      if (currentOverlay === "inventory" || currentOverlay === "map" || currentOverlay === "quests" || currentOverlay === "codex") closeOverlay();
      else if (currentOverlay === "pause") resumeGame();
      else pauseGame();
    }
  });

  function updateTouchMode() {
    dom.touch.classList.toggle("mode2d", state.mode === "2d");
    dom.touch.classList.toggle("mode3d", state.mode !== "2d");
  }
  function showTouch(show) {
    if (!isTouch) { dom.touch.classList.remove("show"); return; }
    dom.touch.classList.toggle("show", show);
    updateTouchMode();
  }
  function bindHold(el, on, off) {
    el.addEventListener("touchstart", (e) => { e.preventDefault(); on(); }, { passive: false });
    el.addEventListener("touchend", (e) => { e.preventDefault(); off && off(); }, { passive: false });
    el.addEventListener("mousedown", (e) => { e.preventDefault(); on(); });
    el.addEventListener("mouseup", (e) => { e.preventDefault(); off && off(); });
  }
  bindHold(dom.tcLeft, () => { state.move2D.neg = true; }, () => { state.move2D.neg = false; });
  bindHold(dom.tcRight, () => { state.move2D.pos = true; }, () => { state.move2D.pos = false; });
  dom.tcAction.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (state.mode === "2d") exit2DMode();
    else if (state.mode === "boss") attack();
    else { const m = lookedAtInteractive(); if (m) enter2DMode(m); else { const npc = nearestNPC(); if (npc) openDialogue(npc); else attack(); } }
  }, { passive: false });
  dom.tcPause.addEventListener("touchstart", (e) => { e.preventDefault(); pauseGame(); }, { passive: false });

  // ----- mobile movement joystick (left) -----
  if (isTouch) {
    let joyId = null;
    const R = 50;
    const center = () => { const r = dom.joystick.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    function joyMove(t) {
      const c = center();
      let dx = t.clientX - c.x, dy = t.clientY - c.y;
      const len = Math.hypot(dx, dy) || 1;
      if (len > R) { dx = dx / len * R; dy = dy / len * R; }
      dom.joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      state.touchMove.x = dx / R; state.touchMove.y = dy / R;
    }
    function joyEnd() { joyId = null; state.touchMove.x = 0; state.touchMove.y = 0; dom.joyKnob.style.transform = ""; }
    dom.joystick.addEventListener("touchstart", (e) => {
      e.preventDefault(); const t = e.changedTouches[0]; joyId = t.identifier; joyMove(t);
    }, { passive: false });
    dom.joystick.addEventListener("touchmove", (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) if (t.identifier === joyId) joyMove(t);
    }, { passive: false });
    dom.joystick.addEventListener("touchend", (e) => {
      for (const t of e.changedTouches) if (t.identifier === joyId) joyEnd();
    }, { passive: false });
    dom.joystick.addEventListener("touchcancel", joyEnd, { passive: false });

    // ----- drag anywhere on the right side of the screen to look -----
    let lookId = null, lookX = 0, lookY = 0;
    const LOOK = 0.005;
    canvas.addEventListener("touchstart", (e) => {
      for (const t of e.changedTouches) {
        if (lookId === null && t.clientX > window.innerWidth * 0.4) {
          lookId = t.identifier; lookX = t.clientX; lookY = t.clientY;
        }
      }
    }, { passive: true });
    canvas.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === lookId && state.started && !state.paused && state.mode !== "2d") {
          camera.rotation.y += (t.clientX - lookX) * LOOK;
          camera.rotation.x += (t.clientY - lookY) * LOOK;
          camera.rotation.x = Math.max(-1.4, Math.min(1.4, camera.rotation.x));
          lookX = t.clientX; lookY = t.clientY;
        }
      }
    }, { passive: true });
    const lookEnd = (e) => { for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null; };
    canvas.addEventListener("touchend", lookEnd, { passive: true });
    canvas.addEventListener("touchcancel", lookEnd, { passive: true });
  }

  function applyTouchMove() {
    const tm = state.touchMove;
    if (tm.x === 0 && tm.y === 0) return;
    const f = camera.getDirection(B.Axis.Z), r = camera.getDirection(B.Axis.X);
    f.y = 0; r.y = 0; f.normalize(); r.normalize();
    const mv = f.scale(-tm.y * camera.speed).add(r.scale(tm.x * camera.speed));
    camera.cameraDirection.addInPlace(mv);
  }

  // ----- gamepad buttons (move/look handled by Babylon's gamepad input) -----
  const padPrev = {};
  function pollGamepadButtons() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && pads[0];
    if (!gp) return;
    const pressed = (i) => gp.buttons[i] && gp.buttons[i].pressed;
    const edge = (i) => { const p = pressed(i); const e = p && !padPrev[i]; padPrev[i] = p; return e; };
    // A (0) = interact / strike / exit-2D ; B (1) = back/exit ; Start (9) = pause
    if (edge(0)) {
      if (state.mode === "2d") exit2DMode();
      else if (state.mode === "boss") attack();
      else if (!state.paused) { const m = lookedAtInteractive(); if (m) enter2DMode(m); else { const npc = nearestNPC(); if (npc) openDialogue(npc); else attack(); } }
    }
    if (edge(2)) cycleWeapon(); // X = cycle weapon
    if (edge(1) && state.mode === "2d") exit2DMode();
    if (edge(9)) { if (currentOverlay === "pause") resumeGame(); else if (!currentOverlay && state.mode !== "2d") pauseGame(); }
  }

  // ============================================================
  // RENDER LOOP
  // ============================================================
  function groundCamera() {
    camera.position.y = heightAt(camera.position.x, camera.position.z) + EYE;
  }
  let lastT = performance.now();
  engine.runRenderLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    scene.render();
    if (!state.started) { menuCam.alpha += dt * 0.06; return; } // cinematic menu orbit
    pollGamepadButtons();
    if (state.paused) return;
    if (state.dialogue) { updateMinimap(); return; } // frozen while talking
    if (state.mode !== "2d") applyTouchMove();
    updateTweens(dt);
    updateCompanions(dt);

    if (state.mode === "2d") { update2D(dt); return; }

    groundCamera();
    regen(dt);
    updateWaypoint();
    updateMinimap();
    checkScarabPickup();
    checkJarPickup();
    checkWeaponPickup();
    checkScrollPickup();
    checkTreasurePickup();
    updateArrows(dt);
    dom.clockHud.textContent = "· " + world.timeLabel();
    if (state.mode === "boss") { updateBoss(dt); return; }
    updateEnemies(dt);
    updateNPCs(dt);

    // 3d: crosshair + contextual hint
    const m = lookedAtInteractive();
    if (m) {
      dom.crosshair.classList.add("active");
      const def = m.metadata.def;
      if (def.puzzle === "boss" && !canActivate(def))
        setInstr("The guardian sleeps. Restore the light and open the door first.");
      else setInstr((isTouch ? "Tap ⚔" : "Press E") + " to enter “" + def.title + "”");
    } else {
      const npc = nearestNPC();
      if (npc) { dom.crosshair.classList.add("active"); setInstr((isTouch ? "Tap ⚔" : "Press E") + " to talk to " + npc.def.name); }
      else { dom.crosshair.classList.remove("active"); setInstr(defaultInstr()); }
    }
  });

  window.addEventListener("resize", () => engine.resize());

  // ============================================================
  // SETTINGS (persisted to localStorage, applied live)
  // ============================================================
  const SETTINGS_KEY = "wotf_settings";
  const defaults = { volume: 70, mute: false, sensLevel: 6, fovDeg: 75, quality: "high", fog: true, music: true, difficulty: "normal", reducedMotion: false };
  const ENEMY_DMG = { story: 4, normal: 8, hard: 14 };
  let settings = Object.assign({}, defaults, loadSettings());

  function loadSettings() { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { return {}; } }
  function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {} }

  function applyQuality(q) {
    engine.setHardwareScalingLevel(q === "low" ? 1.7 : q === "medium" ? 1.3 : 1.0);
    const fx = q !== "low";
    if (world.dust) { fx ? world.dust.start() : world.dust.stop(); }
    if (world.godRays) world.godRays.forEach((m) => m.setEnabled(fx));
  }
  function applySettings() {
    camera.angularSensibility = 5500 - settings.sensLevel * 450;
    const fov = settings.fovDeg * Math.PI / 180;
    camera.fov = fov; menuCam.fov = fov;
    scene.fogMode = settings.fog ? B.Scene.FOGMODE_EXP2 : B.Scene.FOGMODE_NONE;
    Sound.setVolume(settings.volume / 100); Sound.setMute(settings.mute);
    Sound.setMusicEnabled(settings.music);
    state.enemyDamage = ENEMY_DMG[settings.difficulty] || 8;
    state.reducedMotion = !!settings.reducedMotion;
    applyQuality(settings.quality);
  }
  function bindSettingsUI() {
    dom.setVolume.value = settings.volume; dom.setVolumeVal.textContent = settings.volume;
    dom.setMute.checked = settings.mute;
    dom.setSens.value = settings.sensLevel; dom.setSensVal.textContent = settings.sensLevel;
    dom.setFov.value = settings.fovDeg; dom.setFovVal.textContent = settings.fovDeg;
    dom.setQuality.value = settings.quality;
    dom.setFog.checked = settings.fog;
    dom.setMusic.checked = settings.music;
    dom.setDifficulty.value = settings.difficulty;
    dom.setReduced.checked = settings.reducedMotion;
  }
  dom.setVolume.addEventListener("input", () => { settings.volume = +dom.setVolume.value; dom.setVolumeVal.textContent = settings.volume; applySettings(); saveSettings(); });
  dom.setMute.addEventListener("change", () => { settings.mute = dom.setMute.checked; applySettings(); saveSettings(); });
  dom.setSens.addEventListener("input", () => { settings.sensLevel = +dom.setSens.value; dom.setSensVal.textContent = settings.sensLevel; applySettings(); saveSettings(); });
  dom.setFov.addEventListener("input", () => { settings.fovDeg = +dom.setFov.value; dom.setFovVal.textContent = settings.fovDeg; applySettings(); saveSettings(); });
  dom.setQuality.addEventListener("change", () => { settings.quality = dom.setQuality.value; applySettings(); saveSettings(); });
  dom.setFog.addEventListener("change", () => { settings.fog = dom.setFog.checked; applySettings(); saveSettings(); });
  dom.setMusic.addEventListener("change", () => { settings.music = dom.setMusic.checked; applySettings(); saveSettings(); });
  dom.setDifficulty.addEventListener("change", () => { settings.difficulty = dom.setDifficulty.value; applySettings(); saveSettings(); });
  dom.setReduced.addEventListener("change", () => { settings.reducedMotion = dom.setReduced.checked; applySettings(); saveSettings(); });

  // ============================================================
  // SCARABS + INVENTORY
  // ============================================================
  function updateScarabHud() {
    const got = world.scarabs.filter((s) => s.collected).length;
    dom.scarabCount.textContent = got + " / " + world.scarabs.length;
  }
  function checkScarabPickup() {
    world.scarabs.forEach((s) => {
      if (s.collected) return;
      const dx = camera.position.x - s.root.position.x, dz = camera.position.z - s.root.position.z;
      if (dx * dx + dz * dz < 2.6 * 2.6) {
        s.collected = true; s.root.setEnabled(false);
        Sound.lightUp();
        updateScarabHud();
        const got = world.scarabs.filter((x) => x.collected).length;
        toast("Sacred Scarab found!  (" + got + "/" + world.scarabs.length + ")", 1800);
        renderObjectives(); renderQuests();
        saveGame();
        if (currentOverlay === "inventory") buildInventory();
      }
    });
  }
  function buildInventory() {
    const total = world.scarabs.length, got = world.scarabs.filter((s) => s.collected).length;
    dom.invScarabs.innerHTML = "";
    for (let i = 0; i < total; i++) {
      const slot = document.createElement("div");
      slot.className = "inv-slot " + (i < got ? "filled" : "empty");
      slot.textContent = i < got ? "🪲" : "";
      dom.invScarabs.appendChild(slot);
    }
    dom.invCompanions.innerHTML = "";
    if (state.companions.length === 0) {
      const n = document.createElement("div"); n.className = "inv-empty-note";
      n.textContent = "None yet — solve frescoes to awaken allies."; dom.invCompanions.appendChild(n);
    } else {
      state.companions.forEach(() => {
        const slot = document.createElement("div"); slot.className = "inv-slot filled"; slot.textContent = "🧍";
        dom.invCompanions.appendChild(slot);
      });
    }
  }

  // ============================================================
  // SAVE / LOAD
  // ============================================================
  const SAVE_KEY = "wotf_save";
  const findDef = (id) => muralDefs.find((d) => d.id === id);
  function hasSave() { return !!localStorage.getItem(SAVE_KEY); }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
  function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } }
  function saveGame() {
    if (!state.started) return;
    const data = {
      v: 1,
      obj: { door: !!state.objectives.door, light: !!state.objectives.light, barque: !!state.objectives.barque, boss: !!state.objectives.boss, treasure: !!state.objectives.treasure },
      solved: { nile: !!(findDef("nile") || {}).solved, climb: !!(findDef("climb") || {}).solved, boat: !!(findDef("boat") || {}).solved },
      companions: state.companions.map((c) => c.colors || {}),
      quests: state.quests,
      potions: state.potions,
      codex: state.codex,
      scrolls: world.scrolls.filter((s) => s.taken).map((s) => s.id),
      weapons: state.weapons, weapon: state.weapon,
      jars: world.jars.filter((j) => j.used).map((j) => j.id),
      weaponsTaken: world.weaponPickups.filter((w) => w.taken).map((w) => w.id),
      scarabs: world.scarabs.filter((s) => s.collected).map((s) => s.id),
      cam: { p: [camera.position.x, camera.position.y, camera.position.z], r: [camera.rotation.x, camera.rotation.y, camera.rotation.z] },
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {}
  }
  function applyLoad(d) {
    if (!d) return;
    state.objectives = { door: !!d.obj.door, light: !!d.obj.light, barque: !!d.obj.barque, boss: !!d.obj.boss, treasure: !!d.obj.treasure };
    ["nile", "climb", "boat"].forEach((id) => { const def = findDef(id); if (def && d.solved && d.solved[id]) def.solved = true; });
    if (state.objectives.door) { door.position.y = 6.2; door.checkCollisions = false; }
    if (state.objectives.light) { torches.forEach((t) => { t.light.intensity = 1.4; }); world.hemi.intensity = 0.8; }
    if (d.solved && d.solved.boat && world.boat3D) { world.boat3D.position.x = world.boatFar.x; world.boat3D.position.z = world.boatFar.z; }
    if (d.obj.boss) { const a = findDef("anubis"); if (a) a.mesh.material.emissiveColor = new B.Color3(0.3, 0.12, 0.04); }
    if (d.obj.boss && !d.obj.treasure) spawnTreasure();
    if (d.quests) state.quests = Object.assign({ khufu: "unstarted" }, d.quests);
    state.potions = d.potions || 0;
    state.codex = d.codex || [];
    (d.scrolls || []).forEach((id) => { const s = world.scrolls.find((x) => x.id === id); if (s) { s.taken = true; s.root.setEnabled(false); } });
    if (d.weapons && d.weapons.length) state.weapons = d.weapons.slice();
    if (d.weapon && state.weapons.indexOf(d.weapon) >= 0) state.weapon = d.weapon;
    (d.weaponsTaken || []).forEach((id) => { const w = world.weaponPickups.find((x) => x.id === id); if (w) { w.taken = true; w.root.setEnabled(false); } });
    (d.jars || []).forEach((id) => { const j = world.jars.find((x) => x.id === id); if (j) { j.used = true; j.root.setEnabled(false); } });
    (d.companions || []).forEach((col) => spawnCompanion(col));
    (d.scarabs || []).forEach((id) => { const s = world.scarabs.find((x) => x.id === id); if (s) { s.collected = true; s.root.setEnabled(false); } });
    if (d.cam) { camera.position = new B.Vector3(d.cam.p[0], d.cam.p[1], d.cam.p[2]); camera.rotation = new B.Vector3(d.cam.r[0], d.cam.r[1], d.cam.r[2]); }
    updateScarabHud();
    renderObjectives();
  }

  // ============================================================
  // SCREEN / MENU FLOW
  // ============================================================
  const screens = ["splash", "menu", "settings", "credits", "pause", "inventory", "victory", "map", "quests", "codex"];
  function showScreen(id) { screens.forEach((s) => dom[s].classList.toggle("hidden", s !== id)); }
  let settingsReturn = "menu";
  let currentOverlay = null; // "pause" | "inventory" | null (in-game overlays)

  function openSettings(ret) { settingsReturn = ret; bindSettingsUI(); showScreen("settings"); }

  function showMenu() {
    dom.btnContinue.style.display = hasSave() ? "block" : "none";
    showScreen("menu");
  }
  function runIntro() {
    applySettings();
    updateScarabHud();
    if (sessionStorage.getItem("wotf_skipIntro")) { showMenu(); return; }
    showScreen("splash");
    setTimeout(() => { sessionStorage.setItem("wotf_skipIntro", "1"); showMenu(); }, 3800);
  }

  function startGame(saveData) {
    if (state.started) return;
    state.started = true;
    Sound.init();
    applySettings();
    showScreen(null);
    currentOverlay = null;
    document.body.classList.add("playing");
    scene.activeCamera = camera;
    camera.position = world.spawn.clone();
    camera.attachControl(canvas, true);
    flashSpot.setEnabled(true);
    dom.crosshair.style.display = "block";
    if (saveData) applyLoad(saveData); else updateScarabHud();
    state.health = state.maxHealth; updateHealthHud();
    equipWeapon(state.weapon); showHeld(true);
    spawnEnemies();
    spawnNPCs();
    renderObjectives();
    showTouch(isTouch);
    setInstr(defaultInstr());
    if (!isTouch) setTimeout(() => canvas.requestPointerLock && canvas.requestPointerLock(), 60);
  }

  // in-game overlays (pause / inventory) share the freeze + pointer logic
  function openOverlay(name) {
    currentOverlay = name; state.paused = true;
    if (name === "inventory") buildInventory();
    showScreen(name);
    document.exitPointerLock && document.exitPointerLock();
  }
  function closeOverlay() {
    currentOverlay = null; state.paused = false;
    showScreen(null);
    if (!isTouch) setTimeout(() => canvas.requestPointerLock && canvas.requestPointerLock(), 60);
  }
  function pauseGame() {
    if (!state.started || state.paused || state.mode === "2d") return;
    openOverlay("pause");
  }
  function resumeGame() { if (currentOverlay) { saveGame(); closeOverlay(); } }
  function toggleInventory() {
    if (!state.started || state.mode === "2d") return;
    if (currentOverlay === "inventory") closeOverlay();
    else if (!currentOverlay) openOverlay("inventory");
  }

  // wire buttons
  dom.btnContinue.addEventListener("click", () => startGame(loadSave()));
  dom.btnPlay.addEventListener("click", () => { clearSave(); startGame(null); });
  dom.btnSettings.addEventListener("click", () => openSettings("menu"));
  dom.btnCredits.addEventListener("click", () => showScreen("credits"));
  dom.btnSettingsBack.addEventListener("click", () => showScreen(settingsReturn === "pause" ? "pause" : "menu"));
  dom.btnCreditsBack.addEventListener("click", () => showScreen("menu"));
  dom.btnResume.addEventListener("click", resumeGame);
  dom.btnPauseSettings.addEventListener("click", () => openSettings("pause"));
  dom.btnMainMenu.addEventListener("click", () => { saveGame(); sessionStorage.setItem("wotf_skipIntro", "1"); location.reload(); });
  dom.btnInvClose.addEventListener("click", closeOverlay);
  dom.btnVictoryMenu.addEventListener("click", () => { sessionStorage.setItem("wotf_skipIntro", "1"); location.reload(); });
  dom.btnMapClose.addEventListener("click", closeOverlay);
  dom.minimap.addEventListener("click", toggleMap);
  dom.btnQuestsClose.addEventListener("click", closeOverlay);
  dom.btnCodexClose.addEventListener("click", closeOverlay);
  dom.tcMap.addEventListener("touchstart", (e) => { e.preventDefault(); toggleMap(); }, { passive: false });

  // first user gesture anywhere enables audio (autoplay policy)
  window.addEventListener("pointerdown", () => Sound.init(), { once: true });

  runIntro();

  console.log("%c[Whispers of the Fresco] low-poly world ready — Babylon.js",
    "color:#4ade80;font-weight:bold");
})();
