/* Llama RPC Farm — static site interactions */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
    if (!m) return [122, 162, 255];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function setRgbVar(name, rgb) {
    document.documentElement.style.setProperty(name, rgb.join(", "));
  }

  /* ------------------------------------------------------------ */
  /* Dot matrix backdrop                                            */
  /* ------------------------------------------------------------ */
  const canvas = $("#dotfield");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const dotState = {
    w: 0, h: 0, dpr: 1, spacing: 28, dots: [],
    pointer: { x: -9999, y: -9999, active: false },
    palette: { a: [122, 162, 255], b: [180, 156, 255] },
    last: 0,
  };

  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    dotState.palette.a = hexToRgb(cs.getPropertyValue("--accent"));
    dotState.palette.b = hexToRgb(cs.getPropertyValue("--accent-2"));
  }

  function sizeDotfield() {
    if (!canvas || !ctx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dotState.w = w;
    dotState.h = h;
    dotState.dpr = dpr;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    dotState.spacing = w < 700 ? 22 : w < 1100 ? 26 : 30;
    const dots = [];
    const gap = dotState.spacing;
    const cols = Math.ceil(w / gap) + 1;
    const rows = Math.ceil(h / gap) + 1;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        dots.push({
          x: col * gap + gap * 0.5,
          y: row * gap + gap * 0.5,
          phase: (row * 0.61 + col * 0.37) % (Math.PI * 2),
        });
      }
    }
    dotState.dots = dots;
  }

  function drawDotfield(now) {
    if (!canvas || !ctx) return;
    const { w, h, dots, palette, pointer } = dotState;
    const t = now / 1000;
    ctx.clearRect(0, 0, w, h);

    const baseSize = w < 700 ? 1.25 : 1.5;
    const [ar, ag, ab] = palette.a;
    const [br, bg, bb] = palette.b;

    for (const dot of dots) {
      const edgeFade = Math.min(1, dot.x / 90, (w - dot.x) / 90,
                                dot.y / 120, (h - dot.y) / 120);
      if (edgeFade <= 0) continue;

      const wave = 0.5 + 0.5 * Math.sin(t * 0.7 + dot.phase + (dot.x + dot.y) * 0.0027);
      let alpha = (0.10 + wave * 0.13) * Math.max(0, edgeFade);

      let size = baseSize * (0.9 + wave * 0.40);
      let r = ar, g = ag, b = ab;

      if (pointer.active) {
        const dx = dot.x - pointer.x;
        const dy = dot.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 185) {
          const heat = 1 - dist / 185;
          alpha += heat * heat * 0.34;
          size += heat * 1.35;
          const mix = heat * 0.85;
          r = Math.round(ar + (br - ar) * mix);
          g = Math.round(ag + (bg - ag) * mix);
          b = Math.round(ab + (bb - ab) * mix);
        }
      }

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(0.6, alpha)})`;
      ctx.fillRect(dot.x - size / 2, dot.y - size / 2, size, size);
    }
  }

  function dotLoop(now) {
    if (document.hidden) {
      requestAnimationFrame(dotLoop);
      return;
    }
    if (now - dotState.last >= 33) {
      dotState.last = now;
      drawDotfield(now);
    }
    requestAnimationFrame(dotLoop);
  }

  if (canvas && ctx) {
    readPalette();
    sizeDotfield();
    if (reduceMotion) {
      drawDotfield(0);
    } else {
      requestAnimationFrame(dotLoop);
      window.addEventListener("resize", () => {
        sizeDotfield();
        drawDotfield(performance.now());
      }, { passive: true });
      window.addEventListener("pointermove", (e) => {
        dotState.pointer.x = e.clientX;
        dotState.pointer.y = e.clientY;
        dotState.pointer.active = true;
        document.documentElement.style.setProperty("--mx", e.clientX + "px");
        document.documentElement.style.setProperty("--my", e.clientY + "px");
      }, { passive: true });
      document.addEventListener("pointerleave", () => {
        dotState.pointer.active = false;
      });
    }
  }

  /* ------------------------------------------------------------ */
  /* Header + mobile navigation                                     */
  /* ------------------------------------------------------------ */
  const header = $(".site-header");
  const nav = $("#site-nav");
  const navToggle = $("#nav-toggle");

  function closeNav() {
    if (!nav || !navToggle) return;
    nav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation");
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const open = !nav.classList.contains("open");
      nav.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    });
    $$("a", nav).forEach((a) => a.addEventListener("click", closeNav));
    document.addEventListener("click", (e) => {
      if (!nav.classList.contains("open")) return;
      if (nav.contains(e.target) || navToggle.contains(e.target)) return;
      closeNav();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });
  }

  function syncHeader() {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  }
  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });

  /* ------------------------------------------------------------ */
  /* Scroll reveal                                                  */
  /* ------------------------------------------------------------ */
  const revealItems = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });
    revealItems.forEach((el) => io.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add("is-visible"));
  }

  /* ------------------------------------------------------------ */
  /* Install tabs + copy buttons                                    */
  /* ------------------------------------------------------------ */
  const installCode = $("#install-code");
  const installTabs = $$(".terminal-tab");

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  function paintInstallTab(tab) {
    if (!installCode) return;
    const raw = tab === "windows"
      ? installCode.dataset.windows
      : installCode.dataset.unix;
    installCode.innerHTML = raw.split("\n").map((line) => {
      if (line.startsWith("#")) return `<span class="terminal-note">${escapeHtml(line)}</span>`;
      return `<span class="prompt">$</span> ${escapeHtml(line)}`;
    }).join("\n");
  }

  installTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      installTabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", String(active));
      });
      paintInstallTab(tab.dataset.tab);
    });
  });

  const onelineCode = $("#oneline-code");
  const onelineTabs = $$(".oneline-tab");
  const onelineNote = $("#oneline-note");

  function paintOneline(tab) {
    if (!onelineCode) return;
    const windows = tab === "windows";
    onelineCode.textContent = windows
      ? onelineCode.dataset.windows
      : onelineCode.dataset.unix;
    if (onelineNote) {
      onelineNote.innerHTML = windows
        ? 'Clones to <code>%USERPROFILE%\\Llama-RPC-Farm</code>, installs dependencies, and adds <code>farmctl</code> to your path.'
        : 'Clones to <code>~/Llama-RPC-Farm</code>, installs everything, and puts <code>farmctl</code> on your PATH.';
    }
  }

  onelineTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      onelineTabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", String(active));
      });
      paintOneline(tab.dataset.oneline);
    });
  });

  const agentOnelineCode = $("#agent-oneline-code");
  const agentOnelineTabs = $$(".oneline-tab[data-agent-oneline]");
  const agentOnelineNote = $("#agent-oneline-note");

  function paintAgentOneline(tab) {
    if (!agentOnelineCode) return;
    const windows = tab === "windows";
    agentOnelineCode.textContent = windows
      ? agentOnelineCode.dataset.windows
      : agentOnelineCode.dataset.unix;
    if (agentOnelineNote) {
      agentOnelineNote.innerHTML = windows
        ? 'Installs the peer agent as a boot-triggered scheduled task. The farm app pairs it automatically during discovery.'
        : 'Installs the user service on port <code>8198</code>. The farm app pairs it automatically during discovery.';
    }
  }

  agentOnelineTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      agentOnelineTabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", String(active));
      });
      paintAgentOneline(tab.dataset.agentOneline);
    });
  });

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy") ? resolve() : reject(new Error("copy failed"));
      } catch (err) {
        reject(err);
      } finally {
        ta.remove();
      }
    });
  }

  $$(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = btn.dataset.copyTarget;
      let text = "";
      if (target === "install-code" && installCode) {
        const active = $(".terminal-tab.active");
        text = active?.dataset.tab === "windows"
          ? installCode.dataset.windows
          : installCode.dataset.unix;
      } else {
        const el = target ? document.getElementById(target) : null;
        text = el ? (el.dataset.copy || el.textContent) : "";
      }
      try {
        await copyText(text);
        const label = btn.querySelector("span");
        const old = label ? label.textContent : "";
        btn.classList.add("copied");
        if (label) label.textContent = "Copied";
        setTimeout(() => {
          btn.classList.remove("copied");
          if (label) label.textContent = old;
        }, 1600);
      } catch (_) {
        /* clipboard denied: leave the button alone */
      }
    });
  });

  /* ------------------------------------------------------------ */
  /* Theme studio                                                   */
  /* ------------------------------------------------------------ */
  const paletteButtons = $$(".palette");
  const themeName = $("#theme-name");
  const themeDesc = $("#theme-desc");

  paletteButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const root = document.documentElement;
      const accent = btn.dataset.accent || "#7aa2ff";
      const accent2 = btn.dataset.accent2 || "#b49cff";
      root.style.setProperty("--accent", accent);
      root.style.setProperty("--accent-2", accent2);
      setRgbVar("--accent-rgb", hexToRgb(accent));
      setRgbVar("--accent2-rgb", hexToRgb(accent2));
      paletteButtons.forEach((b) => b.classList.toggle("active", b === btn));
      if (themeName) themeName.textContent = btn.dataset.name || "Obsidian";
      if (themeDesc) themeDesc.textContent = btn.dataset.desc || "";
      readPalette();
      if (reduceMotion) {
        if (ctx) drawDotfield(performance.now());
        drawThemeBg(performance.now());
      }
    });
  });

  /* ------------------------------------------------------------ */
  /* Theme preview background modes                                 */
  /* ------------------------------------------------------------ */
  const themeBg = $("#theme-bg");
  const themeBgCtx = themeBg ? themeBg.getContext("2d") : null;
  const themeBgButtons = $$(".theme-bg-btn");
  const previewBgName = $("#preview-bg-name");
  let themeBgMode = "dotmatrix";
  let themeBgW = 0, themeBgH = 0, themeBgRaf = 0, themeBgLast = 0;
  let themeBgVisible = true;
  let themeBgScene = {};

function _clipPoly(poly, nx, ny, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const fa = nx * a[0] + ny * a[1] - c;
    const fb = nx * b[0] + ny * b[1] - c;
    if (fa <= 0) out.push(a);
    if ((fa <= 0) !== (fb <= 0)) {
      const t = fa / (fa - fb);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}
function _graphEdge(edges, map, adj, a, b) {
  if (!a || !b) return;
  const ka = `${Math.round(a[0] * 2)},${Math.round(a[1] * 2)}`;
  const kb = `${Math.round(b[0] * 2)},${Math.round(b[1] * 2)}`;
  if (ka === kb) return;
  const key = ka < kb ? ka + "|" + kb : kb + "|" + ka;
  if (map.has(key)) return;
  const edge = { a, b, ka, kb, len: Math.hypot(b[0] - a[0], b[1] - a[1]) };
  map.set(key, edge);
  edges.push(edge);
}
function buildVoronoiGraph(w, h) {
  const pad = 50;
  const n = Math.max(50, Math.min(220, Math.round(w * h / 8000)));
  const sites = Array.from({ length: n }, () => ({
    x: 30 + Math.random() * (w - 60),
    y: 30 + Math.random() * (h - 60),
  }));
  const edges = [], map = new Map();
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i];
    let poly = [[-pad, -pad], [w + pad, -pad], [w + pad, h + pad], [-pad, h + pad]];
    for (let j = 0; j < sites.length && poly.length >= 3; j++) {
      if (i === j) continue;
      const t = sites[j];
      const dx = t.x - s.x, dy = t.y - s.y;
      if (!dx && !dy) continue;
      poly = _clipPoly(poly, dx, dy,
        dx * (s.x + t.x) / 2 + dy * (s.y + t.y) / 2);
    }
    for (let k = 0; k < poly.length; k++) {
      _graphEdge(edges, map, null, poly[k], poly[(k + 1) % poly.length]);
    }
  }
  const adj = new Map();
  edges.forEach((e, i) => {
    for (const key of [e.ka, e.kb]) {
      const list = adj.get(key) || [];
      list.push(i);
      adj.set(key, list);
    }
  });
  return { edges, adj };
}
function _pickLight(graph, avoid) {
  if (!graph || !graph.edges.length) return null;
  let fallback = null, bestD = -1;
  for (let tries = 0; tries < 32; tries++) {
    const e = graph.edges[Math.floor(Math.random() * graph.edges.length)];
    const flip = Math.random() < 0.5;
    const fromKey = flip ? e.kb : e.ka;
    const from = e.ka === fromKey ? e.a : e.b;
    const cand = {
      edge: e, fromKey, toKey: flip ? e.ka : e.kb,
      pos: 0, speed: 15 + Math.random() * 30, wait: Math.random() * 2,
      trail: [], state: "moving", fade: 1,
    };
    if (!avoid) return cand;
    const d = Math.hypot(from[0] - avoid.x, from[1] - avoid.y);
    if (d >= (avoid.min || 0)) return cand;
    if (d > bestD) { bestD = d; fallback = cand; }
  }
  return fallback;
}
function _advanceLight(light, graph, h, dt) {
  if (!light) return;
  if (light.state === "waiting") {
    light.wait -= dt;
    if (light.wait <= 0) {
      const fresh = _pickLight(graph, light.avoid);
      if (fresh) {
        Object.assign(light, fresh);
        light.wait = 0;
        light.fade = 0;
        light.trail = [];
      }
    }
    return;
  }
  if (light.wait > 0) { light.wait -= dt; return; }
  light.pos += light.speed * dt;
  light.fade = Math.min(1, (light.fade ?? 1) + dt / 0.35);
  for (let guard = 0; guard < 24; guard++) {
    const e = light.edge, vertex = light.toKey;
    const vy = e.ka === vertex ? e.a[1] : e.b[1];
    const pool = (graph.adj.get(vertex) || [])
      .filter(i => graph.edges[i] !== e);
    const dead = !pool.length;
    const remaining = e.len - light.pos;
    if (dead) {
      if (remaining > 0) {
        // Fade exactly over the last stretch so the light is already gone
        // when it reaches the dead end — no visible pop at the endpoint.
        const fadeDist = Math.max(1, light.speed * 0.55);
        light.fade = Math.min(light.fade, remaining / fadeDist);
      } else {
        light.pos = e.len;
        light.fade = 0;
        light.state = "waiting";
        light.wait = 0.25 + Math.random() * 0.75;
        light.trail = [];
        const end = e.ka === light.toKey ? e.a : e.b;
        light.avoid = {
          x: end[0], y: end[1],
          min: Math.max(140, Math.min(280, h * 0.35)),
        };
      }
      return;
    }
    if (remaining > 1e-6) return;
    const ne = graph.edges[pool[Math.floor(Math.random() * pool.length)]];
    const vxp = e.ka === vertex ? e.a[0] : e.b[0];
    if (Array.isArray(light.trail)) {
      light.trail.push([vxp, vy]);
      if (light.trail.length > 140) light.trail.shift();
    }
    light.pos -= e.len;
    light.edge = ne;
    light.fromKey = vertex;
    light.toKey = ne.ka === vertex ? ne.kb : ne.ka;
  }
}
function floatShape(kind) {
  const V = [], E = [], F = [];
  const add = (x, y, z) => { V.push([x, y, z]); return V.length - 1; };
  const edge = (a, b) => E.push([a, b]);
  const loop = (arr) => arr.forEach((a, i) => edge(a, arr[(i + 1) % arr.length]));
  if (kind === "box") {
    const v = [
      [-0.85, -0.85, -0.85], [0.85, -0.85, -0.85],
      [0.85, 0.85, -0.85], [-0.85, 0.85, -0.85],
      [-0.85, -0.85, 0.85], [0.85, -0.85, 0.85],
      [0.85, 0.85, 0.85], [-0.85, 0.85, 0.85],
    ].map(([x, y, z]) => add(x, y, z));
    loop([v[0], v[1], v[2], v[3]]);
    loop([v[4], v[5], v[6], v[7]]);
    for (let i = 0; i < 4; i++) edge(v[i], v[i + 4]);
    F.push([v[0], v[1], v[2], v[3]], [v[4], v[5], v[6], v[7]],
      [v[0], v[1], v[5], v[4]], [v[1], v[2], v[6], v[5]],
      [v[2], v[3], v[7], v[6]], [v[3], v[0], v[4], v[7]]);
  } else if (kind === "pyramid") {
    const base = [[-0.9, 0.7, -0.9], [0.9, 0.7, -0.9],
      [0.9, 0.7, 0.9], [-0.9, 0.7, 0.9]].map(([x, y, z]) => add(x, y, z));
    const apex = add(0, -1.2, 0);
    loop(base);
    for (const b of base) edge(b, apex);
    F.push(base.slice().reverse(), ...base.map((b, i) => [b, base[(i + 1) % 4], apex]));
  } else if (kind === "tetra") {
    const v = [[0.9, 0.9, 0.9], [-0.9, -0.9, 0.9],
      [-0.9, 0.9, -0.9], [0.9, -0.9, -0.9]].map(([x, y, z]) => add(x, y, z));
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) edge(v[i], v[j]);
    F.push([v[0], v[1], v[2]], [v[0], v[1], v[3]],
      [v[0], v[2], v[3]], [v[1], v[2], v[3]]);
  } else if (kind === "octa") {
    const v = [[0.95, 0, 0], [-0.95, 0, 0], [0, 0.95, 0],
      [0, -0.95, 0], [0, 0, 0.95], [0, 0, -0.95]].map(([x, y, z]) => add(x, y, z));
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
      if ((i >> 1) === (j >> 1)) continue;
      edge(v[i], v[j]);
    }
    F.push([v[0], v[2], v[4]], [v[0], v[2], v[5]], [v[0], v[3], v[4]],
      [v[0], v[3], v[5]], [v[1], v[2], v[4]], [v[1], v[2], v[5]],
      [v[1], v[3], v[4]], [v[1], v[3], v[5]]);
  } else if (kind === "sphere") {
    const rows = 6, cols = 9, grid = [];
    for (let i = 0; i <= rows; i++) {
      const lat = -Math.PI / 2 + Math.PI * i / rows;
      grid[i] = [];
      for (let j = 0; j < cols; j++) {
        const lon = 2 * Math.PI * j / cols;
        grid[i][j] = add(Math.cos(lat) * Math.cos(lon),
          Math.sin(lat), Math.cos(lat) * Math.sin(lon));
      }
    }
    for (let i = 0; i <= rows; i++) loop(grid[i]);
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      edge(grid[i][j], grid[i + 1][j]);
    }
  } else if (kind === "torus") {
    const rows = 8, cols = 10, grid = [];
    for (let i = 0; i < rows; i++) {
      const u = 2 * Math.PI * i / rows;
      grid[i] = [];
      for (let j = 0; j < cols; j++) {
        const v = 2 * Math.PI * j / cols;
        const rr = 1 + 0.38 * Math.cos(v);
        grid[i][j] = add(rr * Math.cos(u), 0.38 * Math.sin(v), rr * Math.sin(u));
      }
    }
    for (let i = 0; i < rows; i++) loop(grid[i]);
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      edge(grid[i][j], grid[(i + 1) % rows][j]);
    }
  } else if (kind === "cylinder") {
    const n = 12, top = [], bot = [];
    for (let j = 0; j < n; j++) {
      const a = 2 * Math.PI * j / n;
      top.push(add(0.8 * Math.cos(a), -0.9, 0.8 * Math.sin(a)));
      bot.push(add(0.8 * Math.cos(a), 0.9, 0.8 * Math.sin(a)));
    }
    loop(top); loop(bot);
    for (let j = 0; j < n; j++) {
      edge(top[j], bot[j]);
      F.push([top[j], top[(j + 1) % n], bot[(j + 1) % n], bot[j]]);
    }
    F.push(top.slice(), bot.slice().reverse());
  } else {
    const n = 12, base = [];
    for (let j = 0; j < n; j++) {
      const a = 2 * Math.PI * j / n;
      base.push(add(0.85 * Math.cos(a), 0.85, 0.85 * Math.sin(a)));
    }
    const apex = add(0, -1.2, 0);
    loop(base);
    for (let j = 0; j < n; j++) {
      edge(base[j], apex);
      F.push([base[j], base[(j + 1) % n], apex]);
    }
    F.push(base.slice().reverse());
  }
  return { v: V, e: E, f: F };
}


  function bgRgba(c, a) { return "rgba(" + c[0] + ", " + c[1] + ", " + c[2] + ", " + a + ")"; }

  function bgSize() {
    if (!themeBg || !themeBgCtx) return;
    const rect = themeBg.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    themeBgW = Math.max(1, rect.width);
    themeBgH = Math.max(1, rect.height);
    themeBg.width = Math.round(themeBgW * dpr);
    themeBg.height = Math.round(themeBgH * dpr);
    themeBgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bgResetScene();
  }

  function bgResetScene() {
    const w = themeBgW, h = themeBgH;
    themeBgScene = {};
    const rand = (a, b) => a + Math.random() * (b - a);
    if (themeBgMode === "dotmatrix") {
      const step = Math.max(18, Math.min(30, Math.round(Math.min(w, h) / 38)));
      const parts = [], falls = [];
      for (let y = step / 2; y < h; y += step) {
        for (let x = step / 2; x < w; x += step) {
          parts.push({
            x, y, base: 1.1 + Math.random() * 0.8,
            ph: Math.random() * Math.PI * 2,
            sp: 0.22 + Math.random() * 0.55,
            thr: 0.48 + Math.random() * 0.32,
          });
        }
      }
      for (let x = step / 2; x < w; x += step) {
        falls.push({
          x, y0: Math.random() * h,
          speed: 0.7 + Math.random() * 1.1,
          len: 4 + Math.floor(Math.random() * 5),
        });
      }
      themeBgScene.dotmatrix = { parts, falls };
    } else if (themeBgMode === "starfield") {
      themeBgScene.stars = Array.from({ length: 70 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: rand(0.5, 1.4), vx: rand(4, 14), vy: rand(-4, 4),
        ph: Math.random() * Math.PI * 2,
      }));
    } else if (themeBgMode === "pointmap") {
      themeBgScene.nodes = Array.from({ length: 24 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        ph: Math.random() * Math.PI * 2, vx: rand(0.03, 0.1),
      }));
    } else if (themeBgMode === "circuit") {
      const sx = 44, sy = 36, nodes = [], edges = [];
      for (let y = 18, row = 0; y < h + sy; y += sy, row++) {
        for (let x = 18, col = 0; x < w + sx; x += sx, col++) {
          nodes.push([x, y]);
          if (col && Math.random() < 0.58) edges.push([[x - sx, y], [x, y]]);
          if (row && Math.random() < 0.58) edges.push([[x, y - sy], [x, y]]);
        }
      }
      themeBgScene.circuit = { nodes, edges };
    } else if (themeBgMode === "hexmesh") {
      const R = 17, dx = Math.sqrt(3) * R, dy = 1.5 * R, hexes = [];
      for (let y = -R, row = 0; y < h + R; y += dy, row++) {
        const off = row % 2 ? dx / 2 : 0;
        for (let x = -dx; x < w + dx; x += dx) {
          const pts = [];
          for (let k = 0; k < 6; k++) {
            const ang = Math.PI / 180 * (60 * k - 30);
            pts.push([x + off + R * Math.cos(ang), y + R * Math.sin(ang)]);
          }
          hexes.push({ pts, ph: Math.random() * Math.PI * 2 });
        }
      }
      themeBgScene.hexes = hexes;
    } else if (themeBgMode === "shapes") {
      const kinds = ["box", "pyramid", "tetra", "octa",
        "sphere", "torus", "cylinder", "cone"];
      themeBgScene.shapes = Array.from({ length: 9 }, () => {
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        return {
          x: Math.random() * w, y: Math.random() * h,
          R: rand(14, 32), vx: rand(-4, 4), vy: rand(-4, 4),
          rx: Math.random() * Math.PI * 2,
          ry: Math.random() * Math.PI * 2,
          rz: Math.random() * Math.PI * 2,
          vrx: rand(-0.16, 0.16), vry: rand(-0.16, 0.16), vrz: rand(-0.12, 0.12),
          ph: Math.random() * Math.PI * 2, sp: 0.12 + Math.random() * 0.18,
          off: 0.06 + Math.random() * 0.06,
          offAng: Math.random() * Math.PI * 2,
          alt: Math.random() < 0.35,
          geo: floatShape(kind),
        };
      });
    } else if (themeBgMode === "voronoi") {
      const graph = buildVoronoiGraph(w, h);
      themeBgScene.voronoi = {
        graph,
        lights: Array.from({ length: 24 }, () => _pickLight(graph)).filter(Boolean),
        last: 0,
      };
    }
  }

  function drawThemeBg(now) {
    if (!themeBgCtx) return;
    const ctx = themeBgCtx;
    const w = themeBgW, h = themeBgH;
    const t = now / 1000;
    // Match the farm app: --ribbon is the main stroke color and
    // --accent drives highlights/lights.
    const a = dotState.palette.b;
    const b = dotState.palette.a;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (themeBgMode === "dotmatrix") {
      const scene = themeBgScene.dotmatrix || { parts: [], falls: [] };
      for (const p of scene.parts) {
        const s = Math.sin(t * p.sp + p.ph);
        const inten = Math.max(0, (s - p.thr) / (1 - p.thr));
        ctx.fillStyle = bgRgba(inten > 0.2 ? b : a, 0.10 + inten * 0.34);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.base * (1 + inten * 0.9), 0, Math.PI * 2);
        ctx.fill();
      }
      for (const f of scene.falls) {
        const y = ((f.y0 + t * f.speed * 30) % (h + 80)) - 40;
        for (let k = 0; k < f.len; k++) {
          const yy = y - k * 6;
          if (yy < 0 || yy > h) continue;
          ctx.fillStyle = bgRgba(k === 0 ? b : a, (1 - k / f.len) * 0.24);
          ctx.fillRect(f.x, yy, 1.6, 4);
        }
      }
    } else if (themeBgMode === "starfield") {
      for (const s of themeBgScene.stars) {
        const x = ((s.x + t * s.vx) % (w + 8) + w + 8) % (w + 8);
        const y = ((s.y + t * s.vy + Math.sin(t * 0.4 + s.ph) * 5) % (h + 8) + h + 8) % (h + 8);
        ctx.fillStyle = bgRgba(s.ph > Math.PI ? b : a, 0.18 + 0.25 * (0.5 + 0.5 * Math.sin(t + s.ph)));
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeBgMode === "pointmap") {
      const pts = themeBgScene.nodes.map((p) => ({
        x: p.x + Math.sin(t * p.vx * 10 + p.ph) * 8,
        y: p.y + Math.cos(t * p.vx * 8 + p.ph) * 8,
      }));
      ctx.lineWidth = 0.7;
      for (let i = 0; i < pts.length; i++) {
        const near = [];
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          if (d < 80) near.push([d, pts[j]]);
        }
        near.sort((x, y) => x[0] - y[0]);
        for (const [d, q] of near.slice(0, 2)) {
          ctx.strokeStyle = bgRgba(b, (1 - d / 80) * 0.22);
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
      for (const p of pts) {
        ctx.fillStyle = bgRgba(a, 0.45);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeBgMode === "circuit") {
      const { nodes, edges } = themeBgScene.circuit || { nodes: [], edges: [] };
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = bgRgba(a, 0.17);
      ctx.beginPath();
      for (const [p, q] of edges) {
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
      }
      ctx.stroke();
      ctx.fillStyle = bgRgba(a, 0.35);
      for (const p of nodes) ctx.fillRect(p[0] - 1, p[1] - 1, 2, 2);
      if (edges.length) {
        ctx.fillStyle = bgRgba(b, 0.75);
        for (let i = 0; i < 5; i++) {
          const edge = edges[Math.floor((t * 0.7 + i * 7.3) % edges.length)];
          const f = (t * 0.35 + i * 0.21) % 1;
          ctx.beginPath();
          ctx.arc(edge[0][0] + (edge[1][0] - edge[0][0]) * f,
            edge[0][1] + (edge[1][1] - edge[0][1]) * f, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (themeBgMode === "hexmesh") {
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = bgRgba(a, 0.17);
      ctx.beginPath();
      for (const hex of themeBgScene.hexes) {
        hex.pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.closePath();
      }
      ctx.stroke();
      for (const hex of themeBgScene.hexes) {
        const breath = 0.5 + 0.5 * Math.sin(t * 0.8 + hex.ph);
        if (breath < 0.72) continue;
        ctx.fillStyle = bgRgba(b, (breath - 0.72) * 0.32);
        ctx.beginPath();
        hex.pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.closePath();
        ctx.fill();
      }
    } else if (themeBgMode === "topography") {
      const cx = w * 0.34, cy = h * 0.5, rings = 11;
      ctx.lineWidth = 0.8;
      for (let k = 0; k < rings; k++) {
        const R = 18 + k * 14;
        const wob = 3 + (k % 3) * 2;
        ctx.beginPath();
        for (let ang = 0; ang <= Math.PI * 2 + 0.05; ang += 0.08) {
          const rr = R + Math.sin(ang * 3 + t * 0.25 + k * 0.6) * wob
            + Math.sin(ang * 5 - t * 0.18 + k) * wob * 0.5;
          const x = cx + Math.cos(ang) * rr * 1.7;
          const y = cy + Math.sin(ang) * rr;
          if (ang === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = bgRgba(k % 4 === 0 ? b : a, 0.11 + (k % 3) * 0.03);
        ctx.stroke();
      }
    } else if (themeBgMode === "shapes") {
      for (const f of themeBgScene.shapes) {
        const R = f.R;
        const x = (((f.x + t * f.vx) % (w + R * 2)) + (w + R * 2)) % (w + R * 2) - R;
        const y = (((f.y + t * f.vy) % (h + R * 2)) + (h + R * 2)) % (h + R * 2) - R;
        const rx = f.rx + t * f.vrx, ry = f.ry + t * f.vry, rz = f.rz + t * f.vrz;
        const breath = 0.5 + 0.5 * Math.sin(t * f.sp + f.ph);
        const e = breath * breath * (3 - 2 * breath);
        const scale = R * (1 + e * 0.06);
        const ox = Math.cos(f.offAng) * R * f.off;
        const oy = Math.sin(f.offAng) * R * f.off;
        const cx = Math.cos(rx), sx = Math.sin(rx);
        const cy = Math.cos(ry), sy = Math.sin(ry);
        const cz = Math.cos(rz), sz = Math.sin(rz);
        const pts = [];
        for (const [vx0, vy0, vz0] of f.geo.v) {
          const x1 = vx0 * cy + vz0 * sy;
          const z1 = -vx0 * sy + vz0 * cy;
          const y2 = vy0 * cx - z1 * sx;
          const z2 = vy0 * sx + z1 * cx;
          const x3 = x1 * cz - y2 * sz;
          const y3 = x1 * sz + y2 * cz;
          const persp = 1 / (1 - z2 * 0.18);
          pts.push([x + x3 * scale * persp, y + y3 * scale * persp]);
        }
        const col = f.alt ? b : a;
        ctx.strokeStyle = bgRgba(col, e * 0.06);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (const [p, q] of f.geo.e) {
          ctx.moveTo(pts[p][0] + ox, pts[p][1] + oy);
          ctx.lineTo(pts[q][0] + ox, pts[q][1] + oy);
        }
        ctx.stroke();
        ctx.strokeStyle = bgRgba(col, 0.10 + e * 0.11);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        for (const [p, q] of f.geo.e) {
          ctx.moveTo(pts[p][0], pts[p][1]);
          ctx.lineTo(pts[q][0], pts[q][1]);
        }
        ctx.stroke();
      }
    } else if (themeBgMode === "voronoi") {
      const v = themeBgScene.voronoi;
      if (v) {
        const dt = Math.min(0.12, (now - (v.last || now)) / 1000);
        v.last = now;
        ctx.lineWidth = 1;
        ctx.strokeStyle = bgRgba(a, 0.085);
        ctx.beginPath();
        for (const e of v.graph.edges) {
          ctx.moveTo(e.a[0], e.a[1]);
          ctx.lineTo(e.b[0], e.b[1]);
        }
        ctx.stroke();
        for (const light of v.lights) {
          _advanceLight(light, v.graph, h, dt);
          if (!light || light.state === "waiting") continue;
          const fade = light.fade ?? 1;
          const e = light.edge;
          const fpos = Math.min(1, light.pos / (e.len || 1));
          const from = e.ka === light.fromKey ? e.a : e.b;
          const to = e.ka === light.fromKey ? e.b : e.a;
          const hx = from[0] + (to[0] - from[0]) * fpos;
          const hy = from[1] + (to[1] - from[1]) * fpos;
          light.trail.push([hx, hy]);
          if (light.trail.length > 140) light.trail.shift();
          for (let i = 1; i < light.trail.length; i++) {
            const p0 = light.trail[i - 1], p1 = light.trail[i];
            if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 36) continue;
            const g = i / light.trail.length;
            ctx.strokeStyle = bgRgba(b, g * g * 0.55 * fade);
            ctx.lineWidth = 0.6 + g * 1.4;
            ctx.beginPath();
            ctx.moveTo(p0[0], p0[1]);
            ctx.lineTo(p1[0], p1[1]);
            ctx.stroke();
          }
          ctx.fillStyle = bgRgba(b, 0.9 * fade);
          ctx.beginPath();
          ctx.arc(hx, hy, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (themeBgMode === "ribbons") {
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 5; i++) {
        const y0 = h * (0.24 + i * 0.12);
        const amp = 10 + i * 4;
        ctx.beginPath();
        for (let x = -10; x <= w + 10; x += 8) {
          const y = y0 + Math.sin(x * 0.012 + t * (0.25 + i * 0.04) + i) * amp
            + Math.sin(x * 0.03 - t * 0.2 + i * 1.7) * amp * 0.4;
          if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = bgRgba(i % 2 ? b : a, 0.12 + i * 0.012);
        ctx.stroke();
      }
    }
  }

  function themeBgLoop(now) {
    if (themeBgVisible && !document.hidden && now - themeBgLast >= 33) {
      themeBgLast = now;
      drawThemeBg(now);
    }
    themeBgRaf = requestAnimationFrame(themeBgLoop);
  }

  function selectThemeBg(mode) {
    themeBgMode = mode;
    themeBgButtons.forEach((btn) => {
      const on = btn.dataset.bg === mode;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", String(on));
      if (on && previewBgName) previewBgName.textContent = btn.dataset.label || "Dot Matrix";
    });
    bgResetScene();
    if (reduceMotion) drawThemeBg(performance.now());
  }

  themeBgButtons.forEach((btn) => btn.addEventListener("click", () => selectThemeBg(btn.dataset.bg)));

  if (themeBg && themeBgCtx) {
    bgSize();
    if ("ResizeObserver" in window) {
      new ResizeObserver(() => { bgSize(); drawThemeBg(performance.now()); }).observe($(".preview-body"));
    } else {
      window.addEventListener("resize", bgSize, { passive: true });
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        themeBgVisible = entries.some((e) => e.isIntersecting);
      }, { threshold: 0.05 }).observe($("#theme-preview"));
    }
    if (reduceMotion) drawThemeBg(0);
    else themeBgLoop(0);
  }

  /* ------------------------------------------------------------ */
  /* Latest release + platform downloads                            */
  /* ------------------------------------------------------------ */
  const releaseChip = $("#release-chip");
  const releaseVersion = $("#release-version");
  const downloadCards = $$(".download-card");
  const RELEASES_API =
    "https://api.github.com/repos/dakotacookson/Llama-RPC-Farm/releases?per_page=20";

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${Math.round(mb)} MB`;
  }

  function detectOS() {
    const ua = navigator.userAgent || "";
    const platform = (navigator.userAgentData?.platform || navigator.platform || ua).toLowerCase();
    if (/win/.test(platform)) return "windows";
    if (/mac|iphone|ipad/.test(platform)) return "macos";
    if (/linux|x11/.test(platform)) return "linux";
    return "";
  }

  function pickAsset(assets, kind) {
    return (assets || []).find((a) => {
      const n = (a.name || "").toLowerCase();
      if (kind === "windows") return n.startsWith("llama-rpc-farm") && n.includes("windows") && n.endsWith("setup.exe");
      if (kind === "macos") return n.startsWith("llama-rpc-farm_") && n.endsWith(".pkg");
      if (kind === "linux") return n.startsWith("llama-rpc-farm_") && n.endsWith("_amd64.deb");
      if (kind === "linux-arm64") return n.startsWith("llama-rpc-farm_") && n.endsWith("_arm64.deb");
      if (kind === "source") return n.startsWith("llama_rpc_farm-") && n.endsWith(".whl");
      if (kind === "agent-windows") return n.startsWith("llama-peer-agent") && n.includes("windows") && n.endsWith("setup.exe");
      if (kind === "agent-macos") return n.startsWith("llama-peer-agent_") && n.endsWith(".pkg");
      if (kind === "agent-linux") return n.startsWith("llama-rpc-farm-agent_") && n.endsWith("_amd64.deb");
      if (kind === "agent-linux-arm64") return n.startsWith("llama-rpc-farm-agent_") && n.endsWith("_arm64.deb");
      if (kind === "agent-source") return n.startsWith("llama_rpc_farm_agent-") && n.endsWith(".whl");
      return false;
    });
  }

  function paintRelease(data) {
    if (!data || !data.tag_name) return;
    const tag = String(data.tag_name);
    const version = tag.replace(/^release-/, "");
    const label = `v${version}`;
    if (releaseChip) releaseChip.textContent = label;
    if (releaseVersion) releaseVersion.textContent = label;
    const assets = data.assets || [];
    downloadCards.forEach((card) => {
      const kind = card.dataset.os;
      const asset = pickAsset(assets, kind);
      const link = card.querySelector("[data-download]");
      const meta = card.querySelector("[data-size]");
      if (asset && link) {
        link.href = asset.browser_download_url;
        link.target = "_blank";
        link.rel = "noreferrer";
        if (meta) meta.textContent = [version, formatBytes(asset.size)].filter(Boolean).join(" · ");
      } else if (meta) {
        meta.textContent = "See all release assets";
      }
    });
  }

  function newestBuild(releases) {
    if (!Array.isArray(releases)) return null;
    return releases
      .filter((r) => r && !r.draft)
      .filter((r) => /^release-\d/.test(r.tag_name || ""))
      .filter((r) => Array.isArray(r.assets) && r.assets.length)
      .sort((a, b) =>
        new Date(b.published_at || b.created_at || 0) -
        new Date(a.published_at || a.created_at || 0)
      )[0] || null;
  }

  async function refreshRelease() {
    try {
      const res = await fetch(RELEASES_API, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store",
      });
      if (!res.ok) return;
      paintRelease(newestBuild(await res.json()));
    } catch (_) {
      /* keep the current release / release-page links */
    }
  }

  async function refineArm64() {
    try {
      const uaData = navigator.userAgentData;
      if (!uaData || !uaData.getHighEntropyValues) return;
      const v = await uaData.getHighEntropyValues(["architecture"]);
      const arch = String(v.architecture || "").toLowerCase();
      if (!/^(arm|arm64|aarch64)$/.test(arch)) return;
      downloadCards.forEach((card) => {
        const os = card.dataset.os || "";
        if (os === "linux-arm64" || os === "agent-linux-arm64") {
          card.classList.add("recommended");
        } else if (os === "linux" || os === "agent-linux") {
          card.classList.remove("recommended");
        }
      });
    } catch (_) {
      /* high-entropy client hints are optional */
    }
  }

  if (releaseChip || downloadCards.length) {
    const detected = detectOS();
    if (detected) {
      downloadCards.forEach((card) => {
        card.classList.toggle("recommended", card.dataset.os === detected);
      });
    }
    refineArm64();
    refreshRelease();
    /* Keep an open page current when a new rolling build is published. */
    setInterval(refreshRelease, 10 * 60 * 1000);
  }

  /* ------------------------------------------------------------ */
  /* Housekeeping                                                   */
  /* ------------------------------------------------------------ */
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
