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
    LP.sun(new B.Vector3(80, 60, -90));
    [[-40, 40, -60, 2], [30, 46, -70, 2.6], [-10, 52, 40, 2.2], [55, 44, 10, 1.8]]
      .forEach((c) => LP.cloud(new B.Vector3(c[0], c[1], c[2]), c[3]));

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

    // ---- invisible world boundary ----
    const bound = B.MeshBuilder.CreateBox("bound", { width: 170, height: 30, depth: 170 }, scene);
    bound.checkCollisions = true; bound.flipFaces(true); bound.isVisible = false;
    bound.position.y = 10;

    const spawn = new B.Vector3(0, 1.7, -34);

    return { walls, torches, pillars, ROOM, spawn, heightAt, water, hemi, sunLight, center: B.Vector3.Zero() };
  }

  global.World = { build };
})(window);
