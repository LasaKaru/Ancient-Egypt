/* ============================================================
   art.js — Procedural Egyptian art via HTML canvas
   All textures are generated at runtime (no external assets),
   so the game runs from a single folder, even file://.
   Exposes a global `Art` namespace.
   ============================================================ */
(function (global) {
  "use strict";

  // -------- shared palette --------
  const PAL = {
    stone:   "#d8c49a",
    stoneHi: "#e8d6ad",
    ink:     "#2c1d0f",
    skin:    "#c8854f",
    skinHi:  "#d99b63",
    red:     "#bb3b22",
    blue:    "#2f6f8f",
    teal:    "#2f8f7e",
    gold:    "#d4a017",
    white:   "#efe6cf",
    black:   "#1a120a",
  };

  // Wash a canvas with an aged-stone background (cracks, speckle).
  function agedStone(ctx, w, h, base) {
    ctx.fillStyle = base || PAL.stone;
    ctx.fillRect(0, 0, w, h);

    // mottling
    for (let i = 0; i < (w * h) / 1400; i++) {
      const r = Math.random() * 3 + 0.5;
      ctx.fillStyle = `rgba(80,55,25,${Math.random() * 0.08})`;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // horizontal weathering streaks
    for (let i = 0; i < w / 14; i++) {
      ctx.fillStyle = `rgba(60,40,20,${0.05 + Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 90, 1.5);
    }
    // a few cracks
    ctx.strokeStyle = "rgba(40,25,12,0.25)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      let x = Math.random() * w, y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        x += (Math.random() - 0.5) * 60;
        y += (Math.random() - 0.5) * 50;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // A repeating hieroglyph band. Returns by drawing into ctx in [x,y,w,h].
  function hieroBand(ctx, x, y, w, h) {
    ctx.save();
    ctx.translate(x, y);
    // frame
    ctx.fillStyle = "rgba(44,29,15,0.12)";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = Math.max(2, h * 0.04);
    ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - ctx.lineWidth * 2, h - ctx.lineWidth * 2);

    const glyphs = drawGlyphSet();
    const n = Math.max(1, Math.floor(w / (h * 0.85)));
    const step = w / n;
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.translate(i * step + step * 0.5, h * 0.5);
      const g = glyphs[(i + (x | 0)) % glyphs.length];
      ctx.scale(h * 0.5, h * 0.5);
      ctx.strokeStyle = PAL.ink;
      ctx.fillStyle = PAL.ink;
      ctx.lineWidth = 0.12;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      g(ctx);
      ctx.restore();
    }
    ctx.restore();
  }

  // A small library of stylised glyphs drawn in a unit box [-1,1].
  function drawGlyphSet() {
    return [
      // ankh
      (c) => {
        c.beginPath();
        c.ellipse(0, -0.45, 0.32, 0.4, 0, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.moveTo(0, -0.05); c.lineTo(0, 0.8);
        c.moveTo(-0.4, 0.18); c.lineTo(0.4, 0.18);
        c.stroke();
      },
      // eye of horus (simplified)
      (c) => {
        c.beginPath();
        c.moveTo(-0.7, 0); c.quadraticCurveTo(0, -0.6, 0.7, 0);
        c.quadraticCurveTo(0, 0.4, -0.7, 0);
        c.stroke();
        c.beginPath();
        c.arc(0, -0.05, 0.18, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.moveTo(0.7, 0); c.lineTo(0.95, 0.45);
        c.moveTo(0.1, 0.2); c.quadraticCurveTo(0.2, 0.7, -0.1, 0.85);
        c.stroke();
      },
      // wave / water
      (c) => {
        c.beginPath();
        for (let k = -1; k <= 1; k += 0.5) {
          c.moveTo(-0.9, k * 0.5);
          c.quadraticCurveTo(-0.45, k * 0.5 - 0.25, 0, k * 0.5);
          c.quadraticCurveTo(0.45, k * 0.5 + 0.25, 0.9, k * 0.5);
        }
        c.stroke();
      },
      // sun disk
      (c) => {
        c.beginPath(); c.arc(0, 0, 0.42, 0, Math.PI * 2); c.stroke();
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
          c.beginPath();
          c.moveTo(Math.cos(a) * 0.5, Math.sin(a) * 0.5);
          c.lineTo(Math.cos(a) * 0.78, Math.sin(a) * 0.78);
          c.stroke();
        }
      },
      // feather of Ma'at
      (c) => {
        c.beginPath();
        c.moveTo(0, 0.85);
        c.quadraticCurveTo(-0.5, 0, -0.15, -0.85);
        c.quadraticCurveTo(0.5, 0, 0, 0.85);
        c.stroke();
      },
      // bird (horus falcon, abstract)
      (c) => {
        c.beginPath();
        c.moveTo(-0.8, 0.2);
        c.quadraticCurveTo(0, -0.5, 0.8, 0.1);
        c.quadraticCurveTo(0.2, 0.1, 0, 0.7);
        c.quadraticCurveTo(-0.2, 0.2, -0.8, 0.2);
        c.stroke();
        c.beginPath(); c.arc(-0.6, 0.0, 0.08, 0, Math.PI * 2); c.fill();
      },
      // zigzag (n)
      (c) => {
        c.beginPath();
        c.moveTo(-0.8, -0.4);
        c.lineTo(-0.3, 0.4); c.lineTo(0.2, -0.4); c.lineTo(0.7, 0.4);
        c.stroke();
      },
      // reed
      (c) => {
        c.beginPath();
        c.moveTo(0, 0.85); c.lineTo(0, -0.4);
        c.quadraticCurveTo(0.35, -0.55, 0.5, -0.85);
        c.quadraticCurveTo(0.05, -0.6, 0, -0.4);
        c.stroke();
      },
    ];
  }

  // Draw a profile Egyptian figure (canon proportions) at given box.
  // opts: { tunic, skin, stride (0..1 for leg spread), arm ('up'|'fwd') }
  function drawFigure(ctx, x, y, w, h, opts) {
    opts = opts || {};
    const tunic = opts.tunic || PAL.red;
    const skin = opts.skin || PAL.skin;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const stride = opts.stride == null ? 0.4 : opts.stride;
    const cx = w * 0.5;

    // legs (profile, striding)
    ctx.strokeStyle = skin;
    ctx.lineWidth = w * 0.14;
    // back leg
    ctx.beginPath();
    ctx.moveTo(cx, h * 0.62);
    ctx.lineTo(cx - w * 0.22 * stride, h * 0.98);
    ctx.stroke();
    // front leg
    ctx.beginPath();
    ctx.moveTo(cx, h * 0.62);
    ctx.lineTo(cx + w * 0.26 * stride, h * 0.98);
    ctx.stroke();

    // kilt / tunic
    ctx.fillStyle = tunic;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.18, h * 0.42);
    ctx.lineTo(cx + w * 0.2, h * 0.42);
    ctx.lineTo(cx + w * 0.26, h * 0.68);
    ctx.lineTo(cx - w * 0.24, h * 0.68);
    ctx.closePath();
    ctx.fill();

    // torso (skin)
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.16, h * 0.46);
    ctx.lineTo(cx + w * 0.16, h * 0.46);
    ctx.lineTo(cx + w * 0.1, h * 0.24);
    ctx.lineTo(cx - w * 0.1, h * 0.24);
    ctx.closePath();
    ctx.fill();

    // arm
    ctx.strokeStyle = skin;
    ctx.lineWidth = w * 0.1;
    ctx.beginPath();
    ctx.moveTo(cx, h * 0.3);
    if (opts.arm === "up") {
      ctx.lineTo(cx + w * 0.28, h * 0.06);
    } else {
      ctx.lineTo(cx + w * 0.34, h * 0.46);
    }
    ctx.stroke();

    // head (profile)
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(cx + w * 0.03, h * 0.15, w * 0.13, 0, Math.PI * 2);
    ctx.fill();
    // nemes / hair
    ctx.fillStyle = opts.headdress || PAL.black;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.12, h * 0.05);
    ctx.lineTo(cx + w * 0.18, h * 0.05);
    ctx.lineTo(cx + w * 0.2, h * 0.2);
    ctx.lineTo(cx + w * 0.1, h * 0.2);
    ctx.lineTo(cx - w * 0.1, h * 0.28);
    ctx.lineTo(cx - w * 0.14, h * 0.12);
    ctx.closePath();
    ctx.fill();
    // eye
    ctx.fillStyle = PAL.ink;
    ctx.beginPath();
    ctx.arc(cx + w * 0.08, h * 0.14, w * 0.018, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ---------- public texture builders ----------

  // Background mural for a wall section, with title band + scene.
  function muralTexture(BABYLON, scene, def) {
    const W = 1024, H = 512;
    const tex = new BABYLON.DynamicTexture("mural_" + def.id, { width: W, height: H }, scene, true);
    const ctx = tex.getContext();
    agedStone(ctx, W, H, def.bg || PAL.stone);

    // top + bottom hieroglyph bands
    hieroBand(ctx, 30, 18, W - 60, 56);
    hieroBand(ctx, 30, H - 74, W - 60, 56);

    // title
    ctx.fillStyle = PAL.ink;
    ctx.font = "bold 40px Georgia, serif";
    ctx.textBaseline = "top";
    ctx.fillText(def.title, 48, 92);

    // scene art per type
    if (def.scene === "nile") drawNileScene(ctx, W, H);
    else if (def.scene === "sun") drawSunScene(ctx, W, H);
    else if (def.scene === "anubis") drawAnubisScene(ctx, W, H);
    else if (def.scene === "barque") drawBarqueScene(ctx, W, H);
    else drawNileScene(ctx, W, H);

    tex.update();
    return tex;
  }

  function drawNileScene(ctx, W, H) {
    // water line
    ctx.strokeStyle = PAL.blue;
    ctx.lineWidth = 4;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      let yy = H * 0.78 + k * 8;
      ctx.moveTo(60, yy);
      for (let xx = 60; xx < W - 60; xx += 40) {
        ctx.quadraticCurveTo(xx + 20, yy - 8, xx + 40, yy);
      }
      ctx.stroke();
    }
    // a row of workers
    for (let i = 0; i < 4; i++) {
      drawFigure(ctx, 150 + i * 150, 200, 130, 250, {
        tunic: i % 2 ? PAL.red : PAL.teal,
        stride: 0.5,
        arm: "fwd",
      });
    }
  }

  function drawSunScene(ctx, W, H) {
    // arc path
    ctx.strokeStyle = "rgba(212,160,23,0.5)";
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(120, H * 0.7);
    ctx.quadraticCurveTo(W / 2, 90, W - 120, H * 0.7);
    ctx.stroke();
    ctx.setLineDash([]);
    // sun disk at left (start)
    ctx.fillStyle = PAL.gold;
    ctx.beginPath();
    ctx.arc(150, H * 0.66, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PAL.gold;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      ctx.beginPath();
      ctx.moveTo(150 + Math.cos(a) * 40, H * 0.66 + Math.sin(a) * 40);
      ctx.lineTo(150 + Math.cos(a) * 56, H * 0.66 + Math.sin(a) * 56);
      ctx.stroke();
    }
    // two priests raising arms
    drawFigure(ctx, 380, 210, 130, 250, { tunic: PAL.white, arm: "up", stride: 0.2 });
    drawFigure(ctx, 560, 210, 130, 250, { tunic: PAL.white, arm: "up", stride: 0.2 });
  }

  // a single reed boat (papyrus skiff) centred in [cx,cy] at scale s
  function drawReedBoat(ctx, cx, cy, s, withSail) {
    ctx.save();
    ctx.translate(cx, cy);
    // crescent hull with upturned ends
    ctx.fillStyle = PAL.red;
    ctx.beginPath();
    ctx.moveTo(-1.5 * s, 0);
    ctx.quadraticCurveTo(-1.7 * s, -0.7 * s, -1.9 * s, -0.9 * s);
    ctx.quadraticCurveTo(-1.0 * s, -0.2 * s, 0, -0.18 * s);
    ctx.quadraticCurveTo(1.0 * s, -0.2 * s, 1.9 * s, -0.9 * s);
    ctx.quadraticCurveTo(1.7 * s, -0.7 * s, 1.5 * s, 0);
    ctx.quadraticCurveTo(0, 0.5 * s, -1.5 * s, 0);
    ctx.fill();
    // lashing lines
    ctx.strokeStyle = "rgba(40,25,12,0.5)"; ctx.lineWidth = Math.max(1, 0.04 * s);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(i * 0.5 * s, -0.1 * s); ctx.lineTo(i * 0.5 * s, 0.28 * s); ctx.stroke();
    }
    if (withSail) {
      ctx.strokeStyle = PAL.ink; ctx.lineWidth = Math.max(2, 0.06 * s);
      ctx.beginPath(); ctx.moveTo(0, -0.18 * s); ctx.lineTo(0, -1.5 * s); ctx.stroke();
      ctx.fillStyle = PAL.white;
      ctx.fillRect(0.05 * s, -1.45 * s, 0.9 * s, 1.0 * s);
      ctx.strokeStyle = "rgba(40,25,12,0.3)";
      ctx.strokeRect(0.05 * s, -1.45 * s, 0.9 * s, 1.0 * s);
    }
    ctx.restore();
  }

  function drawBarqueScene(ctx, W, H) {
    // water band
    ctx.fillStyle = "rgba(47,111,143,0.25)";
    ctx.fillRect(40, H * 0.5, W - 80, H * 0.4);
    ctx.strokeStyle = PAL.blue; ctx.lineWidth = 4;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      let yy = H * 0.55 + k * 18;
      ctx.moveTo(60, yy);
      for (let xx = 60; xx < W - 60; xx += 44) ctx.quadraticCurveTo(xx + 22, yy - 9, xx + 44, yy);
      ctx.stroke();
    }
    // sun
    ctx.fillStyle = PAL.gold;
    ctx.beginPath(); ctx.arc(W - 150, 150, 38, 0, Math.PI * 2); ctx.fill();
    // the barque mid-river
    drawReedBoat(ctx, W * 0.5, H * 0.62, 70, true);
    // a standing boatman
    drawFigure(ctx, W * 0.5 + 30, H * 0.3, 90, 170, { tunic: PAL.white, arm: "fwd", stride: 0.1 });
  }

  function drawAnubisScene(ctx, W, H) {
    const cx = W * 0.5, baseY = H * 0.86;
    ctx.save();
    // body
    ctx.fillStyle = PAL.black;
    ctx.fillRect(cx - 35, baseY - 230, 70, 230);
    // kilt
    ctx.fillStyle = PAL.gold;
    ctx.fillRect(cx - 42, baseY - 120, 84, 60);
    // jackal head
    ctx.fillStyle = PAL.black;
    ctx.beginPath();
    ctx.moveTo(cx - 10, baseY - 300);
    ctx.lineTo(cx + 55, baseY - 250); // snout
    ctx.lineTo(cx + 20, baseY - 238);
    ctx.lineTo(cx + 22, baseY - 210);
    ctx.lineTo(cx - 30, baseY - 220);
    ctx.closePath();
    ctx.fill();
    // ears
    ctx.beginPath();
    ctx.moveTo(cx - 8, baseY - 300);
    ctx.lineTo(cx - 22, baseY - 360);
    ctx.lineTo(cx + 6, baseY - 310);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 12, baseY - 300);
    ctx.lineTo(cx + 2, baseY - 360);
    ctx.lineTo(cx + 28, baseY - 306);
    ctx.fill();
    // eye glow
    ctx.fillStyle = "#ffae3b";
    ctx.beginPath();
    ctx.arc(cx + 8, baseY - 258, 5, 0, Math.PI * 2);
    ctx.fill();
    // was-scepter
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx + 60, baseY - 230);
    ctx.lineTo(cx + 60, baseY);
    ctx.stroke();
    ctx.restore();
  }

  // A full standing Anubis figure that fits a portrait box [0..W, 0..H]
  // (transparent bg) — used for the 2D boss sprite.
  function drawAnubisFigure(ctx, W, H) {
    const cx = W / 2;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    // legs
    ctx.fillStyle = PAL.black;
    ctx.fillRect(cx - 34, H * 0.72, 26, H * 0.24);
    ctx.fillRect(cx + 8, H * 0.72, 26, H * 0.24);
    // kilt
    ctx.fillStyle = PAL.gold;
    ctx.beginPath();
    ctx.moveTo(cx - 40, H * 0.58); ctx.lineTo(cx + 40, H * 0.58);
    ctx.lineTo(cx + 46, H * 0.74); ctx.lineTo(cx - 46, H * 0.74); ctx.closePath(); ctx.fill();
    // torso
    ctx.fillStyle = PAL.black;
    ctx.fillRect(cx - 36, H * 0.34, 72, H * 0.26);
    // arms
    ctx.fillRect(cx - 58, H * 0.35, 22, H * 0.22);
    ctx.fillRect(cx + 36, H * 0.35, 22, H * 0.22);
    // jackal head
    ctx.fillStyle = PAL.black;
    ctx.fillRect(cx - 30, H * 0.16, 60, H * 0.16); // skull
    ctx.beginPath(); // snout
    ctx.moveTo(cx + 26, H * 0.2); ctx.lineTo(cx + 64, H * 0.25);
    ctx.lineTo(cx + 26, H * 0.29); ctx.closePath(); ctx.fill();
    // ears
    ctx.beginPath();
    ctx.moveTo(cx - 26, H * 0.16); ctx.lineTo(cx - 34, H * 0.06); ctx.lineTo(cx - 8, H * 0.15); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 26, H * 0.16); ctx.lineTo(cx + 18, H * 0.06); ctx.lineTo(cx + 4, H * 0.15); ctx.closePath(); ctx.fill();
    // glowing violet eye
    ctx.fillStyle = "#c79bff";
    ctx.beginPath(); ctx.arc(cx + 16, H * 0.225, 6, 0, Math.PI * 2); ctx.fill();
    // was-staff
    ctx.strokeStyle = PAL.gold; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(cx + 58, H * 0.2); ctx.lineTo(cx + 58, H * 0.78); ctx.stroke();
  }

  // Standalone "living" character texture (transparent bg) for the 2D figure
  // and for the peeled-off 3D companion sprite. `kind` selects appearance.
  function characterTexture(BABYLON, scene, kind) {
    // boats are wide, so use a landscape canvas for them
    const W = kind === "boat" ? 512 : 256, H = kind === "boat" ? 256 : 512;
    const tex = new BABYLON.DynamicTexture("char_" + kind, { width: W, height: H }, scene, true);
    tex.hasAlpha = true;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, W, H);

    if (kind === "boat") {
      drawReedBoat(ctx, W * 0.5, H * 0.6, 90, true);
    } else if (kind === "anubis") {
      drawAnubisFigure(ctx, W, H);
    } else if (kind === "priest") {
      drawFigure(ctx, W * 0.5 - 80, 60, 160, 400, { tunic: PAL.white, arm: "up" });
    } else if (kind === "climber") {
      // facing the wall, both limbs reaching up to climb
      drawFigure(ctx, W * 0.5 - 80, 60, 160, 400, { tunic: PAL.teal, arm: "up", stride: 0.7, skin: PAL.skinHi });
    } else {
      // worker (default red tunic, like the reference video)
      drawFigure(ctx, W * 0.5 - 80, 60, 160, 400, { tunic: PAL.red, arm: "fwd", stride: 0.6 });
    }
    tex.update();
    return tex;
  }

  // Ragged "torn plaster" patch — a lighter cream blob with jagged edges and
  // a transparent surround. This is the area a fresco figure "comes alive" in.
  function tornPatchTexture(BABYLON, scene) {
    const S = 512;
    const tex = new BABYLON.DynamicTexture("tornPatch", { width: S, height: S }, scene, true);
    tex.hasAlpha = true;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, S, S);
    const cx = S / 2, cy = S / 2;
    // main jagged blob
    function blob(rx, ry, jitter, fill) {
      ctx.beginPath();
      const steps = 46;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const r = 1 + (Math.sin(a * 7) * 0.06) + (Math.random() - 0.5) * jitter;
        const x = cx + Math.cos(a) * rx * r;
        const y = cy + Math.sin(a) * ry * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    }
    // soft outer faded ring (worn edge)
    blob(S * 0.42, S * 0.42, 0.14, "rgba(240,226,189,0.55)");
    blob(S * 0.37, S * 0.37, 0.10, "#efe1bd"); // bright fresh plaster
    // subtle inner cracks/mottle
    ctx.strokeStyle = "rgba(120,95,55,0.18)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      let x = cx + (Math.random() - 0.5) * S * 0.4, y = cy + (Math.random() - 0.5) * S * 0.4;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) { x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    // a few detached flecks around the edge (torn debris)
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, r = S * (0.4 + Math.random() * 0.08);
      ctx.fillStyle = "rgba(239,225,189,0.7)";
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3 + Math.random() * 7, 0, Math.PI * 2);
      ctx.fill();
    }
    tex.update();
    return tex;
  }

  // Plain hieroglyph panel texture for decorating pillars / walls.
  function glyphPanelTexture(BABYLON, scene, id) {
    const W = 256, H = 512;
    const tex = new BABYLON.DynamicTexture("glyphpanel_" + id, { width: W, height: H }, scene, true);
    const ctx = tex.getContext();
    agedStone(ctx, W, H);
    for (let i = 0; i < 7; i++) {
      hieroBand(ctx, 24, 20 + i * 68, W - 48, 56);
    }
    tex.update();
    return tex;
  }

  global.Art = {
    PAL,
    muralTexture,
    characterTexture,
    glyphPanelTexture,
    tornPatchTexture,
  };
})(window);
