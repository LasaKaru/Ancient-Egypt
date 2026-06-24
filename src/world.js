/* ============================================================
   world.js — Builds the bigger low-poly world.
   Temple interior stays centred at the origin (so the fresco /
   mural logic in game.js keeps its wall-local frame), with the
   desert, oasis, pyramids and dunes built around it.
   Exposes global `World.build(scene) -> {...}`.
   ============================================================ */
(function (global) {
  "use strict";

  const B = BABYLON;

  // ---- height field (low-poly dunes) with flattened gameplay zones ----
  function smoothstep(a, b, x) {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  function flattenDisc(h, x, z, cx, cz, r, target) {
    const d = Math.hypot(x - cx, z - cz);
    const w = 1 - smoothstep(r * 0.6, r, d); // 1 in core, 0 outside r
    return h * (1 - w) + target * w;
  }
  // distance from point to segment (for the entrance path corridor)
  function segDist(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((px - ax) * dx + (pz - az) * dz) / len2;
    t = Math.min(1, Math.max(0, t));
    return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
  }

  function makeHeightAt() {
    return function heightAt(x, z) {
      // rolling dunes
      let h = Math.sin(x * 0.09) * 1.3 + Math.cos(z * 0.08) * 1.5 +
              Math.sin((x + z) * 0.05) * 1.1 + LP.hash(Math.round(x * 0.3), Math.round(z * 0.3)) * 0.4;
      // temple interior — flat at 0
      h = flattenDisc(h, x, z, 0, 0, 17, 0);
      // entrance plaza (south)
      h = flattenDisc(h, x, z, 0, -32, 14, 0);
      // corridor between plaza and temple door
      const dPath = segDist(x, z, 0, -32, 0, -12);
      h = h * smoothstep(4, 9, dPath); // flatten toward 0 near the path
      // oasis basin (east) sits slightly below ground for water
      h = flattenDisc(h, x, z, 38, -8, 16, -1.3);
      // ancient city district (west) — flattened ground for the streets
      h = flattenDisc(h, x, z, -34, -6, 24, 0);
      // road from the plaza out to the city
      const dRoad = segDist(x, z, -8, -22, -28, -8);
      h = h * smoothstep(3, 8, dRoad);
      return h;
    };
  }

  function build(scene) {
    LP.init(scene);
    const heightAt = makeHeightAt();

    // ---- lighting: warm dusk sun (directional) + soft ambient ----
    const sunLight = new B.DirectionalLight("sun", new B.Vector3(-0.5, -0.85, 0.4), scene);
    sunLight.intensity = 1.05;
    sunLight.diffuse = B.Color3.FromHexString("#ffe6b0");
    const hemi = new B.HemisphericLight("hemi", new B.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.55;
    hemi.diffuse = B.Color3.FromHexString("#bfa9d6");
    hemi.groundColor = B.Color3.FromHexString("#6b5436");

    scene.fogMode = B.Scene.FOGMODE_EXP2;
    scene.fogColor = B.Color3.FromHexString("#caa07a");
    scene.fogDensity = 0.0085;

    // ---- sky, sun disc, clouds ----
    LP.skydome();
    const sunMesh = LP.sun(new B.Vector3(80, 60, -90));
    [[-40, 40, -60, 2], [30, 46, -70, 2.6], [-10, 52, 40, 2.2], [55, 44, 10, 1.8]]
      .forEach((c) => LP.cloud(new B.Vector3(c[0], c[1], c[2]), c[3]));

    // ---- night + stars overlay domes (for the day/night cycle) ----
    const nightDome = B.MeshBuilder.CreateSphere("nightDome", { diameter: 592, segments: 10, sideOrientation: B.Mesh.BACKSIDE }, scene);
    const nMat = new B.StandardMaterial("nightMat", scene);
    nMat.diffuseColor = new B.Color3(0, 0, 0); nMat.emissiveColor = B.Color3.FromHexString("#0a1430");
    nMat.disableLighting = true; nMat.backFaceCulling = false; nMat.fogEnabled = false; nMat.alpha = 0;
    nightDome.material = nMat; nightDome.infiniteDistance = true; nightDome.isPickable = false;
    const starTex = new B.DynamicTexture("stars", { width: 1024, height: 512 }, scene, true);
    const sctx = starTex.getContext(); sctx.clearRect(0, 0, 1024, 512);
    for (let i = 0; i < 500; i++) { const b = Math.random(); sctx.fillStyle = `rgba(255,255,255,${0.4 + b * 0.6})`; const s = Math.random() * 2 + 0.5; sctx.fillRect(Math.random() * 1024, Math.random() * 512, s, s); }
    starTex.hasAlpha = true; starTex.update();
    const starDome = B.MeshBuilder.CreateSphere("starDome", { diameter: 584, segments: 10, sideOrientation: B.Mesh.BACKSIDE }, scene);
    const stMat = new B.StandardMaterial("starMat", scene);
    stMat.diffuseColor = new B.Color3(0, 0, 0); stMat.emissiveColor = new B.Color3(1, 1, 1);
    stMat.emissiveTexture = starTex; stMat.opacityTexture = starTex;
    stMat.disableLighting = true; stMat.backFaceCulling = false; stMat.fogEnabled = false; stMat.alpha = 0;
    starDome.material = stMat; starDome.infiniteDistance = true; starDome.isPickable = false;

    const sky = { t: 0.2 }; // 0..1 ; ~0.2 ≈ warm late-afternoon
    const C_DAY = B.Color3.FromHexString("#caa07a"), C_NIGHT = B.Color3.FromHexString("#15203f");
    function applyDayNight() {
      const ang = sky.t * Math.PI * 2, elev = Math.sin(ang);
      const day = Math.max(0, elev), night = Math.max(0, -elev), k = elev * 0.5 + 0.5;
      sunLight.intensity = 0.12 + day * 1.0;
      sunLight.diffuse = B.Color3.Lerp(B.Color3.FromHexString("#9fb4ff"), B.Color3.FromHexString("#ffe6b0"), day);
      sunLight.direction = new B.Vector3(Math.cos(ang), -Math.max(0.18, Math.abs(elev)), Math.sin(ang)).normalize();
      hemi.intensity = 0.16 + day * 0.5;
      scene.fogColor = B.Color3.Lerp(C_NIGHT, C_DAY, k);
      nMat.alpha = night * 0.82; stMat.alpha = night;
      sunMesh.position = new B.Vector3(Math.cos(ang), Math.max(-0.2, elev), Math.sin(ang)).scale(200);
      sunMesh.setEnabled(elev > -0.08);
    }
    scene.onBeforeRenderObservable.add(() => { sky.t = (sky.t + (scene.getEngine().getDeltaTime() / 1000) / 240) % 1; applyDayNight(); });
    applyDayNight();

    // ---- terrain ----
    LP.dunes(180, 90, heightAt);

    // ---- temple interior (origin). Walls = flat-shaded boxes, rotated so
    //      each wall's local X runs horizontally and local Z is the inward
    //      normal — matching the frame the mural code expects. ----
    const ROOM = { w: 18, d: 22, h: 6 };
    const sandstone = LP.mat("#cbb079");
    const sandstoneDk = LP.mat("#a98e57");
    const walls = {};

    function wallBox(name, w, h, pos, rotY) {
      const m = LP.box(w, h, 0.6, sandstone, name);
      LP.flat(m);
      m.position = pos; m.rotation.y = rotY;
      m.checkCollisions = true;
      walls[name] = m;
      return m;
    }
    const hh = ROOM.h / 2;
    wallBox("backWall", ROOM.w, ROOM.h, new B.Vector3(0, hh, ROOM.d / 2), Math.PI);
    wallBox("leftWall", ROOM.d, ROOM.h, new B.Vector3(-ROOM.w / 2, hh, 0), Math.PI / 2);
    // front wall split into two jambs + lintel — the OPEN entrance (player walks in)
    [-1, 1].forEach((s) => {
      const jamb = LP.box(6.5, ROOM.h, 0.6, sandstone, "frontJamb"); LP.flat(jamb);
      jamb.position.set(s * 5.75, hh, -ROOM.d / 2); jamb.checkCollisions = true;
    });
    const lintel = LP.box(ROOM.w, 1.4, 0.6, sandstoneDk, "lintel"); LP.flat(lintel);
    lintel.position.set(0, ROOM.h - 0.7, -ROOM.d / 2); lintel.checkCollisions = true;
    // right (east) wall split into two jambs — leaving a SEALED doorway to the oasis
    [-7, 7].forEach((z) => {
      const jamb = LP.box(8, ROOM.h, 0.6, sandstone, "rightJamb"); LP.flat(jamb);
      jamb.position.set(ROOM.w / 2, hh, z); jamb.rotation.y = -Math.PI / 2; jamb.checkCollisions = true;
      if (z === -7) walls.rightWall = jamb; // carries the barque fresco
    });
    const rLintel = LP.box(6, 1.4, 0.6, sandstoneDk, "rightLintel"); LP.flat(rLintel);
    rLintel.position.set(ROOM.w / 2, ROOM.h - 0.7, 0); rLintel.rotation.y = -Math.PI / 2; rLintel.checkCollisions = true;

    // temple floor slab (flat stone, slightly raised so it reads inside dunes)
    const slab = LP.box(ROOM.w + 1, 0.2, ROOM.d + 1, sandstoneDk, "slab");
    LP.flat(slab); slab.position.set(0, 0.0, 0);

    // pillars (two rows) with capitals
    const pillars = [];
    [-4, 4].forEach((x) => [-6, 0, 6].forEach((z) => {
      const shaft = LP.cyl(ROOM.h - 0.6, 0.7, 0.9, 8, sandstone, "pillar");
      shaft.position.set(x, (ROOM.h - 0.6) / 2, z); shaft.checkCollisions = true;
      const cap = LP.cyl(0.5, 1.4, 0.9, 8, sandstoneDk, "cap");
      cap.position.set(x, ROOM.h - 0.6, z);
      pillars.push(shaft);
    }));

    // ---- torches (start dim; the sun puzzle relights them) ----
    const torches = [];
    function torchAt(x, y, z) {
      const flame = LP.lowSphere(0.5, 1, LP.mat("#ff8a2a", "#ff6a10", 1), "flame");
      flame.position.set(x, y, z);
      const light = new B.PointLight("torch", new B.Vector3(x, y, z), scene);
      light.diffuse = new B.Color3(1, 0.7, 0.4); light.intensity = 0.2; light.range = 12;
      torches.push({ flame, light, baseY: y });
    }
    torchAt(-ROOM.w / 2 + 0.4, 3.2, -3); torchAt(ROOM.w / 2 - 0.4, 3.2, -3);
    torchAt(-ROOM.w / 2 + 0.4, 3.2, 5);  torchAt(ROOM.w / 2 - 0.4, 3.2, 5);
    scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.005;
      torches.forEach((tc, i) => {
        tc.flame.scaling.y = 0.85 + Math.sin(t + i * 1.7) * 0.1;
        tc.flame.position.y = tc.baseY + Math.sin(t * 1.3 + i) * 0.03;
      });
    });

    // ============================================================
    // EXTERIOR ZONES
    // ============================================================

    // ---- entrance plaza & approach obelisks (south, the desert gate) ----
    LP.obelisk(new B.Vector3(-4, 0, -16), 6);
    LP.obelisk(new B.Vector3(4, 0, -16), 6);
    LP.obelisk(new B.Vector3(-6, 0, -28), 5);
    LP.obelisk(new B.Vector3(6, 0, -28), 5);
    // two sphinx-ish rock guardians flanking the path
    [-3.5, 3.5].forEach((x) => {
      const base = LP.box(2.2, 1.0, 4.0, sandstone, "sphinxBase"); LP.flat(base);
      base.position.set(x, heightAt(x, -22) + 0.5, -22); base.checkCollisions = true;
      const head = LP.box(1.3, 1.3, 1.3, sandstoneDk, "sphinxHead"); LP.flat(head);
      head.position.set(x, heightAt(x, -22) + 1.6, -23.4);
    });

    // ---- pyramids on the northern horizon (beyond the temple) ----
    LP.pyramid(new B.Vector3(-28, heightAt(-28, 55), 55), 22);
    LP.pyramid(new B.Vector3(18, heightAt(18, 70), 70), 30);
    LP.pyramid(new B.Vector3(46, heightAt(46, 48), 48), 16);

    // ---- desert scatter: cacti & rocks across the dunes ----
    for (let i = 0; i < 46; i++) {
      const a = LP.hash(i, 7) * Math.PI * 2;
      const r = 24 + LP.hash(i, 13) * 60;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x - 38, z + 8) < 18) continue; // keep oasis clear
      const y = heightAt(x, z);
      if (LP.hash(i, 3) > 0.55) LP.cactus(new B.Vector3(x, y, z), 0.8 + LP.hash(i, 5));
      else LP.rock(new B.Vector3(x, y, z), 0.7 + LP.hash(i, 9) * 1.4);
    }

    // ---- oasis (east): lake, palms, grass, reeds ----
    const water = LP.water(new B.Vector3(38, -0.6, -8), 22, 18);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const px = 38 + Math.cos(a) * (11 + LP.hash(i, 2) * 3);
      const pz = -8 + Math.sin(a) * (9 + LP.hash(i, 4) * 3);
      LP.palmTree(new B.Vector3(px, heightAt(px, pz), pz), 1.1 + LP.hash(i, 6) * 0.8);
    }
    for (let i = 0; i < 40; i++) {
      const px = 38 + (LP.hash(i, 11) - 0.5) * 26;
      const pz = -8 + (LP.hash(i, 17) - 0.5) * 22;
      if (Math.hypot(px - 38, pz + 8) < 11) continue; // not in the water
      LP.grassTuft(new B.Vector3(px, heightAt(px, pz), pz));
    }

    // ---- god-ray light shafts slanting into the temple hall ----
    const rayMat = new B.StandardMaterial("rayMat", scene);
    rayMat.emissiveColor = B.Color3.FromHexString("#ffe1a0");
    rayMat.diffuseColor = new B.Color3(0, 0, 0);
    rayMat.disableLighting = true;
    rayMat.backFaceCulling = false;
    rayMat.alpha = 0.05;
    rayMat.alphaMode = B.Engine.ALPHA_ADD;
    rayMat.fogEnabled = false;
    const godRays = [];
    [[-5, -3], [2, 2], [5, 7]].forEach((p, i) => {
      const shaft = B.MeshBuilder.CreateCylinder("ray" + i,
        { height: 11, diameterTop: 0.5, diameterBottom: 3.0, tessellation: 8 }, scene);
      shaft.material = rayMat;
      shaft.position.set(p[0], 5.5, p[1]);
      shaft.rotation.x = 0.32; shaft.rotation.z = -0.18;
      shaft.isPickable = false;
      godRays.push(shaft);
    });

    // ---- floating dust motes ----
    const dot = new B.DynamicTexture("dot", { width: 32, height: 32 }, scene, true);
    const dctx = dot.getContext();
    const grad = dctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,240,210,1)");
    grad.addColorStop(1, "rgba(255,240,210,0)");
    dctx.fillStyle = grad; dctx.fillRect(0, 0, 32, 32); dot.update();
    const dust = new B.ParticleSystem("dust", 350, scene);
    dust.particleTexture = dot;
    dust.emitter = new B.Vector3(0, 3, 0);
    dust.minEmitBox = new B.Vector3(-9, -3, -11);
    dust.maxEmitBox = new B.Vector3(9, 3, 11);
    dust.color1 = new B.Color4(1, 0.92, 0.75, 0.5);
    dust.color2 = new B.Color4(1, 0.85, 0.6, 0.3);
    dust.colorDead = new B.Color4(1, 0.9, 0.7, 0);
    dust.minSize = 0.02; dust.maxSize = 0.07;
    dust.minLifeTime = 6; dust.maxLifeTime = 12;
    dust.emitRate = 40;
    dust.blendMode = B.ParticleSystem.BLENDMODE_ADD;
    dust.gravity = new B.Vector3(0, -0.02, 0);
    dust.direction1 = new B.Vector3(-0.1, 0.05, -0.1);
    dust.direction2 = new B.Vector3(0.1, 0.1, 0.1);
    dust.minEmitPower = 0.02; dust.maxEmitPower = 0.08;
    dust.start();

    // ---- sandstorm weather (periodic) ----
    const sand = new B.ParticleSystem("sand", 1200, scene);
    sand.particleTexture = dot;
    const sandEmitter = new B.TransformNode("sandEmitter", scene);
    sand.emitter = sandEmitter;
    sand.minEmitBox = new B.Vector3(-30, -6, -30);
    sand.maxEmitBox = new B.Vector3(30, 14, 30);
    sand.color1 = new B.Color4(0.86, 0.74, 0.5, 0.5);
    sand.color2 = new B.Color4(0.78, 0.64, 0.42, 0.35);
    sand.colorDead = new B.Color4(0.8, 0.68, 0.45, 0);
    sand.minSize = 0.15; sand.maxSize = 0.6;
    sand.minLifeTime = 1.2; sand.maxLifeTime = 2.5;
    sand.emitRate = 700;
    sand.direction1 = new B.Vector3(8, 0.5, 2); sand.direction2 = new B.Vector3(12, 1.5, 4);
    sand.minEmitPower = 6; sand.maxEmitPower = 12;
    const baseFog = scene.fogDensity;
    let storm = false, stormCd = 60 + Math.random() * 50, stormT = 0;
    function setSandstorm(on) {
      storm = on;
      if (on) { sand.start(); stormT = 16 + Math.random() * 10; }
      else { sand.stop(); }
    }
    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(0.05, scene.getEngine().getDeltaTime() / 1000);
      if (scene.activeCamera) sandEmitter.position.copyFrom(scene.activeCamera.position);
      if (storm) { stormT -= dt; if (stormT <= 0) setSandstorm(false); scene.fogDensity = Math.min(0.05, scene.fogDensity + dt * 0.02); }
      else { stormCd -= dt; if (stormCd <= 0) { stormCd = 70 + Math.random() * 60; setSandstorm(true); } scene.fogDensity = Math.max(baseFog, scene.fogDensity - dt * 0.02); }
    });

    // ---- shoreline foam ring around the oasis ----
    const foam = B.MeshBuilder.CreateTorus("foam", { diameter: 23, thickness: 0.5, tessellation: 36 }, scene);
    const foamMat = new B.StandardMaterial("foamMat", scene);
    foamMat.emissiveColor = B.Color3.FromHexString("#cfeaf2"); foamMat.diffuseColor = new B.Color3(0, 0, 0);
    foamMat.disableLighting = true; foamMat.alpha = 0.5;
    foam.material = foamMat; foam.position.set(38, -0.45, -8); foam.isPickable = false;

    // ---- distant mountain range ringing the world ----
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + LP.hash(i, 1) * 0.25;
      const r = 72 + LP.hash(i, 2) * 18;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      LP.mountain(new B.Vector3(x, heightAt(x, z) - 1, z), 12 + LP.hash(i, 3) * 18, 8 + LP.hash(i, 4) * 7);
    }
    // ---- a few flat-topped mesas at mid distance ----
    [[-50, 22], [44, -52], [58, 30], [-34, -48]].forEach((p, i) => {
      LP.mesa(new B.Vector3(p[0], heightAt(p[0], p[1]), p[1]), 6 + i, 5 + i * 1.5);
    });
    // ---- extra boulder fields ----
    for (let i = 0; i < 20; i++) {
      const a = LP.hash(i, 21) * Math.PI * 2, r = 20 + LP.hash(i, 22) * 56;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x - 38, z + 8) < 16) continue;
      LP.rock(new B.Vector3(x, heightAt(x, z), z), 0.6 + LP.hash(i, 23) * 1.7);
    }
    // ---- a flock of birds circling over the oasis ----
    const birds = [];
    for (let i = 0; i < 5; i++) birds.push({ bd: LP.bird(), a: i * 1.25, r: 9 + i * 2.2, h: 22 + i * 1.5, sp: 0.5 + i * 0.08 });
    scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.001;
      birds.forEach((b) => {
        b.a += b.sp * 0.004;
        b.bd.root.position.set(38 + Math.cos(b.a) * b.r, b.h + Math.sin(t + b.a) * 0.6, -8 + Math.sin(b.a) * b.r);
        b.bd.root.rotation.y = -b.a;
        const flap = Math.sin(t * 8 + b.a) * 0.6;
        b.bd.wl.rotation.z = flap; b.bd.wr.rotation.z = -flap;
      });
    });

    // ---- the sacred barque on the oasis (driven by the barque fresco puzzle) ----
    const boatDock = new B.Vector3(33, -0.35, -16);
    const boatFar = new B.Vector3(43, -0.35, 0);
    const boat3D = LP.boat(boatDock);
    boat3D.rotation.y = Math.PI / 2;
    scene.onBeforeRenderObservable.add(() => {
      boat3D.position.y = -0.35 + Math.sin(performance.now() * 0.001) * 0.06; // gentle bob
    });

    // ============================================================
    // ANCIENT CITY (west district) — a grid of homes, market & shrine
    // ============================================================
    const cityBuildings = [];
    const CX = -34, CZ = -6;
    function addHouse(x, z, w, d, h) {
      LP.house(new B.Vector3(x, heightAt(x, z), z), w, d, h);
      cityBuildings.push({ x, z, w, d });
    }
    for (let gx = -2; gx <= 2; gx++) {
      for (let gz = -2; gz <= 2; gz++) {
        if (Math.abs(gx) <= 0 && Math.abs(gz) <= 0) continue; // central market square
        if (LP.hash(gx + 5, gz + 5) < 0.28) continue;          // gaps = streets/courtyards
        const x = CX + gx * 7 + (LP.hash(gx, gz) - 0.5) * 1.6;
        const z = CZ + gz * 7 + (LP.hash(gz, gx) - 0.5) * 1.6;
        addHouse(x, z, 3.6 + LP.hash(gx, 1) * 2, 3.6 + LP.hash(gz, 2) * 2, 3 + LP.hash(gx, gz) * 2.6);
      }
    }
    // market stalls in the central square
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      LP.stall(new B.Vector3(CX + Math.cos(a) * 3.4, heightAt(CX, CZ), CZ + Math.sin(a) * 3.4));
    }
    // a "great house" / granary on the city edge
    addHouse(CX - 13, CZ + 2, 7, 6, 6);
    addHouse(CX + 2, CZ - 13, 6, 6, 5);
    // small roadside shrine with two columns
    [-1, 1].forEach((s) => { const c = LP.cyl(3.2, 0.5, 0.6, 8, sandstone, "shrineCol"); c.position.set(-18 + s * 1.6, 1.6, -14); c.checkCollisions = true; });
    const shrineRoof = LP.box(5, 0.5, 2.4, sandstoneDk, "shrineRoof"); LP.flat(shrineRoof); shrineRoof.position.set(-18, 3.3, -14);

    // ---- collectible scarabs (hidden around the world) ----
    const scarabs = [];
    [
      [-7, 9, 1.2],      // temple back-left corner
      [0, -30, 1.0],     // entrance plaza
      [30, -2, 1.3],     // oasis edge
      [-34, -6, 1.2],    // city market square
      [-47, 0, 1.2],     // far city edge (behind the great house)
      [-21, -16, 1.2],   // by the roadside shrine
      [-28, 6, 1.2],     // tucked between city homes
    ].forEach((s, i) => {
      const x = s[0], z = s[1], y = heightAt(x, z) + s[2];
      const root = LP.scarab(new B.Vector3(x, y, z));
      scarabs.push({ root, id: i, collected: false, baseY: y });
    });
    scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.001;
      scarabs.forEach((s, i) => {
        if (s.collected) return;
        s.root.rotation.y += 0.02;
        s.root.position.y = s.baseY + Math.sin(t * 2 + i) * 0.15;
      });
    });

    // ============================================================
    // CITY POPULATION — wandering citizens of varied kinds
    // ============================================================
    const skins = ["#c8854f", "#d99b63", "#a9703c", "#bf8a52"];
    const rnd = (a) => a[Math.floor(LP.hash(citizens.length + 1, citizens.length + 7) * a.length) % a.length];
    const citizens = [];
    function citizenOpts(type) {
      const skin = rnd(skins);
      switch (type) {
        case "woman": return { type, skin, cloth: rnd(["#2f8f7e", "#bb6f8f", "#efe6cf"]), hat: "hair", hair: "#1a120a" };
        case "child": return { type, skin, cloth: rnd(["#bb3b22", "#2f6f8f", "#d4a017"]), hat: "hair", scale: 0.62 };
        case "monk": return { type, skin, cloth: "#e7ddc6", hat: "hood", hold: "staff" };
        case "queen": return { type, skin, cloth: "#efe6cf", hat: "crown", gold: "#e8c054" };
        case "soldier": return { type, skin, cloth: "#8a6a3a", hat: "helm", hold: "spear" };
        default: return { type, skin, cloth: rnd(["#bb3b22", "#2f6f8f", "#2f8f7e", "#b89a5e"]), hat: LP.hash(7, citizens.length) > 0.5 ? "nemes" : "hair" };
      }
    }
    function addCitizen(type, x, z) {
      const api = LP.humanoid(citizenOpts(type));
      api.root.position.set(x, heightAt(x, z), z);
      citizens.push({ api, home: { x, z }, heading: Math.random() * 6, wt: 0, sp: 0.55 + Math.random() * 0.5, soldier: type === "soldier" });
    }
    const kinds = ["man", "man", "woman", "woman", "child", "child", "monk", "queen", "man", "woman"];
    kinds.forEach((k, i) => { const a = (i / kinds.length) * Math.PI * 2, r = 4 + LP.hash(i, 3) * 9; addCitizen(k, CX + Math.cos(a) * r, CZ + Math.sin(a) * r); });
    // soldiers patrol the temple approach and city gate
    [[3, -20], [-3, -20], [-22, -6], [0, -8]].forEach((s) => addCitizen("soldier", s[0], s[1]));

    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(0.05, scene.getEngine().getDeltaTime() / 1000);
      citizens.forEach((c) => {
        c.wt -= dt;
        if (c.wt <= 0) { c.heading += (Math.random() - 0.5) * 1.6; c.wt = 1.5 + Math.random() * 2.5; }
        const nx = Math.sin(c.heading), nz = Math.cos(c.heading);
        const px = c.api.root.position.x + nx * c.sp * dt, pz = c.api.root.position.z + nz * c.sp * dt;
        if (Math.hypot(px - c.home.x, pz - c.home.z) > 11) { c.heading += Math.PI; }
        else { c.api.root.position.x = px; c.api.root.position.z = pz; }
        c.api.root.position.y = heightAt(c.api.root.position.x, c.api.root.position.z);
        c.api.root.rotation.y = c.heading;
        c.api.update(dt, true);
      });
    });

    // ---- ancient weapon pickups ----
    const weaponPickups = [];
    [["spear", -30, -2], ["bow", 6, 4]].forEach((w, i) => {
      const root = LP.weaponPickup(w[0]);
      root.position.set(w[1], heightAt(w[1], w[2]), w[2]);
      weaponPickups.push({ root, type: w[0], id: i, taken: false });
    });
    scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.001;
      weaponPickups.forEach((w) => { if (!w.taken) { w.root.rotation.y += 0.02; w.root.position.y = heightAt(w.root.position.x, w.root.position.z) + Math.sin(t) * 0.12; } });
    });

    // ---- lore scrolls (papyrus collectibles) ----
    const scrolls = [];
    [[2, 4, 0], [-34, -10, 1], [33, -6, 2], [-9, 6, 3]].forEach((s) => {
      const x = s[0], z = s[1];
      scrolls.push({ root: LP.scroll(new B.Vector3(x, heightAt(x, z), z)), id: s[2], taken: false });
    });
    scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.001;
      scrolls.forEach((s) => { if (!s.taken) { s.root.rotation.y += 0.015; s.root.position.y = heightAt(s.root.position.x, s.root.position.z) + Math.sin(t + s.id) * 0.1; } });
    });

    // ---- healing water jars (consumables) ----
    const jars = [];
    [[5, 3], [-30, -8], [33, -4], [3, -28]].forEach((s, i) => {
      const x = s[0], z = s[1];
      jars.push({ root: LP.jar(new B.Vector3(x, heightAt(x, z), z)), id: i, used: false });
    });

    // ---- invisible world boundary ----
    const bound = B.MeshBuilder.CreateBox("bound", { width: 170, height: 30, depth: 170 }, scene);
    bound.checkCollisions = true; bound.flipFaces(true); bound.isVisible = false;
    bound.position.y = 10;

    const spawn = new B.Vector3(0, 1.7, -34);

    return { walls, torches, pillars, ROOM, spawn, heightAt, water, hemi, sunLight,
             boat3D, boatDock, boatFar, dust, godRays, scarabs, cityBuildings, jars,
             citizens, weaponPickups, scrolls,
             sky, setSandstorm, isStorm: () => storm, skipTime: () => { sky.t = (sky.t + 0.12) % 1; applyDayNight(); },
             timeLabel: () => { const e = Math.sin(sky.t * Math.PI * 2); return e > 0.35 ? "Day" : e > -0.1 ? "Dusk" : e > -0.6 ? "Night" : "Midnight"; },
             oasis: { x: 38, z: -8, r: 12 }, center: B.Vector3.Zero() };
  }

  global.World = { build };
})(window);
