/* ============================================================
   lowpoly.js — Low-poly art toolkit (flat-shaded, faceted).
   Everything is built from primitives + flat shading so the whole
   world shares one cohesive low-poly look. Exposes global `LP`.
   ============================================================ */
(function (global) {
  "use strict";

  const B = BABYLON;
  let _scene = null;
  const _matCache = {};

  // tiny deterministic hash noise
  function hash(x, z) {
    let h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
    return h - Math.floor(h);
  }

  // flat-shaded material (no specular). emissive optional.
  function mat(hex, emissiveHex, emissiveScale) {
    const key = hex + "|" + (emissiveHex || "") + "|" + (emissiveScale || 0);
    if (_matCache[key]) return _matCache[key];
    const m = new B.StandardMaterial("lp_" + key, _scene);
    m.diffuseColor = B.Color3.FromHexString(hex);
    m.specularColor = new B.Color3(0.02, 0.02, 0.02);
    m.maxSimultaneousLights = 8;
    if (emissiveHex) m.emissiveColor = B.Color3.FromHexString(emissiveHex).scale(emissiveScale || 1);
    _matCache[key] = m;
    return m;
  }

  function flat(mesh) { mesh.convertToFlatShadedMesh(); return mesh; }

  function box(w, h, d, color, name) {
    const m = B.MeshBuilder.CreateBox(name || "box", { width: w, height: h, depth: d }, _scene);
    if (color) m.material = typeof color === "string" ? mat(color) : color;
    return m;
  }
  function cyl(h, dTop, dBot, tess, color, name) {
    const m = B.MeshBuilder.CreateCylinder(name || "cyl",
      { height: h, diameterTop: dTop, diameterBottom: dBot, tessellation: tess || 6 }, _scene);
    if (color) m.material = typeof color === "string" ? mat(color) : color;
    return flat(m);
  }
  function lowSphere(d, subdiv, color, name) {
    const m = B.MeshBuilder.CreateIcoSphere(name || "ico", { radius: d / 2, subdivisions: subdiv || 1 }, _scene);
    if (color) m.material = typeof color === "string" ? mat(color) : color;
    return flat(m);
  }

  // ---------- environment props ----------

  function palmTree(pos, scale) {
    scale = scale || 1;
    const root = new B.TransformNode("palm", _scene);
    root.position = pos.clone();
    root.scaling.setAll(scale);
    // segmented, slightly curved trunk
    let prevY = 0, lean = (hash(pos.x, pos.z) - 0.5) * 0.5;
    for (let i = 0; i < 5; i++) {
      const seg = cyl(0.9, 0.18 - i * 0.02, 0.24 - i * 0.02, 6, "#9c6b3f", "trunkSeg");
      seg.parent = root;
      seg.position.set(lean * i * 0.18, prevY + 0.45, 0);
      seg.rotation.z = -lean * 0.12;
      prevY += 0.85;
    }
    // fronds
    const top = new B.Vector3(lean * 0.9, prevY + 0.2, 0);
    for (let a = 0; a < 7; a++) {
      const frond = box(1.7, 0.06, 0.45, "#3f8a3a", "frond");
      flat(frond);
      frond.parent = root;
      frond.position.copyFrom(top);
      frond.rotation.y = (a / 7) * Math.PI * 2;
      frond.rotation.z = -0.5;
      frond.setPivotPoint(new B.Vector3(-0.85, 0, 0));
    }
    // coconuts
    for (let c = 0; c < 3; c++) {
      const nut = lowSphere(0.22, 1, "#6b4a25", "coconut");
      nut.parent = root;
      nut.position.set(top.x + (hash(c, pos.x) - 0.5) * 0.4, top.y - 0.15, (hash(c, pos.z) - 0.5) * 0.4);
    }
    return root;
  }

  function cactus(pos, scale) {
    scale = scale || 1;
    const root = new B.TransformNode("cactus", _scene);
    root.position = pos.clone();
    root.scaling.setAll(scale);
    const body = cyl(1.8, 0.35, 0.4, 7, "#3d7a4a", "cacBody");
    body.parent = root; body.position.y = 0.9;
    [-1, 1].forEach((s, i) => {
      const arm = cyl(0.7, 0.18, 0.2, 6, "#3d7a4a", "cacArm");
      arm.parent = root; arm.position.set(s * 0.3, 1.0 + i * 0.25, 0);
      arm.rotation.z = -s * 1.1;
      const up = cyl(0.5, 0.16, 0.18, 6, "#3d7a4a", "cacUp");
      up.parent = root; up.position.set(s * 0.55, 1.35 + i * 0.25, 0);
    });
    return root;
  }

  function rock(pos, scale, color) {
    const r = lowSphere(1.0, hash(pos.x, pos.z) > 0.5 ? 1 : 0, color || "#9a8f78", "rock");
    r.position = pos.clone();
    r.scaling.set(
      scale * (0.8 + hash(pos.x, 1) * 0.6),
      scale * (0.5 + hash(2, pos.z) * 0.5),
      scale * (0.8 + hash(pos.z, 3) * 0.6)
    );
    r.position.y = pos.y;
    r.rotation.y = hash(pos.z, pos.x) * Math.PI;
    r.checkCollisions = true;
    return r;
  }

  function grassTuft(pos) {
    const root = new B.TransformNode("grass", _scene);
    root.position = pos.clone();
    for (let i = 0; i < 4; i++) {
      const blade = box(0.06, 0.4 + hash(i, pos.x) * 0.3, 0.06, "#5aa83f", "blade");
      blade.parent = root;
      blade.position.set((hash(i, pos.z) - 0.5) * 0.3, 0.2, (hash(pos.x, i) - 0.5) * 0.3);
      blade.rotation.z = (hash(i, 9) - 0.5) * 0.5;
    }
    return root;
  }

  function pyramid(pos, size, color) {
    const p = cyl(size, 0, size * 1.45, 4, color || "#caa46a", "pyramid");
    p.position = pos.clone();
    p.position.y = pos.y + size / 2;
    p.rotation.y = Math.PI / 4;
    p.checkCollisions = true;
    return p;
  }

  function obelisk(pos, h) {
    h = h || 6;
    const root = new B.TransformNode("obelisk", _scene);
    root.position = pos.clone();
    const shaft = cyl(h, 0.45, 0.8, 4, "#d2b074", "obShaft");
    shaft.parent = root; shaft.position.y = h / 2; shaft.rotation.y = Math.PI / 4;
    shaft.checkCollisions = true;
    const cap = cyl(0.9, 0, 0.6, 4, "#e8c884", "obCap");
    cap.parent = root; cap.position.y = h + 0.4; cap.rotation.y = Math.PI / 4;
    return root;
  }

  // ---------- sky / atmosphere ----------

  function skydome() {
    const dome = B.MeshBuilder.CreateSphere("sky", { diameter: 600, segments: 12, sideOrientation: B.Mesh.BACKSIDE }, _scene);
    const tex = new B.DynamicTexture("skyTex", { width: 16, height: 256 }, _scene, true);
    const ctx = tex.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.0, "#3a2b6b"); // deep dusk violet (top)
    g.addColorStop(0.45, "#7d5a8c");
    g.addColorStop(0.7, "#d98a5c"); // warm
    g.addColorStop(1.0, "#f6c976"); // horizon glow
    ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 256);
    tex.update();
    const m = new B.StandardMaterial("skyMat", _scene);
    m.emissiveTexture = tex;
    m.diffuseColor = new B.Color3(0, 0, 0);
    m.specularColor = new B.Color3(0, 0, 0);
    m.backFaceCulling = false;
    m.disableLighting = true;
    m.fogEnabled = false; // let the dusk gradient show through the fog
    dome.material = m;
    dome.infiniteDistance = true;
    dome.isPickable = false;
    return dome;
  }

  function sun(pos) {
    const s = lowSphere(14, 1, "#fff2c0", "sun");
    s.material = mat("#fff2c0", "#ffe9a0", 1);
    s.material.fogEnabled = false;
    s.position = pos.clone();
    s.infiniteDistance = true;
    s.isPickable = false;
    return s;
  }

  function cloud(pos, scale) {
    const root = new B.TransformNode("cloud", _scene);
    root.position = pos.clone();
    root.scaling.setAll(scale || 1);
    const cm = mat("#f3e9d8", "#cdbfa6", 0.5);
    for (let i = 0; i < 5; i++) {
      const puff = lowSphere(2 + hash(i, pos.x) * 2, 1, cm, "puff");
      puff.parent = root;
      puff.position.set((i - 2) * 1.6, hash(i, pos.z) * 0.6, (hash(pos.x, i) - 0.5) * 1.2);
      puff.scaling.y = 0.6;
    }
    root.isPickable = false;
    return root;
  }

  // ---------- water ----------
  function water(pos, w, d) {
    const m = B.MeshBuilder.CreateGround("water", { width: w, height: d, subdivisions: 14 }, _scene);
    m.position = pos.clone();
    const mt = new B.StandardMaterial("waterMat", _scene);
    mt.diffuseColor = B.Color3.FromHexString("#2c7da0");
    mt.emissiveColor = B.Color3.FromHexString("#123a52");
    mt.specularColor = new B.Color3(0.3, 0.4, 0.5);
    mt.alpha = 0.85;
    mt.maxSimultaneousLights = 8;
    m.material = mt;
    m.isPickable = false;
    const base = m.getVerticesData(B.VertexBuffer.PositionKind);
    const orig = base.slice();
    _scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.001;
      for (let i = 0; i < base.length; i += 3) {
        base[i + 1] = orig[i + 1] + Math.sin(orig[i] * 0.5 + t) * 0.12 + Math.cos(orig[i + 2] * 0.6 + t) * 0.12;
      }
      m.updateVerticesData(B.VertexBuffer.PositionKind, base);
    });
    return m;
  }

  // ---------- low-poly terrain (dunes) with vertex colours ----------
  function dunes(size, subdiv, heightAt) {
    const g = B.MeshBuilder.CreateGround("dunes", { width: size, height: size, subdivisions: subdiv }, _scene);
    const pos = g.getVerticesData(B.VertexBuffer.PositionKind);
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] = heightAt(pos[i], pos[i + 2]);
    }
    g.updateVerticesData(B.VertexBuffer.PositionKind, pos);
    g.createNormals(true);
    flat(g); // facet it

    // per-face sand variation via vertex colours
    const p2 = g.getVerticesData(B.VertexBuffer.PositionKind);
    const colors = [];
    const sandA = B.Color3.FromHexString("#d8bd86");
    const sandB = B.Color3.FromHexString("#c2a567");
    for (let i = 0; i < p2.length; i += 9) { // 3 verts per face after flat shading
      const h = p2[i + 1];
      const t = Math.min(1, Math.max(0, (h + 1) / 5)) * 0.7 + hash(p2[i], p2[i + 2]) * 0.3;
      const c = B.Color3.Lerp(sandB, sandA, t);
      for (let v = 0; v < 3; v++) colors.push(c.r, c.g, c.b, 1);
    }
    g.setVerticesData(B.VertexBuffer.ColorKind, colors);
    const m = new B.StandardMaterial("duneMat", _scene);
    m.diffuseColor = new B.Color3(1, 1, 1);
    m.specularColor = new B.Color3(0, 0, 0);
    m.maxSimultaneousLights = 8;
    g.material = m;
    g.useVertexColors = true;
    g.isPickable = false;
    return g;
  }

  // ---------- low-poly humanoid (companions) ----------
  function humanoid(opts) {
    opts = opts || {};
    const root = new B.TransformNode("humanoid", _scene);
    const skin = mat(opts.skin || "#c8854f");
    const cloth = mat(opts.cloth || "#bb3b22");
    const hair = mat(opts.hair || "#1a120a");

    function part(w, h, d, m, x, y, z) {
      const b = box(w, h, d, m, "hpart"); b.parent = root; b.position.set(x, y, z); return b;
    }
    const legL = part(0.18, 0.75, 0.22, skin, -0.13, 0.38, 0);
    const legR = part(0.18, 0.75, 0.22, skin, 0.13, 0.38, 0);
    part(0.52, 0.7, 0.3, cloth, 0, 1.1, 0);        // torso
    const armL = part(0.14, 0.62, 0.16, skin, -0.34, 1.12, 0);
    const armR = part(0.14, 0.62, 0.16, skin, 0.34, 1.12, 0);
    part(0.36, 0.36, 0.34, skin, 0, 1.63, 0);      // head

    // headgear by type
    const hat = opts.hat || "nemes";
    if (hat === "nemes") {
      part(0.42, 0.18, 0.4, hair, 0, 1.78, -0.02);
      part(0.1, 0.34, 0.42, mat(opts.gold || "#d4a017"), 0, 1.55, -0.18);
    } else if (hat === "hair") {
      part(0.4, 0.22, 0.4, hair, 0, 1.76, 0);
    } else if (hat === "crown") {                  // queen / royalty
      part(0.42, 0.2, 0.42, mat("#1a120a"), 0, 1.78, 0);
      const crown = cyl(0.5, 0.42, 0.34, 8, mat(opts.gold || "#e8c054", "#7a5c00", 0.4), "crown");
      crown.parent = root; crown.position.y = 2.1;
      const orb = lowSphere(0.18, 1, mat("#bb3b22", "#7a1a10", 0.5), "crownOrb"); orb.parent = root; orb.position.y = 2.4;
    } else if (hat === "hood") {                    // monk / priest
      const hood = cyl(0.55, 0.1, 0.5, 7, cloth, "hood"); hood.parent = root; hood.position.y = 1.78;
    } else if (hat === "helm") {                    // soldier
      const helm = lowSphere(0.42, 1, mat(opts.gold || "#8a6a3a"), "helm"); helm.parent = root; helm.position.y = 1.74; helm.scaling.y = 0.8;
    }

    // held item
    const hold = opts.hold || "none";
    if (hold === "spear") {
      const shaft = cyl(2.2, 0.05, 0.06, 5, mat("#6b4a25"), "spearShaft"); shaft.parent = root; shaft.position.set(0.4, 1.1, 0.05);
      const tip = cyl(0.35, 0, 0.14, 4, mat("#9a9a9a"), "spearTip"); tip.parent = root; tip.position.set(0.4, 2.25, 0.05);
    } else if (hold === "staff") {
      const st = cyl(2.0, 0.06, 0.07, 6, mat("#8a6a3a"), "staff"); st.parent = root; st.position.set(0.4, 1.0, 0.05);
      const knob = lowSphere(0.2, 1, mat("#d4a017", "#7a5c00", 0.4), "staffKnob"); knob.parent = root; knob.position.set(0.4, 2.05, 0.05);
    }

    if (opts.scale) root.scaling.setAll(opts.scale);
    [legL, legR, armL, armR].forEach((p) => p.setPivotPoint(new B.Vector3(0, p === legL || p === legR ? 0.37 : 0.31, 0)));

    let phase = 0;
    function update(dt, walking) {
      if (walking) {
        phase += dt * 9;
        const s = Math.sin(phase) * 0.6;
        legL.rotation.x = s; legR.rotation.x = -s;
        armL.rotation.x = -s; armR.rotation.x = s;
        root.position.y += 0; // y is handled by terrain follow externally
      } else {
        [legL, legR, armL, armR].forEach((p) => p.rotation.x *= 0.8);
      }
    }
    return { root, update };
  }

  // ---------- low-poly guardian boss (Anubis) ----------
  function guardian() {
    const root = new B.TransformNode("guardian", _scene);
    const black = mat("#161020");
    const gold = mat("#d4a017", "#7a5c00", 0.4);
    const eyeMat = mat("#c79bff", "#7a2dff", 1.6); // glowing violet eyes (per the video)

    function part(w, h, d, m, x, y, z) {
      const b = box(w, h, d, m, "gpart"); b.parent = root; b.position.set(x, y, z); return b;
    }
    part(0.45, 1.5, 0.45, black, -0.35, 0.75, 0); // leg L
    part(0.45, 1.5, 0.45, black, 0.35, 0.75, 0);  // leg R
    part(1.1, 1.4, 0.6, black, 0, 2.1, 0);        // torso
    part(1.2, 0.6, 0.7, gold, 0, 1.55, 0);        // kilt
    const armL = part(0.34, 1.3, 0.34, black, -0.78, 2.0, 0);
    const armR = part(0.34, 1.3, 0.34, black, 0.78, 2.0, 0);
    // jackal head
    part(0.7, 0.7, 0.7, black, 0, 3.1, 0);        // head block
    const snout = box(0.45, 0.4, 0.7, black, "snout"); snout.parent = root; snout.position.set(0, 3.0, 0.5);
    // ears
    [-0.22, 0.22].forEach((x) => {
      const ear = cyl(0.6, 0, 0.28, 4, black, "ear"); ear.parent = root; ear.position.set(x, 3.6, -0.05);
    });
    // glowing eyes
    [-0.16, 0.16].forEach((x) => {
      const e = box(0.1, 0.12, 0.08, eyeMat, "eye"); e.parent = root; e.position.set(x, 3.12, 0.36);
    });
    // was-staff
    const staff = cyl(3.2, 0.08, 0.08, 6, gold, "staff"); staff.parent = root; staff.position.set(1.0, 1.6, 0);
    armL.setPivotPoint(new B.Vector3(0, 0.6, 0));
    armR.setPivotPoint(new B.Vector3(0, 0.6, 0));

    // pick / hit collider (invisible)
    const collider = box(1.8, 4.0, 1.2, undefined, "bossCollider");
    collider.parent = root; collider.position.y = 2.0;
    collider.visibility = 0; collider.isPickable = true;
    collider.metadata = { bossHit: true };

    const glow = new B.PointLight("guardGlow", new B.Vector3(0, 2.5, 0), _scene);
    glow.diffuse = new B.Color3(0.6, 0.35, 1.0); glow.intensity = 1.8; glow.range = 16;
    glow.parent = root;

    let t = 0;
    function update(dt) {
      t += dt;
      const swing = Math.sin(t * 2.4) * 0.25;
      armL.rotation.x = swing; armR.rotation.x = -swing;
      glow.intensity = 1.6 + Math.sin(t * 7) * 0.4;
    }
    return { root, collider, glow, update, eyeMat };
  }

  // ---------- player weapon viewmodels (first-person) ----------
  function weapon(type) {
    const root = new B.TransformNode("weapon_" + type, _scene);
    const metal = mat("#b9bcc4"), bronze = mat("#c08a3e", "#5a3a10", 0.2), wood = mat("#6b4a25");
    const hand = box(0.16, 0.16, 0.2, mat("#caa46a"), "wHand"); flat(hand); hand.parent = root; hand.position.set(0, -0.12, -0.05);
    if (type === "khopesh") {
      const grip = cyl(0.4, 0.05, 0.06, 6, wood, "kGrip"); grip.parent = root; grip.rotation.x = Math.PI / 2; grip.position.set(0, 0, 0.1);
      const blade = box(0.07, 0.5, 0.12, bronze, "kBlade"); flat(blade); blade.parent = root; blade.position.set(0, 0.18, 0.35); blade.rotation.x = -0.5;
      const curve = box(0.07, 0.3, 0.1, bronze, "kCurve"); flat(curve); curve.parent = root; curve.position.set(0, 0.42, 0.55); curve.rotation.x = -1.4;
    } else if (type === "spear") {
      const shaft = cyl(1.7, 0.045, 0.05, 5, wood, "spShaft"); shaft.parent = root; shaft.rotation.x = Math.PI / 2; shaft.position.set(0, 0, 0.6);
      const tip = cyl(0.4, 0, 0.13, 4, metal, "spTip"); tip.parent = root; tip.rotation.x = Math.PI / 2; tip.position.set(0, 0, 1.5);
    } else if (type === "bow") {
      const b1 = box(0.05, 0.9, 0.08, wood, "bowArc"); flat(b1); b1.parent = root; b1.position.set(0, 0.05, 0.3); b1.rotation.x = 0.2;
      const top = box(0.05, 0.35, 0.07, wood, "bowTop"); flat(top); top.parent = root; top.position.set(0, 0.5, 0.42); top.rotation.x = 0.9;
      const bot = box(0.05, 0.35, 0.07, wood, "bowBot"); flat(bot); bot.parent = root; bot.position.set(0, -0.4, 0.42); bot.rotation.x = -0.9;
    }
    root.getChildMeshes().forEach((m) => { m.isPickable = false; m.renderingGroupId = 1; });
    return root;
  }
  function arrow() {
    const root = new B.TransformNode("arrow", _scene);
    const shaft = cyl(0.7, 0.02, 0.02, 4, mat("#6b4a25"), "arrShaft"); shaft.parent = root; shaft.rotation.x = Math.PI / 2;
    const tip = cyl(0.12, 0, 0.05, 4, mat("#9a9a9a"), "arrTip"); tip.parent = root; tip.rotation.x = Math.PI / 2; tip.position.z = 0.4;
    root.getChildMeshes().forEach((m) => { m.isPickable = false; });
    return root;
  }
  function weaponPickup(type) {
    const root = new B.TransformNode("wpick_" + type, _scene);
    const w = weapon(type); w.parent = root; w.scaling.setAll(1.4); w.position.y = 1.0;
    w.getChildMeshes().forEach((m) => { m.renderingGroupId = 0; });
    // glowing base ring
    const ring = cyl(0.1, 0.7, 0.7, 10, mat("#ffd24a", "#a87a00", 0.6), "wRing"); ring.parent = root; ring.position.y = 0.05;
    return root;
  }

  // ---------- held flashlight viewmodel (first-person) ----------
  function flashlight() {
    const root = new B.TransformNode("flashlight", _scene);
    const metal = mat("#3a3a40");
    const grip = cyl(0.42, 0.07, 0.08, 8, metal, "flGrip"); grip.parent = root;
    grip.rotation.x = Math.PI / 2; grip.position.set(0, -0.02, 0);
    const headM = cyl(0.18, 0.13, 0.085, 8, mat("#5a5a62"), "flHead"); headM.parent = root;
    headM.rotation.x = Math.PI / 2; headM.position.set(0, 0.02, 0.28);
    const lens = cyl(0.04, 0.12, 0.12, 8, mat("#fff2c0", "#ffe9a0", 1), "flLens"); lens.parent = root;
    lens.rotation.x = Math.PI / 2; lens.position.set(0, 0.02, 0.38);
    // a gloved hand stub
    const hand = box(0.16, 0.16, 0.2, mat("#caa46a"), "flHand"); flat(hand);
    hand.parent = root; hand.position.set(0, -0.12, -0.05);
    root.getChildMeshes().forEach((m) => { m.isPickable = false; m.renderingGroupId = 1; });
    return root;
  }

  // ---------- low-poly mountains / mesas ----------
  function mountain(pos, h, baseR) {
    const root = new B.TransformNode("mountain", _scene);
    root.position = pos.clone();
    const rockA = mat("#8a7d68"), rockB = mat("#6f6552");
    const peak = cyl(h, baseR * 0.12, baseR, 5, rockA, "peak");
    peak.parent = root; peak.position.y = h / 2; peak.rotation.y = hash(pos.x, pos.z) * Math.PI;
    for (let i = 0; i < 3; i++) {
      const sh = h * (0.4 + hash(i, pos.x) * 0.4);
      const sr = baseR * (0.4 + hash(i, pos.z) * 0.3);
      const sp = cyl(sh, sr * 0.12, sr, 5, i % 2 ? rockB : rockA, "subpeak");
      sp.parent = root;
      const a = hash(i, 9) * Math.PI * 2, d = baseR * 0.55;
      sp.position.set(Math.cos(a) * d, sh / 2, Math.sin(a) * d);
      sp.rotation.y = hash(a, i) * Math.PI;
    }
    root.isPickable = false;
    return root;
  }

  function mesa(pos, r, h) {
    const m = cyl(h, r * 0.85, r, 6, mat("#b89a6a"), "mesa");
    m.position = pos.clone(); m.position.y = pos.y + h / 2;
    m.rotation.y = hash(pos.x, pos.z) * Math.PI;
    m.checkCollisions = true;
    return m;
  }

  // ---------- low-poly bird (for flocks) ----------
  function bird() {
    const root = new B.TransformNode("bird", _scene);
    const m = mat("#2a2018");
    const wl = box(0.9, 0.05, 0.34, m, "wingL"); flat(wl); wl.parent = root; wl.position.x = -0.5;
    const wr = box(0.9, 0.05, 0.34, m, "wingR"); flat(wr); wr.parent = root; wr.position.x = 0.5;
    wl.setPivotPoint(new B.Vector3(0.45, 0, 0));
    wr.setPivotPoint(new B.Vector3(-0.45, 0, 0));
    root.getChildMeshes().forEach((x) => { x.isPickable = false; });
    return { root, wl, wr };
  }

  // ---------- low-poly reed boat (papyrus skiff) ----------
  function boat(pos) {
    const root = new B.TransformNode("boat3d", _scene);
    root.position = pos.clone();
    const reed = mat("#b0602f");
    const reedDk = mat("#8a4a22");
    // hull
    const hull = box(3.2, 0.5, 1.1, reed, "hull"); flat(hull); hull.parent = root; hull.position.y = 0.25;
    // upturned prow & stern (4-sided cones)
    [-1, 1].forEach((s) => {
      const end = cyl(1.3, 0.05, 0.9, 4, reedDk, "boatEnd");
      end.parent = root; end.position.set(s * 1.75, 0.55, 0);
      end.rotation.z = s * 1.1; end.rotation.y = Math.PI / 4;
    });
    // mast + sail
    const mast = cyl(2.0, 0.06, 0.08, 6, mat("#6b4a25"), "mast"); mast.parent = root; mast.position.y = 1.2;
    const sail = box(0.08, 1.2, 1.4, mat("#efe6cf"), "sail"); flat(sail); sail.parent = root;
    sail.position.set(0, 1.4, 0);
    root.getChildMeshes().forEach((m) => { m.isPickable = false; });
    return root;
  }

  // ---------- low-poly city buildings ----------
  function house(pos, w, d, h) {
    const root = new B.TransformNode("house", _scene);
    root.position = pos.clone();
    const tone = ["#b9925a", "#c2a067", "#a9824a", "#bd9a5e"][Math.floor(hash(pos.x, pos.z) * 4)];
    const mud = mat(tone), mudDk = mat("#7a5a32"), roof = mat("#8a6a3a");
    const body = box(w, h, d, mud, "houseBody"); flat(body); body.parent = root; body.position.y = h / 2; body.checkCollisions = true;
    const lip = box(w + 0.3, 0.3, d + 0.3, roof, "roofLip"); flat(lip); lip.parent = root; lip.position.y = h;
    const door = box(0.9, h * 0.5, 0.12, mudDk, "houseDoor"); flat(door); door.parent = root; door.position.set((hash(pos.z, 1) - 0.5) * w * 0.4, h * 0.25, d / 2 + 0.02);
    const win = box(0.55, 0.55, 0.12, mat("#2a2014"), "houseWin"); flat(win); win.parent = root; win.position.set(w * 0.28, h * 0.62, d / 2 + 0.02);
    // a few rooftop crates sometimes
    if (hash(pos.x, 7) > 0.6) { const c = box(0.7, 0.7, 0.7, mudDk, "crate"); flat(c); c.parent = root; c.position.set(w * 0.2, h + 0.5, -d * 0.2); }
    return root;
  }
  function stall(pos) {
    const root = new B.TransformNode("stall", _scene); root.position = pos.clone();
    const wood = mat("#7a5a32");
    const cloth = mat(["#bb3b22", "#2f8f7e", "#2f6f8f", "#d4a017"][Math.floor(hash(pos.x, pos.z) * 4)]);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((c) => { const p = cyl(2, 0.08, 0.1, 5, wood, "stallPost"); p.parent = root; p.position.set(c[0] * 0.95, 1, c[1] * 0.95); });
    const canopy = box(2.6, 0.12, 2.6, cloth, "canopy"); flat(canopy); canopy.parent = root; canopy.position.y = 2.05; canopy.rotation.x = 0.06;
    const table = box(2.2, 0.12, 1.0, wood, "stallTable"); flat(table); table.parent = root; table.position.set(0, 0.9, 0.6);
    return root;
  }

  // ---------- enemy: shade of the Duat (floating wraith) ----------
  function shade() {
    const root = new B.TransformNode("shade", _scene);
    const dark = new B.StandardMaterial("shadeMat", _scene);
    dark.diffuseColor = B.Color3.FromHexString("#181226");
    dark.emissiveColor = B.Color3.FromHexString("#2a1a4a");
    dark.specularColor = new B.Color3(0, 0, 0);
    dark.alpha = 0.82; dark.maxSimultaneousLights = 8;
    const body = cyl(1.7, 0.08, 0.95, 6, dark, "shadeBody"); body.parent = root; body.position.y = 0.95;
    const head = lowSphere(0.72, 1, dark, "shadeHead"); head.parent = root; head.position.y = 1.65;
    const eyeMat = mat("#ff5bd0", "#ff1ab0", 1.6);
    [-0.16, 0.16].forEach((x) => { const e = box(0.12, 0.15, 0.08, eyeMat, "shadeEye"); e.parent = root; e.position.set(x, 1.68, 0.32); });
    const col = box(1.0, 2.0, 1.0, undefined, "shadeCol");
    col.parent = root; col.position.y = 1.0; col.visibility = 0; col.isPickable = true; col.metadata = { shade: true };
    return { root, col, eyeMat };
  }

  // ---------- pharaoh's treasure (golden sarcophagus) ----------
  function treasure(pos) {
    const root = new B.TransformNode("treasure", _scene);
    root.position = pos.clone();
    const gold = mat("#e8c054", "#9a6c00", 0.5), teal = mat("#1f8f7e", "#0c5a4e", 0.4), dark = mat("#2a2014");
    const ped = box(2.0, 0.5, 1.4, mat("#b89a6a"), "tPed"); flat(ped); ped.parent = root; ped.position.y = 0.25;
    const body = box(0.98, 1.6, 0.58, gold, "tBody"); flat(body); body.parent = root; body.position.y = 1.3;
    const head = box(0.72, 0.62, 0.5, gold, "tHead"); flat(head); head.parent = root; head.position.y = 2.2;
    const nemes = box(0.92, 0.4, 0.56, teal, "tNemes"); flat(nemes); nemes.parent = root; nemes.position.y = 2.48;
    const lapL = box(0.18, 0.6, 0.1, teal, "tLapL"); flat(lapL); lapL.parent = root; lapL.position.set(-0.34, 1.95, 0.27);
    const lapR = box(0.18, 0.6, 0.1, teal, "tLapR"); flat(lapR); lapR.parent = root; lapR.position.set(0.34, 1.95, 0.27);
    const beard = box(0.13, 0.32, 0.13, dark, "tBeard"); flat(beard); beard.parent = root; beard.position.set(0, 1.92, 0.3);
    const glow = new B.PointLight("treasureGlow", new B.Vector3(0, 2, 0), _scene);
    glow.parent = root; glow.diffuse = new B.Color3(1, 0.8, 0.35); glow.intensity = 1.2; glow.range = 12;
    root.getChildMeshes().forEach((m) => { m.isPickable = false; });
    return { root, glow };
  }

  // ---------- nature: leafy tree, flower, camel ----------
  function tree(pos, scale) {
    scale = scale || 1;
    const root = new B.TransformNode("tree", _scene); root.position = pos.clone(); root.scaling.setAll(scale);
    const trunk = cyl(1.7, 0.22, 0.34, 6, mat("#7a5230"), "trunk"); trunk.parent = root; trunk.position.y = 0.85; trunk.checkCollisions = true;
    lowSphere(2.4, 1, mat("#3f8a3a"), "leaf").parent = root; root.getChildMeshes().slice(-1)[0].position.y = 2.3;
    const g2 = lowSphere(1.7, 1, mat("#4f9a44"), "leaf"); g2.parent = root; g2.position.set(0.7, 2.8, 0.2);
    const g3 = lowSphere(1.6, 1, mat("#357a32"), "leaf"); g3.parent = root; g3.position.set(-0.6, 2.7, -0.3);
    return root;
  }
  function flower(pos) {
    const root = new B.TransformNode("flower", _scene); root.position = pos.clone();
    const stem = cyl(0.5, 0.03, 0.05, 4, mat("#4f9a44"), "stem"); stem.parent = root; stem.position.y = 0.25;
    const col = ["#e0556b", "#e8c054", "#c77dff", "#ff9a3c", "#ffffff"][Math.floor(hash(pos.x, pos.z) * 5) % 5];
    const head = lowSphere(0.26, 1, mat(col, col, 0.25), "bloom"); head.parent = root; head.position.y = 0.52; head.scaling.y = 0.5;
    return root;
  }
  function camel(pos) {
    const root = new B.TransformNode("camel", _scene); root.position = pos.clone();
    const tan = mat("#c79a5b");
    const body = box(1.9, 0.9, 0.8, tan, "camelBody"); flat(body); body.parent = root; body.position.y = 1.45;
    const hump = lowSphere(0.8, 1, tan, "hump"); hump.parent = root; hump.position.set(-0.1, 1.95, 0); hump.scaling.set(1, 0.9, 1);
    [[-0.7, 0.32], [0.7, 0.32], [-0.7, -0.32], [0.7, -0.32]].forEach((l) => { const leg = box(0.2, 1.0, 0.2, tan, "cleg"); flat(leg); leg.parent = root; leg.position.set(l[0], 0.5, l[1]); });
    const neck = box(0.32, 1.1, 0.32, tan, "neck"); flat(neck); neck.parent = root; neck.position.set(1.0, 2.0, 0); neck.rotation.z = -0.5;
    const head = box(0.42, 0.36, 0.55, tan, "chead"); flat(head); head.parent = root; head.position.set(1.5, 2.4, 0);
    return root;
  }
  // ---------- modern props: lamppost, bench ----------
  function lamppost(pos) {
    const root = new B.TransformNode("lamp", _scene); root.position = pos.clone();
    const metal = mat("#3a3a42");
    const pole = cyl(4.4, 0.1, 0.16, 6, metal, "pole"); pole.parent = root; pole.position.y = 2.2;
    const arm = box(0.1, 0.1, 1.1, metal, "arm"); flat(arm); arm.parent = root; arm.position.set(0, 4.3, 0.45);
    const lamp = lowSphere(0.45, 1, mat("#fff2c0", "#ffe9a0", 1), "lampHead"); lamp.parent = root; lamp.position.set(0, 4.2, 0.95); lamp.scaling.y = 0.7;
    return root;
  }
  function bench(pos) {
    const root = new B.TransformNode("bench", _scene); root.position = pos.clone();
    const wood = mat("#6b4a25");
    const seat = box(1.8, 0.12, 0.5, wood, "seat"); flat(seat); seat.parent = root; seat.position.y = 0.5;
    const back = box(1.8, 0.5, 0.12, wood, "back"); flat(back); back.parent = root; back.position.set(0, 0.78, -0.2);
    [-0.7, 0.7].forEach((x) => { const lg = box(0.12, 0.5, 0.45, wood, "blg"); flat(lg); lg.parent = root; lg.position.set(x, 0.25, 0); });
    return root;
  }

  // ---------- lore scroll (papyrus) ----------
  function scroll(pos) {
    const root = new B.TransformNode("scroll", _scene);
    root.position = pos.clone();
    const paper = mat("#e7ddc6", "#6a5a3a", 0.25), rod = mat("#caa05a", "#7a5c10", 0.3);
    const body = cyl(0.9, 0.16, 0.16, 8, paper, "scrollBody"); body.parent = root; body.rotation.z = Math.PI / 2; body.position.y = 0.9;
    [-0.5, 0.5].forEach((x) => { const cap = cyl(0.16, 0.12, 0.12, 8, rod, "scrollCap"); cap.parent = root; cap.rotation.z = Math.PI / 2; cap.position.set(x, 0.9, 0); });
    root.getChildMeshes().forEach((m) => { m.isPickable = false; });
    return root;
  }

  // ---------- healing water jar (consumable) ----------
  function jar(pos) {
    const root = new B.TransformNode("jar", _scene);
    root.position = pos.clone();
    const clay = mat("#9a6b3f");
    const body = lowSphere(0.9, 1, clay, "jarBody"); body.parent = root; body.scaling.set(1, 1.25, 1); body.position.y = 0.55;
    const neck = cyl(0.4, 0.3, 0.42, 7, clay, "jarNeck"); neck.parent = root; neck.position.y = 1.15;
    const water = lowSphere(0.5, 1, mat("#2c7da0", "#1d5f86", 0.7), "jarWater"); water.parent = root; water.position.y = 1.25; water.scaling.set(1, 0.3, 1);
    root.getChildMeshes().forEach((m) => { m.isPickable = false; });
    return root;
  }

  // ---------- objective waypoint beacon (tall glowing pillar) ----------
  function beacon() {
    const m = new B.StandardMaterial("beaconMat", _scene);
    m.emissiveColor = B.Color3.FromHexString("#ffd24a");
    m.diffuseColor = new B.Color3(0, 0, 0); m.disableLighting = true;
    m.alpha = 0.22; m.alphaMode = B.Engine.ALPHA_ADD; m.fogEnabled = false; m.backFaceCulling = false;
    const c = B.MeshBuilder.CreateCylinder("beacon", { height: 34, diameter: 1.5, tessellation: 10 }, _scene);
    c.material = m; c.isPickable = false; c.position.y = 17;
    return c;
  }

  // ---------- collectible scarab ----------
  function scarab(pos) {
    const root = new B.TransformNode("scarab", _scene);
    root.position = pos.clone();
    const gold = mat("#e8b23a", "#a8730a", 0.7), teal = mat("#1f8f7e", "#0c5a4e", 0.5);
    const body = lowSphere(0.5, 1, gold, "scBody"); body.parent = root; body.scaling.set(1, 0.55, 1.3);
    const wl = box(0.24, 0.12, 0.42, teal, "scWL"); flat(wl); wl.parent = root; wl.position.set(-0.12, 0.13, -0.02); wl.rotation.z = 0.25;
    const wr = box(0.24, 0.12, 0.42, teal, "scWR"); flat(wr); wr.parent = root; wr.position.set(0.12, 0.13, -0.02); wr.rotation.z = -0.25;
    const head = lowSphere(0.24, 1, gold, "scHead"); head.parent = root; head.position.set(0, 0.06, 0.34);
    root.scaling.setAll(0.85);
    root.getChildMeshes().forEach((m) => { m.isPickable = false; });
    return root;
  }

  // ---------- a single low-poly candle (flame; light optional) ----------
  function candle(pos, h, withLight) {
    h = h || 0.5;
    const root = new B.TransformNode("candle", _scene);
    root.position = pos.clone();
    const stick = cyl(h, 0.07, 0.09, 6, mat("#e8dcc0"), "candleStick"); stick.parent = root; stick.position.y = h / 2;
    const flame = lowSphere(0.16, 1, mat("#ffcf6a", "#ff9a2a", 1), "candleFlame");
    flame.parent = root; flame.position.y = h + 0.1; flame.scaling.y = 1.6;
    let light = null;
    if (withLight) {
      light = new B.PointLight("candleL", new B.Vector3(0, h + 0.15, 0), _scene);
      light.parent = root; light.diffuse = new B.Color3(1, 0.7, 0.35); light.intensity = 0.35; light.range = 5;
    }
    return { root, flame, light, baseY: h + 0.1 };
  }

  global.LP = {
    init(scene) { _scene = scene; },
    hash, mat, flat, box, cyl, lowSphere,
    palmTree, cactus, rock, grassTuft, pyramid, obelisk,
    skydome, sun, cloud, water, dunes, humanoid, guardian,
    flashlight, candle, boat, mountain, mesa, bird, scarab, treasure, shade, house, stall, jar, beacon,
    weapon, arrow, weaponPickup, scroll, tree, flower, camel, lamppost, bench,
  };
})(window);
