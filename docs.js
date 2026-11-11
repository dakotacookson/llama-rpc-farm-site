/* Documentation browser — pulls Markdown live from the main branch. */
(() => {
  "use strict";

  const REPO = "dakotacookson/Llama-RPC-Farm";
  const BRANCH = "main";
  const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/docs/`;
  const BLOB = `https://github.com/${REPO}/blob/${BRANCH}/docs/`;

  const content = document.getElementById("docs-content");
  const toc = document.getElementById("docs-toc");
  const breadcrumb = document.getElementById("doc-breadcrumb");
  const sourceLink = document.getElementById("doc-source-link");
  const sidebar = document.getElementById("docs-sidebar");
  const menu = document.getElementById("docs-menu");
  const search = document.getElementById("docs-search");

  const links = [...document.querySelectorAll("[data-doc]")];
  const titles = new Map(links.map((a) => [a.dataset.doc, a.textContent.trim()]));
  const cache = new Map();
  let activeSlug = "";

  function currentSlug() {
    const slug = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    return titles.has(slug) ? slug : "README";
  }

  function setActive(slug) {
    links.forEach((a) => {
      const on = a.dataset.doc === slug;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function setLoading(title) {
    if (!content) return;
    content.innerHTML = `
      <div class="docs-loading">
        <span class="docs-loading-dots"><i></i><i></i><i></i></span>
        <strong>Pulling ${escapeHtml(title || "the latest docs")}…</strong>
        <small>Reading directly from <code>${BRANCH}</code></small>
      </div>`;
    if (toc) toc.innerHTML = "";
  }

  function setError(slug, err) {
    if (!content) return;
    content.innerHTML = `
      <div class="docs-error">
        <strong>Could not load this page</strong>
        <p>${escapeHtml(err?.message || "The document could not be fetched.")}</p>
        <p><a href="https://github.com/${REPO}/tree/${BRANCH}/docs" target="_blank" rel="noreferrer">Browse the docs on GitHub ↗</a></p>
      </div>`;
    if (toc) toc.innerHTML = "";
    if (breadcrumb) breadcrumb.textContent = titles.get(slug) || "Docs";
    setActive(slug);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  function slugify(text) {
    return String(text)
      .toLowerCase()
      .replace(/[`*_~]/g, "")
      .replace(/[^\w\s.-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function rewriteLinks(root) {
    root.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#")) return;
      if (/^(https?:|mailto:)/i.test(href)) {
        a.target = "_blank";
        a.rel = "noreferrer";
        return;
      }
      const [path, hash] = href.split("#");
      if (path.endsWith(".md")) {
        const slug = path.split("/").pop().replace(/\.md$/i, "");
        if (titles.has(slug)) {
          a.href = `#${slug}${hash ? "#" + hash : ""}`;
          a.removeAttribute("target");
          return;
        }
      }
      try {
        a.href = new URL(href, BLOB).href;
        a.target = "_blank";
        a.rel = "noreferrer";
      } catch (_) { /* leave malformed href alone */ }
    });
    root.querySelectorAll("img[src]").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (!src || /^(https?:|data:)/i.test(src)) return;
      try { img.src = new URL(src, RAW).href; } catch (_) {}
    });
  }

  function addHeadingAnchors(root) {
    const used = new Set();
    root.querySelectorAll("h2, h3, h4").forEach((h) => {
      let id = slugify(h.textContent) || "section";
      let n = 2;
      while (used.has(id)) id = `${slugify(h.textContent)}-${n++}`;
      id = `section-${id}`;
      while (used.has(id)) id = `${id}-${n++}`;
      used.add(id);
      h.id = id;
      const a = document.createElement("a");
      a.className = "anchor";
      a.href = `#${id}`;
      a.textContent = "#";
      a.setAttribute("aria-label", "Link to this section");
      h.appendChild(a);
    });
  }

  function buildToc(root) {
    if (!toc) return;
    const items = [...root.querySelectorAll("h2, h3")];
    toc.innerHTML = items.map((h) => {
      const sub = h.tagName === "H3";
      return `<a class="toc-link${sub ? " toc-sub" : ""}" href="#${h.id}">${escapeHtml(h.textContent.replace(/#$/, "").trim())}</a>`;
    }).join("");
  }

  async function fetchMarkdown(file) {
    if (cache.has(file)) return cache.get(file);
    const url = `${RAW}${file}?cachebust=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`GitHub returned ${res.status} for ${file}`);
    const text = await res.text();
    cache.set(file, text);
    return text;
  }

  async function loadDoc(slug) {
    slug = titles.has(slug) ? slug : "README";
    if (activeSlug === slug && content?.querySelector(".markdown-body")) return;
    activeSlug = slug;
    const title = titles.get(slug) || slug;
    const file = slug === "README" ? "README.md" : `${slug}.md`;

    setActive(slug);
    setLoading(title);
    if (breadcrumb) breadcrumb.textContent = title;
    if (sourceLink) sourceLink.href = `https://github.com/${REPO}/blob/${BRANCH}/docs/${file}`;
    document.title = `${title} — Llama RPC Farm Docs`;
    if (sidebar) sidebar.classList.remove("open");
    if (menu) menu.setAttribute("aria-expanded", "false");
    if (location.hash !== `#${slug}`) {
      history.replaceState(null, "", `#${slug}`);
    }

    try {
      const md = await fetchMarkdown(file);
      const html = window.marked
        ? window.marked.parse(md, { gfm: true, breaks: false })
        : `<pre>${escapeHtml(md)}</pre>`;
      if (!content) return;
      content.innerHTML = `<article class="markdown-body">${html}</article>`;
      const body = content.querySelector(".markdown-body");
      rewriteLinks(body);
      addHeadingAnchors(body);
      buildToc(body);
      const top = content.getBoundingClientRect().top + window.scrollY - 132;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    } catch (err) {
      setError(slug, err);
    }
  }

  links.forEach((a) => {
    a.addEventListener("click", (e) => {
      const slug = a.dataset.doc;
      if (!slug) return;
      e.preventDefault();
      loadDoc(slug);
    });
  });

  window.addEventListener("hashchange", () => {
    const hash = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    if (titles.has(hash)) {
      loadDoc(hash);
      return;
    }
    const target = hash ? document.getElementById(hash) : null;
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  if (menu && sidebar) {
    menu.addEventListener("click", () => {
      const open = sidebar.classList.toggle("open");
      menu.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", (e) => {
      if (!sidebar.classList.contains("open")) return;
      if (sidebar.contains(e.target) || menu.contains(e.target)) return;
      sidebar.classList.remove("open");
      menu.setAttribute("aria-expanded", "false");
    });
  }

  if (search) {
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      document.querySelectorAll("[data-doc]").forEach((a) => {
        a.hidden = q && !a.textContent.toLowerCase().includes(q);
      });
      document.querySelectorAll(".docs-group").forEach((group) => {
        const visible = [...group.querySelectorAll("[data-doc]")].some((a) => !a.hidden);
        group.hidden = !visible;
      });
    });
  }

  // In-page TOC links should work after the document is rendered.
  if (toc) {
    toc.addEventListener("click", (e) => {
      const a = e.target.closest("a[href^='#']");
      if (!a) return;
      e.preventDefault();
      const target = document.getElementById(a.getAttribute("href").slice(1));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  loadDoc(currentSlug());
})();
