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
  const { walls, torches, ROOM, heightAt } = world;

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
    savedCam: null,
    move2D: { left: false, right: false },
    companions: [],
    boss: null,
    objectives: { door: false, light: false, boss: false },
  };

  // ============================================================
  // MURALS / PUZZLES  (parented to temple walls)
  // ============================================================
  const muralDefs = [
    { id: "nile", title: "Daily Life on the Nile", scene: "nile", char: "worker",
      wall: walls.backWall, local: new B.Vector3(-3.5, 0.2, 0.03), size: { w: 6, h: 3.2 },
      puzzle: "reachRight", hint: "Walk the worker to the far side to haul the rope that lifts the eastern door to the oasis." },
    { id: "sun", title: "The Journey of Ra", scene: "sun", char: "priest",
      wall: walls.backWall, local: new B.Vector3(3.5, 0.2, 0.03), size: { w: 6, h: 3.2 },
      puzzle: "reachRight", hint: "Carry the sun-disk to the horizon to flood the temple with light." },
    { id: "anubis", title: "The Guardian of the Dead", scene: "anubis", char: "anubis",
      wall: walls.leftWall, local: new B.Vector3(0, 0.4, 0.03), size: { w: 5, h: 3.6 },
      puzzle: "boss", gated: true, hint: "The guardian stirs. Press E to face Anubis." },
  ];

  const murals = [];
  muralDefs.forEach((def) => {
    const m = B.MeshBuilder.CreatePlane("mural_" + def.id,
      { width: def.size.w, height: def.size.h, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
    m.parent = def.wall;
    m.position = def.local.clone();
    const mat = new B.StandardMaterial("muralMat_" + def.id, scene);
    mat.diffuseTexture = Art.muralTexture(B, scene, def);
    mat.specularColor = new B.Color3(0.1, 0.1, 0.1);
    mat.emissiveColor = new B.Color3(0.12, 0.1, 0.06);
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

    const wpos = mural.getAbsolutePosition();
    const toCenter = world.center.clone(); toCenter.y = wpos.y;
    toCenter.subtractInPlace(wpos); toCenter.y = 0;
    if (toCenter.lengthSquared() < 0.001) toCenter.set(0, 0, -1);
    toCenter.normalize();
    camera.position = wpos.add(toCenter.scale(4));
    camera.setTarget(wpos);
    const half = def.size.h * 0.62, aspect = engine.getAspectRatio(camera);
    camera.orthoTop = half; camera.orthoBottom = -half;
    camera.orthoLeft = -half * aspect; camera.orthoRight = half * aspect;

    if (state.paintedChar) state.paintedChar.dispose();
    const ch = B.MeshBuilder.CreatePlane("paintedChar",
      { width: def.size.h * 0.32, height: def.size.h * 0.6 }, scene);
    ch.parent = mural.parent;
    const start = mural.position.clone();
    start.x -= def.size.w * 0.32; start.y -= def.size.h * 0.16; start.z += 0.05;
    ch.position = start;
    const cmat = new B.StandardMaterial("pcMat", scene);
    cmat.diffuseTexture = Art.characterTexture(B, scene, def.char);
    cmat.diffuseTexture.hasAlpha = true;
    cmat.useAlphaFromDiffuseTexture = true;
    cmat.specularColor = new B.Color3(0, 0, 0);
    cmat.emissiveColor = new B.Color3(0.4, 0.34, 0.22);
    cmat.backFaceCulling = false;
    ch.material = cmat;
    ch.metadata = { minX: mural.position.x - def.size.w * 0.4, maxX: mural.position.x + def.size.w * 0.4,
                    baseY: start.y, phase: 0 };
    state.paintedChar = ch;

    setInstr(isTouch ? "◀ ▶ move the figure   •   ✕ exits the painting"
                     : "← → (or A/D) move the painted figure   •   E exits");
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
    if (state.paintedChar) { state.paintedChar.dispose(); state.paintedChar = null; }
    state.currentMural = null;
    state.move2D.left = state.move2D.right = false;
    showTouch(isTouch);
    setInstr(defaultInstr());
  }

  let stepCd = 0;
  function update2D(dt) {
    const ch = state.paintedChar; if (!ch) return;
    const meta = ch.metadata, speed = 1.6 * dt;
    let moved = false;
    if (state.move2D.left) { ch.position.x = Math.max(meta.minX, ch.position.x - speed); moved = true; }
    if (state.move2D.right) { ch.position.x = Math.min(meta.maxX, ch.position.x + speed); moved = true; }
    if (moved) {
      meta.phase += dt * 10;
      ch.position.y = meta.baseY + Math.abs(Math.sin(meta.phase)) * 0.05;
      stepCd -= dt; if (stepCd <= 0) { Sound.step(); stepCd = 0.28; }
    }
    const def = state.currentMural.metadata.def;
    if (def.puzzle === "reachRight" && ch.position.x > meta.maxX - 0.05 && !def.solved) solvePuzzle(def);
  }

  function solvePuzzle(def) {
    def.solved = true; Sound.success();
    if (def.id === "nile") {
      tweenPos(door, door.position.add(new B.Vector3(0, 4.2, 0)), 1.6, () => { door.checkCollisions = false; });
      Sound.stoneSlide();
      state.objectives.door = true;
      toast("The eastern door grinds open — the oasis awaits!", 2600);
      peelOff(def, { cloth: "#bb3b22", skin: "#c8854f" });
    } else if (def.id === "sun") {
      lightTemple();
      state.objectives.light = true;
      toast("Ra's light floods the temple!", 2400);
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
    const api = LP.humanoid(colors);
    const wpos = (state.paintedChar ? state.paintedChar.getAbsolutePosition() : def.mesh.getAbsolutePosition()).clone();
    api.root.position = new B.Vector3(wpos.x, heightAt(wpos.x, wpos.z), wpos.z);
    // step out toward the room interior
    const out = world.center.subtract(new B.Vector3(wpos.x, 0, wpos.z)); out.y = 0;
    if (out.lengthSquared() < 0.01) out.set(0, 0, -1);
    out.normalize();
    const land = new B.Vector3(wpos.x, 0, wpos.z).add(out.scale(2.4));
    land.y = heightAt(land.x, land.z);
    tweenPos(api.root, land, 1.2);
    state.companions.push({ api, offset: 2.2 + state.companions.length * 0.8, bob: Math.random() * 6 });
  }

  function updateCompanions(dt) {
    state.companions.forEach((c, i) => {
      const root = c.api.root;
      if (tweening(root)) { c.api.update(dt, true); root.position.y = heightAt(root.position.x, root.position.z); return; }
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
    def.mesh.material.emissiveColor = new B.Color3(0.5, 0.2, 0.05);

    const g = LP.guardian();
    g.root.position.set(0, heightAt(0, 5), 5);
    state.boss = { g, hp: 10, maxHp: 10, hitCd: 0, attackCd: 3.5, t: 0 };

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
      if (key === "arrowleft" || key === "a") state.move2D.left = down;
      if (key === "arrowright" || key === "d") state.move2D.right = down;
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
  bindHold(dom.tcLeft, () => { state.move2D.left = true; }, () => { state.move2D.left = false; });
  bindHold(dom.tcRight, () => { state.move2D.right = true; }, () => { state.move2D.right = false; });
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
