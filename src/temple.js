/* ============================================================
   temple.js — Builds the Egyptian temple environment.
   Exposes global `Temple.build(scene, BABYLON)` -> { meshes, walls, torches }
   ============================================================ */
(function (global) {
  "use strict";

  function build(scene, BABYLON) {
    const P = Art.PAL;

    // ---------- materials ----------
    const stoneMat = new BABYLON.StandardMaterial("stone", scene);
    stoneMat.diffuseColor = BABYLON.Color3.FromHexString("#b8a578");
    stoneMat.specularColor = new BABYLON.Color3(0.06, 0.06, 0.06);

    const darkStone = new BABYLON.StandardMaterial("darkStone", scene);
    darkStone.diffuseColor = BABYLON.Color3.FromHexString("#8a7a55");
    darkStone.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);

    const sandMat = new BABYLON.StandardMaterial("sand", scene);
    sandMat.diffuseColor = BABYLON.Color3.FromHexString("#cdb482");
    sandMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const glyphMat = new BABYLON.StandardMaterial("glyphWall", scene);
    glyphMat.diffuseTexture = Art.glyphPanelTexture(BABYLON, scene, "wall");
    glyphMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);

    const ROOM = { w: 18, d: 22, h: 6 };

    // ---------- floor & ceiling ----------
    const floor = BABYLON.MeshBuilder.CreateGround("floor", { width: ROOM.w, height: ROOM.d }, scene);
    floor.material = sandMat;
    floor.checkCollisions = true;

    const ceiling = BABYLON.MeshBuilder.CreateGround("ceiling", { width: ROOM.w, height: ROOM.d }, scene);
    ceiling.position.y = ROOM.h;
    ceiling.rotation.x = Math.PI;
    ceiling.material = darkStone;

    // ---------- walls (double-sided planes) ----------
    const walls = {};
    function wall(name, w, h, pos, rotY, mat) {
      const m = BABYLON.MeshBuilder.CreatePlane(name, { width: w, height: h, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
      m.position = pos;
      m.rotation.y = rotY;
      m.material = mat || glyphMat;
      m.checkCollisions = true;
      walls[name] = m;
      return m;
    }

    const hh = ROOM.h / 2;
    wall("backWall", ROOM.w, ROOM.h, new BABYLON.Vector3(0, hh, ROOM.d / 2), Math.PI, glyphMat);
    wall("frontWall", ROOM.w, ROOM.h, new BABYLON.Vector3(0, hh, -ROOM.d / 2), 0, stoneMat);
    wall("leftWall", ROOM.d, ROOM.h, new BABYLON.Vector3(-ROOM.w / 2, hh, 0), Math.PI / 2, glyphMat);
    wall("rightWall", ROOM.d, ROOM.h, new BABYLON.Vector3(ROOM.w / 2, hh, 0), -Math.PI / 2, glyphMat);

    // ---------- pillars (two rows) ----------
    const pillarGlyph = new BABYLON.StandardMaterial("pillarGlyph", scene);
    pillarGlyph.diffuseTexture = Art.glyphPanelTexture(BABYLON, scene, "pillar");
    pillarGlyph.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);

    const pillars = [];
    function pillar(x, z) {
      const shaft = BABYLON.MeshBuilder.CreateCylinder("pillar", { height: ROOM.h - 0.6, diameter: 1.0, tessellation: 16 }, scene);
      shaft.position = new BABYLON.Vector3(x, (ROOM.h - 0.6) / 2, z);
      shaft.material = pillarGlyph;
      shaft.checkCollisions = true;
      // capital + base
      const cap = BABYLON.MeshBuilder.CreateCylinder("cap", { height: 0.5, diameterTop: 1.6, diameterBottom: 1.0 }, scene);
      cap.position = new BABYLON.Vector3(x, ROOM.h - 0.6, z);
      cap.material = darkStone;
      const base = BABYLON.MeshBuilder.CreateBox("base", { width: 1.4, height: 0.4, depth: 1.4 }, scene);
      base.position = new BABYLON.Vector3(x, 0.2, z);
      base.material = darkStone;
      pillars.push(shaft);
    }
    [-4, 4].forEach((x) => [-6, 0, 6].forEach((z) => pillar(x, z)));

    // ---------- two wall torches (start dim; the sun puzzle brightens them) ----------
    const torches = [];
    function torchAt(x, y, z) {
      const bracket = BABYLON.MeshBuilder.CreateCylinder("bracket", { height: 0.6, diameter: 0.12 }, scene);
      bracket.position = new BABYLON.Vector3(x, y, z);
      bracket.material = darkStone;
      const flame = BABYLON.MeshBuilder.CreateSphere("flame", { diameter: 0.35 }, scene);
      flame.position = new BABYLON.Vector3(x, y + 0.4, z);
      const flameMat = new BABYLON.StandardMaterial("flameMat", scene);
      flameMat.emissiveColor = new BABYLON.Color3(1, 0.55, 0.15);
      flameMat.diffuseColor = new BABYLON.Color3(1, 0.55, 0.15);
      flame.material = flameMat;

      const light = new BABYLON.PointLight("torchLight", new BABYLON.Vector3(x, y + 0.4, z), scene);
      light.diffuse = new BABYLON.Color3(1, 0.7, 0.4);
      light.intensity = 0.25; // dim until lit
      light.range = 12;
      torches.push({ flame, flameMat, light, baseY: y + 0.4 });
    }
    torchAt(-ROOM.w / 2 + 0.3, 3.2, -3);
    torchAt(ROOM.w / 2 - 0.3, 3.2, -3);
    torchAt(-ROOM.w / 2 + 0.3, 3.2, 5);
    torchAt(ROOM.w / 2 - 0.3, 3.2, 5);

    // animate flames flicker
    scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.005;
      torches.forEach((tc, i) => {
        const flick = 0.85 + Math.sin(t + i * 1.7) * 0.1 + Math.random() * 0.05;
        tc.flame.scaling.y = flick;
        tc.flame.position.y = tc.baseY + Math.sin(t * 1.3 + i) * 0.02;
      });
    });

    return { walls, torches, pillars, ROOM, materials: { stoneMat, darkStone, sandMat } };
  }

  global.Temple = { build };
})(window);
