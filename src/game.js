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
  const dom = {
    instructions: document.getElementById("instructions"),
    objList: document.getElementById("objList"),
    crosshair: document.getElementById("crosshair"),
    overlay: document.getElementById("overlay"),
    startBtn: document.getElementById("startBtn"),
    toast: document.getElementById("toast"),
    bossBar: document.getElementById("bossBar"),
    bossFill: document.getElementById("bossFill"),
    touch: document.getElementById("touchControls"),
    tcLeft: document.getElementById("tcLeft"),
    tcRight: document.getElementById("tcRight"),
    tcAction: document.getElementById("tcAction"),
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
    mode: "3d",
    currentMural: null,
    paintedChar: null,
    patch: null,
    savedCam: null,
    move2D: { neg: false, pos: false },
    cam2D: null,
    companions: [],
    bossProps: [],
    boss: null,
    objectives: { door: false, light: false, boss: false },
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
  const OBJ_TEXT = {
    door: "Bring the Nile mural to life and open the sealed door",
    light: "Restore Ra's light to the darkened temple",
    boss: "Awaken and defeat the guardian Anubis",
  };
  function renderObjectives() {
    let activeSet = false;
    dom.objList.innerHTML = "";
    ["door", "light", "boss"].forEach((k) => {
      const li = document.createElement("li");
      li.textContent = OBJ_TEXT[k];
      if (state.objectives[k]) li.className = "done";
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
    flashlight.setEnabled(false); flashSpot.setEnabled(false);

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
    flashlight.setEnabled(true); flashSpot.setEnabled(true);
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
      // bonus puzzle — the barque has already sailed across via the live link
      toast("The sacred barque reaches the far shore!", 2600);
      peelOff(def, { cloth: "#efe6cf", skin: "#c8854f", hair: "#2c1d0f" });
    }
    renderObjectives();
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
      api, offset: 2.2 + state.companions.length * 0.8, bob: Math.random() * 6,
      peel: { t: 0, dur: 1.4, from, to },
    });
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
  function startBossFight(def) {
    if (state.boss) return;
    Sound.bossRoar();
    state.mode = "boss";
    toast("THE GUARDIAN AWAKENS", 2600);
    // fiery glow on the guardian's fresco
    def.mesh.material.emissiveColor = new B.Color3(0.7, 0.25, 0.05);
    // dim the hall for the violet, candle-lit reveal
    world.hemi.intensity = 0.28;

    const g = LP.guardian();
    const arena = new B.Vector3(0, 0, 5);
    g.root.position.set(arena.x, heightAt(arena.x, arena.z), arena.z);
    state.boss = { g, hp: 10, maxHp: 10, hitCd: 0, attackCd: 3.5, t: 0 };

    // ring of floor candles around the arena (emissive only, to stay in light budget)
    const R = 4.4;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const px = arena.x + Math.cos(a) * R, pz = arena.z + Math.sin(a) * R;
      const c = LP.candle(new B.Vector3(px, heightAt(px, pz), pz), 0.4 + Math.random() * 0.2, false);
      state.bossProps.push(c.root);
    }

    dom.bossBar.style.display = "block";
    updateBossBar();
    setInstr(isTouch ? "Tap ⚔ to strike the guardian while it is in view!"
                     : "Click (or SPACE) to strike the guardian with Ra's light!");
    if (!isTouch && document.pointerLockElement !== canvas) canvas.requestPointerLock();
  }

  function updateBossBar() {
    dom.bossFill.style.width = Math.max(0, (state.boss.hp / state.boss.maxHp) * 100) + "%";
  }

  function hitBoss() {
    const b = state.boss; if (!b || b.hitCd > 0 || b.hp <= 0) return;
    const ray = camera.getForwardRay(24);
    const pick = scene.pickWithRay(ray, (m) => m.metadata && m.metadata.bossHit);
    const dist = B.Vector3.Distance(camera.position, b.g.root.position);
    if (!pick.hit || dist > 16) { setInstr("Face the guardian to strike it!"); return; }
    b.hp -= 1; b.hitCd = 0.32; Sound.hit(); updateBossBar();
    b.g.eyeMat.emissiveColor = new B.Color3(1, 1, 0.8);
    setTimeout(() => { if (state.boss) b.g.eyeMat.emissiveColor = B.Color3.FromHexString("#ff8a1a").scale(1.4); }, 90);
    if (b.hp <= 0) defeatBoss();
  }

  function defeatBoss() {
    const b = state.boss; Sound.bossDown();
    state.objectives.boss = true; renderObjectives();
    toast("THE GUARDIAN IS VANQUISHED", 3200);
    dom.bossBar.style.display = "none";
    const startT = performance.now();
    const anim = () => {
      const k = Math.min(1, (performance.now() - startT) / 1400);
      b.g.root.scaling.setAll(1 - k);
      b.g.glow.intensity = 1.8 * (1 - k);
      if (k < 1) requestAnimationFrame(anim);
      else {
        b.g.root.dispose();
        state.bossProps.forEach((p) => p.dispose());
        state.bossProps = [];
        world.hemi.intensity = 0.8; // restore light
        state.boss = null; state.mode = "3d";
        setInstr("You have cleansed the temple. Explore freely — the path beyond is open.");
        setTimeout(() => toast("✦  TEMPLE CLEANSED  ✦", 3600), 1000);
      }
    };
    anim();
  }

  function updateBoss(dt) {
    const b = state.boss; if (!b) return;
    b.t += dt; b.hitCd = Math.max(0, b.hitCd - dt);
    b.g.update(dt);
    const ground = heightAt(b.g.root.position.x, b.g.root.position.z);
    b.g.root.position.y = ground + Math.sin(b.t * 2) * 0.15;
    const toP = camera.position.subtract(b.g.root.position); toP.y = 0;
    const d = toP.length();
    if (d > 5) { toP.normalize(); b.g.root.position.addInPlace(toP.scale(dt * 0.8));
      b.g.root.rotation.y = Math.atan2(toP.x, toP.z); }
    b.attackCd -= dt;
    if (b.attackCd <= 0) {
      b.attackCd = 4 + Math.random() * 2; Sound.bossRoar();
      scene.fogColor = B.Color3.FromHexString("#7a2a12");
      setTimeout(() => { scene.fogColor = B.Color3.FromHexString("#caa07a"); }, 500);
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
    const down = kb.type === B.KeyboardEventTypes.KEYDOWN;
    const key = kb.event.key.toLowerCase();
    if (state.mode === "2d") {
      if (key === "arrowleft" || key === "a" || key === "arrowdown" || key === "s") state.move2D.neg = down;
      if (key === "arrowright" || key === "d" || key === "arrowup" || key === "w") state.move2D.pos = down;
      if (down && key === "e") exit2DMode();
      return;
    }
    if (!down) return;
    if (state.mode === "boss") { if (key === " " || key === "spacebar") hitBoss(); return; }
    if (key === "e") { const m = lookedAtInteractive(); if (m) enter2DMode(m); }
  });

  scene.onPointerObservable.add((pi) => {
    if (pi.type !== B.PointerEventTypes.POINTERDOWN) return;
    if (state.mode === "boss") { hitBoss(); return; }
    if (state.mode === "3d" && document.pointerLockElement !== canvas) canvas.requestPointerLock();
  });

  function showTouch(show) {
    if (!isTouch) { dom.touch.classList.remove("show"); return; }
    dom.touch.classList.toggle("show", show);
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
    else if (state.mode === "boss") hitBoss();
    else { const m = lookedAtInteractive(); if (m) enter2DMode(m); }
  }, { passive: false });

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
    if (!state.started) return;
    updateTweens(dt);
    updateCompanions(dt);

    if (state.mode === "2d") { update2D(dt); return; }

    groundCamera();
    if (state.mode === "boss") { updateBoss(dt); return; }

    // 3d: crosshair + contextual hint
    const m = lookedAtInteractive();
    if (m) {
      dom.crosshair.classList.add("active");
      const def = m.metadata.def;
      if (def.puzzle === "boss" && !canActivate(def))
        setInstr("The guardian sleeps. Restore the light and open the door first.");
      else setInstr((isTouch ? "Tap ⚔" : "Press E") + " to enter “" + def.title + "”");
    } else {
      dom.crosshair.classList.remove("active");
      setInstr(defaultInstr());
    }
  });

  window.addEventListener("resize", () => engine.resize());

  // ============================================================
  // START
  // ============================================================
  function startGame() {
    if (state.started) return;
    state.started = true;
    Sound.init();
    dom.overlay.classList.add("hidden");
    dom.crosshair.style.display = "block";
    renderObjectives();
    showTouch(isTouch);
    setInstr(defaultInstr());
    if (!isTouch) setTimeout(() => canvas.requestPointerLock && canvas.requestPointerLock(), 50);
  }
  dom.startBtn.addEventListener("click", startGame);

  console.log("%c[Whispers of the Fresco] low-poly world ready — Babylon.js",
    "color:#4ade80;font-weight:bold");
})();
