/* ==========================================================================
   DCreator – background effects (canvas)
   · A 3D wire lattice (perspective grid with depth) that tilts with the mouse.
   · Holographic particles that follow the cursor, glow, flicker and dissolve.
   Night = neon green / cyan on black, day = soft blue / teal on white.
   ========================================================================== */
(function () {
  const canvas = document.getElementById("fx-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const html = document.documentElement;

  /* ---- lattice geometry ---- */
  const GAP = 130;            // world units between nodes
  const Z_NEAR = 330;
  const SPEED = 0.014;        // units per ms – grid drifts toward the viewer
  const LEVELS_BASE = 6;
  const LEVELS_GLOW = 5;
  const GLOW_RADIUS = 200;    // px around the cursor that lights the grid
  let COLS = 13, ROWS = 9, DEPTH = 9, Z_FAR = Z_NEAR + DEPTH * GAP, FOCAL = 620;
  let SX = new Float32Array(0), SY = new Float32Array(0), SA = new Float32Array(0);

  /* ---- state ---- */
  let w = 0, h = 0, dpr = 1, raf = 0, last = 0, enabled = false;
  const mouse = { x: -9999, y: -9999, active: false, sx: 0, sy: 0, energy: 0, lastX: 0, lastY: 0, acc: 0 };
  const particles = [];
  const MAX_PARTICLES = 260;

  const segBase = Array.from({ length: LEVELS_BASE }, () => []);
  const segGlow = Array.from({ length: LEVELS_GLOW }, () => []);
  const glowNodes = [];

  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const big = w > 1100, mid = w > 700;
    COLS = big ? 15 : mid ? 11 : 9;
    ROWS = h > w ? 11 : 9;
    DEPTH = mid ? 9 : 7;
    Z_FAR = Z_NEAR + DEPTH * GAP;
    FOCAL = clamp(Math.max(w, h) * 0.42, 380, 820);

    const nodes = COLS * ROWS * (DEPTH + 1);
    SX = new Float32Array(nodes);
    SY = new Float32Array(nodes);
    SA = new Float32Array(nodes);
  }

  /* ---------- lattice ---------- */
  function drawLattice(now, day) {
    const off = (now * SPEED) % GAP;
    const cz = Z_NEAR + (DEPTH * GAP) / 2;
    const yaw = -mouse.sx * 0.42 + Math.sin(now / 5200) * 0.045;
    const pitch = mouse.sy * 0.26 + Math.cos(now / 6800) * 0.03;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cx = w / 2, cy = h * 0.5;
    const span = Z_FAR - Z_NEAR;
    const layers = DEPTH + 1;

    /* pass 1 – project every node */
    let n = 0;
    for (let k = 0; k < layers; k++) {
      const z = Z_NEAR + k * GAP - off - cz;
      for (let j = 0; j < ROWS; j++) {
        const y = (j - (ROWS - 1) / 2) * GAP;
        for (let i = 0; i < COLS; i++, n++) {
          const x = (i - (COLS - 1) / 2) * GAP;
          const z1 = -x * syw + z * cyw;
          const z2 = y * sp + z1 * cp + cz;
          if (z2 < 90) { SA[n] = 0; continue; }
          const x1 = x * cyw + z * syw;
          const y1 = y * cp - z1 * sp;
          const s = FOCAL / z2;
          SX[n] = cx + x1 * s;
          SY[n] = cy + y1 * s;
          const d = clamp((z2 - Z_NEAR) / span, 0, 1);
          const near = clamp((z2 - 200) / GAP, 0, 1);
          SA[n] = Math.pow(1 - d, 1.3) * near;
        }
      }
    }

    /* pass 2 – bucket segments by brightness so each bucket is one stroke */
    for (const b of segBase) b.length = 0;
    for (const b of segGlow) b.length = 0;
    glowNodes.length = 0;
    const maxBase = day ? 0.28 : 0.22;
    const energy = mouse.energy;
    const hx = mouse.x, hy = mouse.y;
    const plane = ROWS * COLS;

    const seg = (a, b) => {
      const sa = SA[a], sb = SA[b];
      if (sa <= 0.004 || sb <= 0.004) return;
      const al = (sa + sb) * 0.5;
      const x1 = SX[a], y1 = SY[a], x2 = SX[b], y2 = SY[b];
      const bi = Math.min(LEVELS_BASE - 1, ((al * 0.9 * LEVELS_BASE) | 0));
      segBase[bi].push(x1, y1, x2, y2);
      if (energy > 0.02) {
        const dx = (x1 + x2) * 0.5 - hx, dy = (y1 + y2) * 0.5 - hy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < GLOW_RADIUS) {
          const g = 1 - dist / GLOW_RADIUS;
          const gs = g * g * (0.45 + 0.55 * al) * energy;
          const gi = Math.min(LEVELS_GLOW - 1, (gs * LEVELS_GLOW) | 0);
          if (gs > 0.04) segGlow[gi].push(x1, y1, x2, y2);
        }
      }
    };

    n = 0;
    for (let k = 0; k < layers; k++) {
      for (let j = 0; j < ROWS; j++) {
        for (let i = 0; i < COLS; i++, n++) {
          if (SA[n] <= 0.004) continue;
          if (i < COLS - 1) seg(n, n + 1);
          if (j < ROWS - 1) seg(n, n + COLS);
          if (k < DEPTH) seg(n, n + plane);
          if (energy > 0.02) {
            const dx = SX[n] - hx, dy = SY[n] - hy;
            const d2 = dx * dx + dy * dy;
            if (d2 < 130 * 130) glowNodes.push(SX[n], SY[n], (1 - Math.sqrt(d2) / 130) * SA[n] * energy);
          }
        }
      }
    }

    /* draw */
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    const baseRGB = day ? "0,120,175" : "0,229,255";
    for (let b = 0; b < LEVELS_BASE; b++) {
      const s = segBase[b];
      if (!s.length) continue;
      ctx.beginPath();
      for (let i = 0; i < s.length; i += 4) { ctx.moveTo(s[i], s[i + 1]); ctx.lineTo(s[i + 2], s[i + 3]); }
      ctx.strokeStyle = "rgba(" + baseRGB + "," + (((b + 1) / LEVELS_BASE) * maxBase).toFixed(3) + ")";
      ctx.stroke();
    }

    ctx.globalCompositeOperation = day ? "source-over" : "lighter";
    ctx.lineWidth = 1.5;
    const glowRGB = day ? "0,175,120" : "0,255,136";
    for (let b = 0; b < LEVELS_GLOW; b++) {
      const s = segGlow[b];
      if (!s.length) continue;
      ctx.beginPath();
      for (let i = 0; i < s.length; i += 4) { ctx.moveTo(s[i], s[i + 1]); ctx.lineTo(s[i + 2], s[i + 3]); }
      ctx.strokeStyle = "rgba(" + glowRGB + "," + (((b + 1) / LEVELS_GLOW) * (day ? 0.75 : 0.9)).toFixed(3) + ")";
      ctx.stroke();
    }
    for (let i = 0; i < glowNodes.length; i += 3) {
      const a = glowNodes[i + 2];
      ctx.fillStyle = "rgba(" + glowRGB + "," + (a * 0.9).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(glowNodes[i], glowNodes[i + 1], 1.2 + a * 2.6, 0, 6.2832);
      ctx.fill();
    }
  }

  /* ---------- hologram particles ---------- */
  function spawn(x, y) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push({
      x: x + rnd(-9, 9),
      y: y + rnd(-9, 9),
      vx: rnd(-0.3, 0.3),
      vy: rnd(-0.55, 0.05),
      life: 0,
      max: rnd(900, 1800),
      size: rnd(1.3, 3.1),
      dash: Math.random() < 0.45,
      len: rnd(7, 22),
      seed: Math.random() * 1000
    });
  }

  function drawParticles(dt, now, day) {
    if (!particles.length) return;
    ctx.globalCompositeOperation = day ? "source-over" : "lighter";
    const rgb = day ? "0,170,125" : "0,255,136";
    const rgb2 = day ? "0,150,200" : "0,229,255";

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      const t = p.life / p.max;
      if (t >= 1) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt / 16;
      p.y += p.vy * dt / 16;
      p.vx *= 0.996;

      /* hologram flicker – smooth shimmer plus occasional hard glitch */
      const shimmer = 0.7 + 0.3 * Math.sin(now * 0.02 + p.seed);
      const glitch = Math.random() < 0.04 ? 0.25 : 1;
      let a = Math.pow(1 - t, 1.5) * shimmer * glitch * (day ? 0.8 : 1);
      const jx = Math.random() < 0.03 ? rnd(-5, 5) : 0;

      /* dissolve: in the last 40 % of its life the particle breaks into drifting fragments */
      const k = t > 0.6 ? (t - 0.6) / 0.4 : 0;
      const frags = k > 0 ? 3 : 1;
      for (let f = 0; f < frags; f++) {
        const fx = k ? Math.sin(p.seed * (f + 1.7)) * k * 16 : 0;
        const fy = k ? Math.cos(p.seed * (f + 2.3)) * k * 10 - k * 9 : 0;
        const x = p.x + fx + jx, y = p.y + fy;
        const sz = p.size * (1 - k * 0.65);
        const fa = k ? a * (1 - k * 0.35) : a;

        if (p.dash) {
          const len = p.len * (1 - t * 0.5) * (k ? 0.45 : 1);
          ctx.fillStyle = "rgba(" + rgb + "," + (fa * 0.16).toFixed(3) + ")";
          ctx.fillRect(x - len / 2 - 2, y - 2, len + 4, 5);
          ctx.fillStyle = "rgba(" + rgb + "," + (fa * 0.95).toFixed(3) + ")";
          ctx.fillRect(x - len / 2, y, len, 1.4);
        } else {
          ctx.fillStyle = "rgba(" + rgb + "," + (fa * 0.16).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(x, y, sz * 3.4, 0, 6.2832); ctx.fill();
          ctx.fillStyle = "rgba(" + (f % 2 ? rgb2 : rgb) + "," + fa.toFixed(3) + ")";
          ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
        }
      }
    }
  }

  /* ---------- loop ---------- */
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(48, now - (last || now));
    last = now;

    const tx = mouse.active ? clamp(mouse.x / w - 0.5, -0.5, 0.5) : 0;
    const ty = mouse.active ? clamp(mouse.y / h - 0.5, -0.5, 0.5) : 0;
    mouse.sx += (tx - mouse.sx) * 0.06;
    mouse.sy += (ty - mouse.sy) * 0.06;
    mouse.energy += ((mouse.active ? 1 : 0) - mouse.energy) * 0.08;

    const day = html.dataset.theme === "day";
    ctx.clearRect(0, 0, w, h);
    drawLattice(now, day);
    drawParticles(dt, now, day);
    ctx.globalCompositeOperation = "source-over";
  }

  function start() {
    if (raf || !enabled) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  /* ---------- input ---------- */
  window.addEventListener("pointermove", (e) => {
    if (!enabled) return;
    mouse.active = true;
    const dx = e.clientX - mouse.lastX, dy = e.clientY - mouse.lastY;
    mouse.lastX = e.clientX; mouse.lastY = e.clientY;
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.acc += Math.sqrt(dx * dx + dy * dy);
    let spawned = 0;
    while (mouse.acc > 12 && spawned < 5) { spawn(mouse.x, mouse.y); mouse.acc -= 12; spawned++; }
    if (mouse.acc > 60) mouse.acc = 0;
  }, { passive: true });
  document.addEventListener("mouseleave", () => { mouse.active = false; });
  window.addEventListener("blur", () => { mouse.active = false; });
  window.addEventListener("resize", () => { if (enabled) resize(); });
  document.addEventListener("visibilitychange", () => { document.hidden ? stop() : start(); });

  /* ---------- public API ---------- */
  function set(on) {
    enabled = !!on;
    if (enabled) {
      resize();
      start();
    } else {
      stop();
      particles.length = 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  DC.effects = { set, get enabled() { return enabled; } };
})();
