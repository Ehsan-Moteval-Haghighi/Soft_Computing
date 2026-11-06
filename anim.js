/* Background animations: flow field (home), deforming mesh (mechanics), neural network (machine learning). */
(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TEAL = [124, 199, 201];
  const GOLD = [244, 199, 122];

  function setup(canvas, init, frame) {
    const ctx = canvas.getContext("2d");
    const state = { w: 0, h: 0, t: 0, mouse: { x: -9999, y: -9999 }, visible: true, raf: null };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.w = canvas.clientWidth;
      state.h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(state.w * dpr));
      canvas.height = Math.max(1, Math.floor(state.h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      init(ctx, state);
    }

    function loop() {
      state.t += 1;
      frame(ctx, state);
      state.raf = state.visible && !reduceMotion ? requestAnimationFrame(loop) : null;
    }

    let timer;
    window.addEventListener("resize", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        resize();
        if (reduceMotion) frame(ctx, state);
      }, 150);
    });

    const host = canvas.parentElement;
    host.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      state.mouse.x = e.clientX - r.left;
      state.mouse.y = e.clientY - r.top;
    });
    host.addEventListener("pointerleave", () => {
      state.mouse.x = state.mouse.y = -9999;
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        state.visible = entry.isIntersecting;
        if (state.visible && state.raf === null && !reduceMotion) state.raf = requestAnimationFrame(loop);
      }).observe(canvas);
    }

    resize();
    if (reduceMotion) {
      for (let i = 0; i < 120; i++) {
        state.t += 1;
        frame(ctx, state);
      }
    } else {
      state.raf = requestAnimationFrame(loop);
    }
  }

  /* ---------- 1. Flow field: particles advected through a smooth velocity field ---------- */
  function flow(canvas) {
    let parts = [];
    const bg = "rgba(9, 16, 21, ";
    function field(x, y, t) {
      const s = 0.0019;
      return (
        Math.sin(x * s + t * 0.0016) * 1.6 +
        Math.cos(y * s * 1.3 - t * 0.0011) * 1.4 +
        Math.sin((x + y) * s * 0.6 + t * 0.0007) * 1.1
      );
    }
    setup(
      canvas,
      (ctx, st) => {
        const n = Math.min(1800, Math.floor((st.w * st.h) / 700));
        parts = Array.from({ length: n }, (_, i) => ({
          x: Math.random() * st.w,
          y: Math.random() * st.h,
          life: Math.random() * 400,
          c: i % 7 === 0 ? GOLD : TEAL,
          s: 0.6 + Math.random() * 1.1,
        }));
        ctx.fillStyle = "#091015";
        ctx.fillRect(0, 0, st.w, st.h);
      },
      (ctx, st) => {
        ctx.fillStyle = bg + "0.06)";
        ctx.fillRect(0, 0, st.w, st.h);
        ctx.lineWidth = 1.4;
        for (const p of parts) {
          const a = field(p.x, p.y, st.t);
          let vx = Math.cos(a) * p.s;
          let vy = Math.sin(a) * p.s;
          const dx = p.x - st.mouse.x;
          const dy = p.y - st.mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 22000) {
            const f = (22000 - d2) / 22000;
            vx += (dx / Math.sqrt(d2 + 1)) * f * 2.4;
            vy += (dy / Math.sqrt(d2 + 1)) * f * 2.4;
          }
          const nx = p.x + vx;
          const ny = p.y + vy;
          const alpha = Math.min(1, p.life / 60) * 0.85;
          ctx.strokeStyle = `rgba(${p.c[0]}, ${p.c[1]}, ${p.c[2]}, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(nx, ny);
          ctx.stroke();
          p.x = nx;
          p.y = ny;
          p.life -= 1;
          if (p.life < 0 || p.x < -10 || p.x > st.w + 10 || p.y < -10 || p.y > st.h + 10) {
            p.x = Math.random() * st.w;
            p.y = Math.random() * st.h;
            p.life = 200 + Math.random() * 300;
          }
        }
      }
    );
  }

  /* ---------- 2. Deforming finite element mesh coloured by strain ---------- */
  function mesh(canvas) {
    let nodes = [];
    let cols = 0;
    let rows = 0;
    function ramp(v) {
      const k = Math.max(0, Math.min(1, v));
      const r = Math.round(30 + k * 214);
      const g = Math.round(90 + k * 109 - k * k * 60);
      const b = Math.round(99 + k * 23 - k * 60);
      return [r, g, b];
    }
    setup(
      canvas,
      (ctx, st) => {
        const size = Math.max(34, Math.min(56, st.w / 22));
        cols = Math.ceil(st.w / size) + 3;
        rows = Math.ceil(st.h / (size * 0.866)) + 3;
        nodes = [];
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            nodes.push({
              x0: (i - 1) * size + (j % 2 ? size / 2 : 0),
              y0: (j - 1) * size * 0.866,
              x: 0,
              y: 0,
              e: 0,
            });
          }
        }
      },
      (ctx, st) => {
        const t = st.t * 0.012;
        ctx.clearRect(0, 0, st.w, st.h);
        for (const n of nodes) {
          const wave = Math.sin(n.x0 * 0.008 - t) * Math.cos(n.y0 * 0.006 + t * 0.6);
          const dx = n.x0 - st.mouse.x;
          const dy = n.y0 - st.mouse.y;
          const pull = Math.exp(-(dx * dx + dy * dy) / 26000);
          n.x = n.x0 + wave * 9 + Math.sin(n.y0 * 0.01 + t) * 4 - dx * pull * 0.18;
          n.y = n.y0 + Math.cos(n.x0 * 0.01 - t * 0.8) * 8 - dy * pull * 0.18;
          n.e = 0.5 + 0.5 * wave + pull * 0.6;
        }
        const id = (i, j) => j * cols + i;
        for (let j = 0; j < rows - 1; j++) {
          for (let i = 0; i < cols - 1; i++) {
            const odd = j % 2;
            const tris = odd
              ? [[id(i, j), id(i + 1, j), id(i + 1, j + 1)], [id(i, j), id(i + 1, j + 1), id(i, j + 1)]]
              : [[id(i, j), id(i + 1, j), id(i, j + 1)], [id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)]];
            for (const tri of tris) {
              const a = nodes[tri[0]];
              const b = nodes[tri[1]];
              const c = nodes[tri[2]];
              const e = (a.e + b.e + c.e) / 3;
              const col = ramp(e);
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.lineTo(c.x, c.y);
              ctx.closePath();
              ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${0.1 + e * 0.22})`;
              ctx.fill();
              ctx.strokeStyle = "rgba(200, 230, 232, 0.13)";
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          }
        }
        // a crack that opens and closes across the mesh
        const phase = (st.t % 900) / 900;
        const len = Math.min(1, phase * 1.6) * st.w * 0.55;
        const y0 = st.h * 0.3;
        ctx.strokeStyle = `rgba(244, 199, 122, ${0.75 * Math.sin(Math.PI * Math.min(1, phase * 1.15))})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(st.w * 0.08, y0);
        for (let x = 0; x <= len; x += 14) {
          ctx.lineTo(st.w * 0.08 + x, y0 + Math.sin(x * 0.05) * 6 + Math.sin(x * 0.013) * 14);
        }
        ctx.stroke();
      }
    );
  }

  /* ---------- 3. Neural network with travelling signals ---------- */
  function network(canvas) {
    let layers = [];
    let pulses = [];
    setup(
      canvas,
      (ctx, st) => {
        const sizes = st.w < 700 ? [4, 6, 6, 3] : [5, 8, 10, 8, 4];
        const padX = st.w * 0.12;
        layers = sizes.map((n, li) => {
          const x = padX + (li * (st.w - 2 * padX)) / (sizes.length - 1);
          return Array.from({ length: n }, (_, k) => ({
            x,
            y: st.h * 0.14 + ((k + 0.5) * (st.h * 0.72)) / n,
            a: Math.random() * 6.28,
          }));
        });
        pulses = [];
      },
      (ctx, st) => {
        ctx.clearRect(0, 0, st.w, st.h);
        for (let l = 0; l < layers.length - 1; l++) {
          for (const a of layers[l]) {
            for (const b of layers[l + 1]) {
              ctx.strokeStyle = "rgba(124, 199, 201, 0.08)";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y + Math.sin(st.t * 0.02 + a.a) * 3);
              ctx.lineTo(b.x, b.y + Math.sin(st.t * 0.02 + b.a) * 3);
              ctx.stroke();
            }
          }
        }
        if (st.t % 4 === 0 && pulses.length < 90) {
          const l = Math.floor(Math.random() * (layers.length - 1));
          const a = layers[l][Math.floor(Math.random() * layers[l].length)];
          const b = layers[l + 1][Math.floor(Math.random() * layers[l + 1].length)];
          pulses.push({ a, b, p: 0, c: Math.random() < 0.3 ? GOLD : TEAL });
        }
        pulses = pulses.filter((q) => q.p <= 1);
        for (const q of pulses) {
          q.p += 0.012;
          const x = q.a.x + (q.b.x - q.a.x) * q.p;
          const y = q.a.y + (q.b.y - q.a.y) * q.p;
          ctx.strokeStyle = `rgba(${q.c[0]}, ${q.c[1]}, ${q.c[2]}, 0.5)`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(q.a.x + (q.b.x - q.a.x) * Math.max(0, q.p - 0.12), q.a.y + (q.b.y - q.a.y) * Math.max(0, q.p - 0.12));
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.fillStyle = `rgba(${q.c[0]}, ${q.c[1]}, ${q.c[2]}, 0.95)`;
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, 6.283);
          ctx.fill();
        }
        for (const layer of layers) {
          for (const n of layer) {
            const y = n.y + Math.sin(st.t * 0.02 + n.a) * 3;
            const dx = n.x - st.mouse.x;
            const dy = y - st.mouse.y;
            const glow = Math.exp(-(dx * dx + dy * dy) / 9000);
            ctx.fillStyle = `rgba(9, 16, 21, 1)`;
            ctx.beginPath();
            ctx.arc(n.x, y, 6 + glow * 3, 0, 6.283);
            ctx.fill();
            ctx.strokeStyle = `rgba(124, 199, 201, ${0.55 + glow * 0.45})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }
    );
  }

  const kinds = { flow, mesh, network };
  document.querySelectorAll("canvas[data-anim]").forEach((c) => {
    const fn = kinds[c.dataset.anim];
    if (fn) fn(c);
  });

  /* ---------- Tabs ---------- */
  document.querySelectorAll("[data-tabs]").forEach((root) => {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const panels = tabs.map((t) => document.getElementById(t.getAttribute("aria-controls")));
    function show(i, focus, updateHash) {
      tabs.forEach((t, k) => {
        const on = k === i;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
      });
      const bar = tabs[i].parentElement.parentElement;
      bar.scrollLeft = tabs[i].offsetLeft - bar.clientWidth / 2 + tabs[i].clientWidth / 2;
      if (focus) tabs[i].focus();
      if (updateHash) history.replaceState(null, "", "#" + panels[i].id);
    }
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => {
        show(i, false, true);
        const bar = root.getBoundingClientRect();
        if (bar.top < 0 || bar.top > window.innerHeight * 0.5) root.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      });
      t.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") show((i + 1) % tabs.length, true, true);
        if (e.key === "ArrowLeft") show((i - 1 + tabs.length) % tabs.length, true, true);
      });
    });
    const fromHash = panels.findIndex((p) => "#" + p.id === location.hash);
    show(fromHash >= 0 ? fromHash : 0, false, false);
    if (fromHash >= 0) setTimeout(() => root.scrollIntoView(), 50);
  });

  /* ---------- Reveal on scroll ---------- */
  const reveal = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    reveal.forEach((el) => io.observe(el));
  } else {
    reveal.forEach((el) => el.classList.add("in"));
  }

  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
