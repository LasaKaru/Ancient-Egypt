/* ============================================================
   game.js — Whispers of the Fresco
   First/second-person dual-perspective Egyptian puzzle-adventure.
   Engine: Babylon.js (chosen for FreeCamera FPS, ortho switching,
   ray picking, parenting to rotated walls, GUI, and easy 2D-in-3D).

   Depends on: art.js, audio.js, temple.js  (loaded before this file)
   ============================================================ */
(function () {
  "use strict";

  const B = BABYLON;
  const canvas = document.getElementById("renderCanvas");
  const engine = new B.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new B.Scene(engine);
  scene.collisionsEnabled = true;
  scene.gravity = new B.Vector3(0, -0.4, 0);
  scene.clearColor = B.Color3.FromHexString("#1a1208");
  scene.fogMode = B.Scene.FOGMODE_EXP2;
  scene.fogColor = B.Color3.FromHexString("#3a2a14");
  scene.fogDensity = 0.018;

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

  // ============================================================
  // CAMERA — first-person FreeCamera
  // ============================================================
  const camera = new B.FreeCamera("player", new B.Vector3(0, 1.7, -9), scene);
  camera.attachControl(canvas, true);
  camera.speed = 0.28;
  camera.angularSensibility = 2800;
  camera.minZ = 0.05;
  camera.checkCollisions = true;
  camera.applyGravity = false;
  camera.ellipsoid = new B.Vector3(0.5, 0.85, 0.5);
  camera.keysUp = [87, 38];    // W / Up
  camera.keysDown = [83, 40];  // S / Down
  camera.keysLeft = [65, 37];  // A / Left
  camera.keysRight = [68, 39]; // D / Right

  // ============================================================
  // LIGHTING
  // ============================================================
  const hemi = new B.HemisphericLight("hemi", new B.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.45;
  hemi.groundColor = new B.Color3(0.25, 0.18, 0.1);
  hemi.diffuse = new B.Color3(0.9, 0.8, 0.62);

  // ============================================================
  // TEMPLE
  // ============================================================
  const temple = Temple.build(scene, B);
  const { walls, torches, ROOM } = temple;

  // Sealed door (blocks the passage in the back-right corner)
  const door = B.MeshBuilder.CreateBox("door", { width: 2.4, height: 4, depth: 0.5 }, scene);
  door.position = new B.Vector3(5.5, 2, ROOM.d / 2 - 0.4);
  const doorMat = new B.StandardMaterial("doorMat", scene);
  doorMat.diffuseTexture = Art.glyphPanelTexture(B, scene, "door");
  doorMat.specularColor = new B.Color3(0.05, 0.05, 0.05);
  door.material = doorMat;
  door.checkCollisions = true;

  // ============================================================
  // GUI (Babylon fullscreen UI for the in-world "press E" prompt halo)
  // ============================================================
  // We use DOM for most UI; keep a light Babylon layer for crispness if needed.

  // ============================================================
  // GAME STATE
  // ============================================================
  const state = {
    started: false,
    mode: "3d",            // "3d" | "2d" | "boss"
    currentMural: null,
    paintedChar: null,
    savedCam: null,
    move2D: { left: false, right: false },
    companions: [],
    boss: null,
    objectives: {
      door: false,
      light: false,
      boss: false,
    },
  };

  // ============================================================
  // PAINTING / PUZZLE DEFINITIONS
  // ============================================================
  // Each mural is a plane parented to a wall; local +X runs horizontally.
  const muralDefs = [
    {
      id: "nile",
      title: "Daily Life on the Nile",
      scene: "nile",
      char: "worker",
      wall: walls.backWall,
      local: new B.Vector3(-3.5, 0.2, 0.03),
      size: { w: 6, h: 3.2 },
      puzzle: "reachRight",
      hint: "Walk the worker to the far right to haul the rope that lifts the door.",
    },
    {
      id: "sun",
      title: "The Journey of Ra",
      scene: "sun",
      char: "priest",
      wall: walls.backWall,
      local: new B.Vector3(3.5, 0.2, 0.03),
      size: { w: 6, h: 3.2 },
      puzzle: "reachRight",
      hint: "Carry the sun-disk to the eastern horizon to flood the temple with light.",
    },
    {
      id: "anubis",
      title: "The Guardian of the Dead",
      scene: "anubis",
      char: "anubis",
      wall: walls.leftWall,
      local: new B.Vector3(0, 0.4, 0.03),
      size: { w: 5, h: 3.6 },
      puzzle: "boss",
      gated: true, // requires door + light first
      hint: "The guardian stirs. Press E to face Anubis.",
    },
  ];

  const murals = [];
  muralDefs.forEach((def) => {
    const m = B.MeshBuilder.CreatePlane("mural_" + def.id, {
      width: def.size.w, height: def.size.h, sideOrientation: B.Mesh.DOUBLESIDE,
    }, scene);
    m.parent = def.wall;
    m.position = def.local.clone();
    const mat = new B.StandardMaterial("muralMat_" + def.id, scene);
    mat.diffuseTexture = Art.muralTexture(B, scene, def);
    mat.specularColor = new B.Color3(0.12, 0.12, 0.12);
    mat.emissiveColor = new B.Color3(0.08, 0.06, 0.03);
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
    dom.toast.textContent = t;
    dom.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.remove("show"), ms || 2200);
  }

  const OBJ_TEXT = {
    door: "Bring the Nile mural to life and open the sealed door",
    light: "Restore Ra's light to the darkened temple",
    boss: "Awaken and defeat the guardian Anubis",
  };
  function renderObjectives() {
    const order = ["door", "light", "boss"];
    let activeSet = false;
    dom.objList.innerHTML = "";
    order.forEach((k) => {
      const li = document.createElement("li");
      li.textContent = OBJ_TEXT[k];
      if (state.objectives[k]) li.className = "done";
      else if (!activeSet) { li.className = "active"; activeSet = true; }
      dom.objList.appendChild(li);
    });
  }

  // ============================================================
  // GENERIC TWEEN
  // ============================================================
  const tweens = [];
  function tweenPos(mesh, target, dur, onDone) {
    tweens.push({ mesh, from: mesh.position.clone(), to: target.clone(), t: 0, dur, onDone });
  }
  function updateTweens(dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOutQuad
      tw.mesh.position = B.Vector3.Lerp(tw.from, tw.to, e);
      if (k >= 1) { tweens.splice(i, 1); if (tw.onDone) tw.onDone(); }
    }
  }

  // ============================================================
  // ENTER / EXIT 2D PAINTING MODE
  // ============================================================
  function canActivate(def) {
    if (def.gated) return state.objectives.door && state.objectives.light;
    return true;
  }

  function enter2DMode(mural) {
    const def = mural.metadata.def;
    if (state.mode !== "3d") return;

    if (def.puzzle === "boss") {
      if (!canActivate(def)) {
        toast("The guardian sleeps…", 1800);
        setInstr("Restore the light and open the door before the guardian will wake.");
        return;
      }
      startBossFight(def);
      return;
    }

    Sound.whoosh();
    state.mode = "2d";
    state.currentMural = mural;
    document.exitPointerLock && document.exitPointerLock();

    state.savedCam = {
      position: camera.position.clone(),
      rotation: camera.rotation.clone(),
      mode: camera.mode,
    };
    camera.detachControl();
    camera.mode = B.Camera.ORTHOGRAPHIC_CAMERA;

    // Place ortho camera squarely in front of the mural, on the room side.
    const wpos = mural.getAbsolutePosition();
    const toCenter = new B.Vector3(0, wpos.y, 0).subtract(wpos);
    toCenter.y = 0;
    if (toCenter.lengthSquared() < 0.001) toCenter.set(0, 0, -1);
    toCenter.normalize();
    camera.position = wpos.add(toCenter.scale(4));
    camera.setTarget(wpos);

    const half = def.size.h * 0.62;
    const aspect = engine.getAspectRatio(camera);
    camera.orthoTop = half;
    camera.orthoBottom = -half;
    camera.orthoLeft = -half * aspect;
    camera.orthoRight = half * aspect;

    // Spawn the living painted figure (parented to the wall, flat on surface).
    if (state.paintedChar) state.paintedChar.dispose();
    const ch = B.MeshBuilder.CreatePlane("paintedChar", { width: def.size.h * 0.32, height: def.size.h * 0.6 }, scene);
    ch.parent = mural.parent;
    const startLocal = mural.position.clone();
    startLocal.x -= def.size.w * 0.32;
    startLocal.y -= def.size.h * 0.16;
    startLocal.z += 0.05;
    ch.position = startLocal;
    const cmat = new B.StandardMaterial("pcMat", scene);
    cmat.diffuseTexture = Art.characterTexture(B, scene, def.char);
    cmat.diffuseTexture.hasAlpha = true;
    cmat.useAlphaFromDiffuseTexture = true;
    cmat.specularColor = new B.Color3(0, 0, 0);
    cmat.emissiveColor = new B.Color3(0.35, 0.3, 0.2);
    cmat.backFaceCulling = false;
    ch.material = cmat;
    ch.metadata = {
      minX: mural.position.x - def.size.w * 0.4,
      maxX: mural.position.x + def.size.w * 0.4,
      baseY: startLocal.y,
      phase: 0,
    };
    state.paintedChar = ch;

    setInstr(isTouch
      ? "◀ ▶ move the figure   •   ✕ exits the painting"
      : "← → (or A/D) move the painted figure   •   E exits the painting");
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

  // ============================================================
  // 2D MOVEMENT + PUZZLE SOLVE
  // ============================================================
  let stepCooldown = 0;
  function update2D(dt) {
    const ch = state.paintedChar;
    if (!ch) return;
    const meta = ch.metadata;
    const speed = 1.6 * dt;
    let moved = false;
    if (state.move2D.left) { ch.position.x = Math.max(meta.minX, ch.position.x - speed); moved = true; }
    if (state.move2D.right) { ch.position.x = Math.min(meta.maxX, ch.position.x + speed); moved = true; }

    // walking bob + step sfx
    if (moved) {
      meta.phase += dt * 10;
      ch.position.y = meta.baseY + Math.abs(Math.sin(meta.phase)) * 0.05;
      stepCooldown -= dt;
      if (stepCooldown <= 0) { Sound.step(); stepCooldown = 0.28; }
    }

    // Puzzle: reach the far right edge
    const def = state.currentMural.metadata.def;
    if (def.puzzle === "reachRight" && ch.position.x > meta.maxX - 0.05 && !def.solved) {
      solvePuzzle(def);
    }
  }

  function solvePuzzle(def) {
    def.solved = true;
    Sound.success();

    if (def.id === "nile") {
      // open the sealed door
      tweenPos(door, door.position.add(new B.Vector3(0, 4.2, 0)), 1.6, () => { door.checkCollisions = false; });
      Sound.stoneSlide();
      state.objectives.door = true;
      toast("The sealed door grinds open!", 2400);
      peelOff(def, "worker"); // worker steps out as a 3D ally
    } else if (def.id === "sun") {
      lightTemple();
      state.objectives.light = true;
      toast("Ra's light floods the temple!", 2400);
      peelOff(def, "priest");
    }
    renderObjectives();
    setTimeout(() => {
      setInstr("The painting is complete. Press " + (isTouch ? "✕" : "E") + " to return to the temple.");
    }, 600);

    if (state.objectives.door && state.objectives.light) {
      setTimeout(() => toast("A growl echoes from the left wall…", 2600), 2600);
    }
  }

  function lightTemple() {
    Sound.lightUp();
    hemi.intensity = 0.45;
    const target = 1.0;
    torches.forEach((tc) => {
      // ramp torch intensity over ~1.5s
      const start = tc.light.intensity;
      const startT = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - startT) / 1500);
        tc.light.intensity = start + (1.4 - start) * k;
        hemi.intensity = 0.45 + 0.35 * k;
        if (k < 1) requestAnimationFrame(step);
      };
      step();
    });
    scene.fogDensity = 0.01;
  }

  // ============================================================
  // PEEL-OFF — painted figure detaches and becomes a 3D follower
  // ============================================================
  function peelOff(def, kind) {
    // a billboarded plane that walks out of the wall and follows the player
    const ally = B.MeshBuilder.CreatePlane("ally_" + kind, { width: 0.9, height: 1.8 }, scene);
    ally.billboardMode = B.Mesh.BILLBOARDMODE_Y;
    const wpos = (state.paintedChar ? state.paintedChar.getAbsolutePosition() : def.mesh.getAbsolutePosition()).clone();
    ally.position = wpos.clone();
    const mat = new B.StandardMaterial("allyMat_" + kind, scene);
    mat.diffuseTexture = Art.characterTexture(B, scene, kind);
    mat.diffuseTexture.hasAlpha = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.specularColor = new B.Color3(0, 0, 0);
    mat.emissiveColor = new B.Color3(0.25, 0.2, 0.12);
    mat.backFaceCulling = false;
    ally.material = mat;

    // step out toward room interior
    const out = new B.Vector3(0, 0.9, 0).subtract(new B.Vector3(wpos.x, 0, wpos.z));
    out.y = 0; out.normalize();
    const landing = new B.Vector3(wpos.x, 0.9, wpos.z).add(out.scale(2));
    tweenPos(ally, landing, 1.2);

    state.companions.push({ mesh: ally, offset: 1.8 + state.companions.length * 0.7, bob: Math.random() * 6 });
  }

  function updateCompanions(dt) {
    const t = performance.now() * 0.003;
    state.companions.forEach((c, i) => {
      if (tweens.some((tw) => tw.mesh === c.mesh)) return; // still emerging
      // desired spot: behind+beside the player on the floor
      const back = camera.getDirection(B.Axis.Z).scale(-c.offset);
      const side = camera.getDirection(B.Axis.X).scale((i % 2 ? 1 : -1) * 0.9);
      const want = camera.position.add(back).add(side);
      want.y = 0.9 + Math.sin(t + c.bob) * 0.05;
      c.mesh.position = B.Vector3.Lerp(c.mesh.position, want, Math.min(1, dt * 2));
    });
  }

  // ============================================================
  // BOSS FIGHT — the guardian Anubis
  // ============================================================
  function startBossFight(def) {
    if (state.boss) return;
    Sound.bossRoar();
    state.mode = "boss";
    toast("THE GUARDIAN AWAKENS", 2600);
    def.mesh.material.emissiveColor = new B.Color3(0.5, 0.2, 0.05);

    const boss = B.MeshBuilder.CreatePlane("boss", { width: 3.0, height: 4.5 }, scene);
    boss.billboardMode = B.Mesh.BILLBOARDMODE_Y;
    boss.position = new B.Vector3(0, 2.3, 5.5);
    const mat = new B.StandardMaterial("bossMat", scene);
    mat.diffuseTexture = Art.characterTexture(B, scene, "anubis");
    mat.diffuseTexture.hasAlpha = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.specularColor = new B.Color3(0, 0, 0);
    mat.emissiveColor = new B.Color3(0.8, 0.4, 0.1);
    mat.backFaceCulling = false;
    boss.material = mat;

    const glow = new B.PointLight("bossGlow", boss.position.clone(), scene);
    glow.diffuse = new B.Color3(1, 0.5, 0.1);
    glow.intensity = 1.6; glow.range = 14;

    state.boss = {
      mesh: boss, mat, glow, def,
      hp: 8, maxHp: 8,
      hitCd: 0, attackCd: 3, t: 0,
    };

    dom.bossBar.style.display = "block";
    updateBossBar();
    setInstr(isTouch
      ? "Tap ⚔ to strike the guardian while it is in view!"
      : "Click (or SPACE) to strike the guardian with Ra's light!");
    // pointer lock for aiming on desktop
    if (!isTouch && document.pointerLockElement !== canvas) canvas.requestPointerLock();
  }

  function updateBossBar() {
    const b = state.boss;
    dom.bossFill.style.width = Math.max(0, (b.hp / b.maxHp) * 100) + "%";
  }

  function hitBoss() {
    const b = state.boss;
    if (!b || b.hitCd > 0 || b.hp <= 0) return;
    // must be roughly looking at the boss and within range
    const ray = camera.getForwardRay(20);
    const pick = scene.pickWithRay(ray, (m) => m === b.mesh);
    const dist = B.Vector3.Distance(camera.position, b.mesh.position);
    if (!pick.hit || dist > 14) {
      setInstr("Face the guardian to strike it!");
      return;
    }
    b.hp -= 1;
    b.hitCd = 0.35;
    Sound.hit();
    updateBossBar();
    // flash
    b.mat.emissiveColor = new B.Color3(1, 1, 0.8);
    setTimeout(() => { if (state.boss) b.mat.emissiveColor = new B.Color3(0.8, 0.4, 0.1); }, 90);
    if (b.hp <= 0) defeatBoss();
  }

  function defeatBoss() {
    const b = state.boss;
    Sound.bossDown();
    state.objectives.boss = true;
    renderObjectives();
    toast("THE GUARDIAN IS VANQUISHED", 3200);
    dom.bossBar.style.display = "none";

    // dissolve: shrink + fade glow
    const startT = performance.now();
    const anim = () => {
      const k = Math.min(1, (performance.now() - startT) / 1400);
      b.mesh.scaling.setAll(1 - k);
      b.glow.intensity = 1.6 * (1 - k);
      b.mat.emissiveColor = new B.Color3(0.8 * (1 - k) + k, 0.4, 0.1);
      if (k < 1) requestAnimationFrame(anim);
      else {
        b.mesh.dispose(); b.glow.dispose();
        state.boss = null;
        state.mode = "3d";
        setInstr("You have cleansed the temple. Explore freely — the path beyond the door is open.");
        setTimeout(() => toast("✦  TEMPLE CLEANSED  ✦", 3600), 1200);
      }
    };
    anim();
  }

  function updateBoss(dt) {
    const b = state.boss;
    if (!b) return;
    b.t += dt;
    b.hitCd = Math.max(0, b.hitCd - dt);
    // bob + drift toward player horizontally
    b.mesh.position.y = 2.3 + Math.sin(b.t * 2) * 0.15;
    const toP = camera.position.subtract(b.mesh.position); toP.y = 0;
    const d = toP.length();
    if (d > 5) {
      toP.normalize();
      b.mesh.position.addInPlace(toP.scale(dt * 0.6));
    }
    b.glow.position.copyFrom(b.mesh.position);
    b.glow.intensity = 1.4 + Math.sin(b.t * 6) * 0.3;

    // telegraphed roar (cosmetic pressure)
    b.attackCd -= dt;
    if (b.attackCd <= 0) {
      b.attackCd = 4 + Math.random() * 2;
      Sound.bossRoar();
      scene.fogColor = B.Color3.FromHexString("#5a1f0a");
      setTimeout(() => { scene.fogColor = B.Color3.FromHexString("#3a2a14"); }, 500);
    }
  }

  // ============================================================
  // INTERACTION RAY (3D) + CROSSHAIR FEEDBACK
  // ============================================================
  function lookedAtInteractive() {
    const ray = camera.getForwardRay(7);
    const pick = scene.pickWithRay(ray, (m) => m.metadata && m.metadata.interactive);
    return pick.hit ? pick.pickedMesh : null;
  }

  function defaultInstr() {
    return isTouch
      ? "Drag to look • ◀ ▶ move • ⚔ interact with murals"
      : "Click to lock mouse • WASD to move • look at a mural and press E";
  }

  // ============================================================
  // INPUT
  // ============================================================
  // Keyboard
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
    if (state.mode === "boss") {
      if (key === " " || key === "spacebar") hitBoss();
      return;
    }
    // 3d
    if (key === "e") {
      const m = lookedAtInteractive();
      if (m) enter2DMode(m);
    }
  });

  // Mouse: click to lock; in boss mode, click = strike
  scene.onPointerObservable.add((pi) => {
    if (pi.type !== B.PointerEventTypes.POINTERDOWN) return;
    if (state.mode === "boss") { hitBoss(); return; }
    if (state.mode === "3d" && document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
    }
  });

  // Touch controls
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
  let lastT = performance.now();
  engine.runRenderLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    scene.render();
    if (!state.started) return;

    updateTweens(dt);
    updateCompanions(dt);

    if (state.mode === "2d") {
      update2D(dt);
    } else if (state.mode === "boss") {
      updateBoss(dt);
    } else {
      // 3d: crosshair feedback + contextual hint
      const m = lookedAtInteractive();
      if (m) {
        dom.crosshair.classList.add("active");
        const def = m.metadata.def;
        if (def.puzzle === "boss" && !canActivate(def)) {
          setInstr("The guardian sleeps. Restore the light and open the door first.");
        } else {
          setInstr((isTouch ? "Tap ⚔" : "Press E") + " to enter “" + def.title + "”");
        }
      } else {
        dom.crosshair.classList.remove("active");
        setInstr(defaultInstr());
      }
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
    if (!isTouch) canvas.requestPointerLock && setTimeout(() => canvas.requestPointerLock(), 50);
  }
  dom.startBtn.addEventListener("click", startGame);

  console.log("%c[Whispers of the Fresco] ready — Babylon.js dual-perspective prototype",
    "color:#4ade80;font-weight:bold");
})();
