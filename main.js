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
      if (reduceMotion && ctx) drawDotfield(performance.now());
    });
  });

  /* ------------------------------------------------------------ */
  /* Latest release + platform downloads                            */
  /* ------------------------------------------------------------ */
  const releaseChip = $("#release-chip");
  const releaseVersion = $("#release-version");
  const downloadCards = $$(".download-card");

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
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
      if (kind === "source") return n.startsWith("llama_rpc_farm-") && n.endsWith(".whl");
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

  if (releaseChip || downloadCards.length) {
    const detected = detectOS();
    if (detected) {
      downloadCards.forEach((card) => {
        card.classList.toggle("recommended", card.dataset.os === detected);
      });
    }
    fetch("https://api.github.com/repos/dakotacookson/Llama-RPC-Farm/releases?per_page=1", {
      headers: { Accept: "application/vnd.github+json" },
    }).then((r) => r.ok ? r.json() : null).then((releases) => {
      paintRelease(Array.isArray(releases) ? releases[0] : null);
    }).catch(() => {});
  }

  /* ------------------------------------------------------------ */
  /* Housekeeping                                                   */
  /* ------------------------------------------------------------ */
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
