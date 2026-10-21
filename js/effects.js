/* ==========================================================================
   DCreator – background effects
   · Aurora: soft colour fields drifting behind the page (CSS, see .aurora)
     that shift gently with the mouse.
   · Canvas: a fine two-layer dot field with depth parallax. Near the cursor
     the field bends like a lens and a thin mesh fades in.
   Night uses neon green / cyan, day uses soft blue / teal.
   ========================================================================== */
(function () {
  const canvas = document.getElementById("fx-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const html = document.documentElement;
  const aurora = document.querySelector(".aurora");

  /* two depth layers: far = fine and still, near = larger and shifts more */
  const LAYERS = [
    { gap: 42, size: 2, alpha: 0.30, parallax: 12, mesh: true },
    { gap: 90, size: 3, alpha: 0.38, parallax: 30, mesh: false }
  ];
  const RADIUS = 200;            // lens radius around the cursor, px

  let w = 0, h = 0, dpr = 1, raf = 0, enabled = false;
  const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, px: 0.5, py: 0.5, energy: 0, active: false };

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- dot field ---------- */
  function drawField(day) {
    const dotRGB = day ? "10,80,130" : "160,235,255";
    const accRGB = day ? "0,160,190" : "0,255,136";
    const R2 = RADIUS * RADIUS;
    const lens = mouse.energy > 0.02;

    LAYERS.forEach((layer) => {
      const gap = layer.gap;
      const offX = (0.5 - mouse.px) * layer.parallax;
      const offY = (0.5 - mouse.py) * layer.parallax;
      const cols = Math.ceil(w / gap) + 2;
      const rows = Math.ceil(h / gap) + 2;
      const half = layer.size / 2;

      /* pass 1 – every dot that is outside the lens, drawn as one path */
      ctx.fillStyle = "rgba(" + dotRGB + "," + (day ? layer.alpha * 0.9 : layer.alpha) + ")";
      ctx.beginPath();
      for (let j = 0; j < rows; j++) {
        const y = (j - 1) * gap + offY;
        for (let i = 0; i < cols; i++) {
          const x = (i - 1) * gap + offX;
          if (lens) {
            const dx = x - mouse.sx, dy = y - mouse.sy;
            if (dx * dx + dy * dy < R2) continue;
          }
          ctx.rect(x - half, y - half, layer.size, layer.size);
        }
      }
      ctx.fill();

      if (!lens) return;

      /* pass 2 – dots inside the lens are pushed outward and lit up */
      const ci = Math.round((mouse.sx - offX) / gap) + 1;
      const cj = Math.round((mouse.sy - offY) / gap) + 1;
      const span = Math.ceil(RADIUS / gap) + 1;
      const bend = (i, j) => {
        const x = (i - 1) * gap + offX, y = (j - 1) * gap + offY;
        const dx = x - mouse.sx, dy = y - mouse.sy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= R2) return null;
        const d = Math.sqrt(d2) || 1;
        const g = (1 - d / RADIUS) * mouse.energy;
        const push = g * g * layer.gap * 0.55;
        return { x: x + (dx / d) * push, y: y + (dy / d) * push, g };
      };

      if (layer.mesh) {
        ctx.lineWidth = 1;
        for (let j = cj - span; j <= cj + span; j++) {
          for (let i = ci - span; i <= ci + span; i++) {
            const a = bend(i, j);
            if (!a) continue;
            [bend(i + 1, j), bend(i, j + 1)].forEach((b) => {
              if (!b) return;
              const al = Math.min(a.g, b.g) * (day ? 0.55 : 0.5);
              if (al < 0.02) return;
              ctx.strokeStyle = "rgba(" + accRGB + "," + al.toFixed(3) + ")";
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            });
          }
        }
      }

      for (let j = cj - span; j <= cj + span; j++) {
        for (let i = ci - span; i <= ci + span; i++) {
          const p = bend(i, j);
          if (!p) continue;
          ctx.fillStyle = "rgba(" + accRGB + "," + Math.min(1, 0.25 + p.g * 0.85).toFixed(3) + ")";
          const s = layer.size * (1 + p.g * 1.4);
          ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        }
      }
    });
  }

  /* ---------- loop ---------- */
  function frame() {
    raf = requestAnimationFrame(frame);

    const tx = mouse.active ? clamp(mouse.x / w, 0, 1) : 0.5;
    const ty = mouse.active ? clamp(mouse.y / h, 0, 1) : 0.5;
    mouse.px += (tx - mouse.px) * 0.05;
    mouse.py += (ty - mouse.py) * 0.05;
    mouse.energy += ((mouse.active ? 1 : 0) - mouse.energy) * 0.1;
    if (mouse.active) {
      if (mouse.sx < -9000) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
      mouse.sx += (mouse.x - mouse.sx) * 0.22;
      mouse.sy += (mouse.y - mouse.sy) * 0.22;
    }

    if (aurora) {
      aurora.style.setProperty("--mx", ((mouse.px - 0.5) * 90).toFixed(1) + "px");
      aurora.style.setProperty("--my", ((mouse.py - 0.5) * 60).toFixed(1) + "px");
    }

    const day = html.dataset.theme === "day";
    ctx.clearRect(0, 0, w, h);
    drawField(day);
  }

  function start() { if (!raf && enabled) raf = requestAnimationFrame(frame); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  /* ---------- input ---------- */
  window.addEventListener("pointermove", (e) => {
    if (!enabled) return;
    mouse.active = true;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });
  document.addEventListener("mouseleave", () => { mouse.active = false; mouse.sx = -9999; });
  window.addEventListener("blur", () => { mouse.active = false; mouse.sx = -9999; });
  window.addEventListener("resize", () => { if (enabled) resize(); });
  document.addEventListener("visibilitychange", () => { document.hidden ? stop() : start(); });

  /* ---------- public API ---------- */
  function set(on) {
    enabled = !!on;
    if (enabled) { resize(); start(); }
    else { stop(); ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }

  DC.effects = { set, get enabled() { return enabled; } };
})();
