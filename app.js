// app.js — Camila Grimaldi portfolio (vanilla SPA)
// Recreates the React prototype's behaviour with no framework / build step.
// Routing is client-side state (no URLs/History), matching the design.

(function () {
  "use strict";

  // ── Contact form configuration ──────────────────────────────────────────────
  // The contact form is delivered by Web3Forms (https://web3forms.com) — a free,
  // serverless email relay. To activate it:
  //   1. Go to https://web3forms.com, enter  arq.cgrimaldi@gmail.com , and submit.
  //   2. Web3Forms emails you an "Access Key" (a UUID like 1a2b3c4d-...-....).
  //   3. Paste that key between the quotes below, replacing the placeholder.
  // Until a real key is set, the form falls back to opening the visitor's email app.
  const WEB3FORMS_ACCESS_KEY = "06fe2bdd-c7bd-442b-a6e7-4fd49b226946";
  const CONTACT_EMAIL = "arq.cgrimaldi@gmail.com";
  const web3formsEnabled = () =>
    WEB3FORMS_ACCESS_KEY && !/YOUR-WEB3FORMS|^\s*$/.test(WEB3FORMS_ACCESS_KEY);

  // ── Helpers ────────────────────────────────────────────────────────────────
  // resolveAsset: local files; encode spaces etc. (no inlined-blob manifest here).
  const rA = (p) => encodeURI(p);

  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // Build a single element from an HTML string.
  const node = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  // [[...]] markers → bold-italic emphasis; everything else escaped.
  const renderRich = (text) =>
    String(text)
      .split(/\[\[(.*?)\]\]/g)
      .map((seg, i) => (i % 2 === 1 ? `<strong class="cg-em">${esc(seg)}</strong>` : esc(seg)))
      .join("");

  const pad2 = (x) => String(x).padStart(2, "0");

  const CG_PROJECTS = window.CG_PROJECTS;
  const CG_RESEARCH = window.CG_RESEARCH;

  // ── App state + lifecycle ──────────────────────────────────────────────────
  const state = { route: { view: "home" } };
  let cleanups = [];
  const onCleanup = (fn) => cleanups.push(fn);
  const runCleanups = () => {
    cleanups.forEach((fn) => { try { fn(); } catch (e) {} });
    cleanups = [];
  };

  let appEl;

  // ── Routing — hash-based, so every page/project has its own shareable URL and
  //    the browser back/forward buttons work. Hash routing is deployable on any
  //    static host (Netlify, GitHub Pages, a plain folder) with no server config.
  //      #/                              → Home
  //      #/projects                      → Projects index
  //      #/projects/community-centre…    → a project
  //      #/research                      → Research index
  //      #/research/designing-responsibly-foster → a research item
  //      #/about · #/contact
  const VIEW_TO_PATH = { home: "", works: "projects", research: "research", profile: "about", contact: "contact" };

  function routeToHash(route) {
    if (route.view === "project") return "#/projects/" + encodeURIComponent(route.id);
    if (route.view === "research-detail") return "#/research/" + encodeURIComponent(route.id);
    const p = VIEW_TO_PATH[route.view];
    return "#/" + (p == null ? "" : p);
  }

  // Convenience for building real <a href> values from a (view, id) pair.
  const hrefFor = (view, id) => routeToHash(id ? { view, id } : { view });

  function hashToRoute() {
    const raw = location.hash.replace(/^#\/?/, "").replace(/\/+$/, "");
    const parts = raw.split("/").filter(Boolean).map(decodeURIComponent);
    if (parts.length === 0) return { view: "home" };
    const [a, b] = parts;
    if (a === "projects")
      return b ? (CG_PROJECTS.some((p) => p.id === b) ? { view: "project", id: b } : { view: "works" }) : { view: "works" };
    if (a === "research")
      return b ? (CG_RESEARCH.items.some((p) => p.id === b) ? { view: "research-detail", id: b } : { view: "research" }) : { view: "research" };
    if (a === "about") return { view: "profile" };
    if (a === "contact") return { view: "contact" };
    return { view: "home" };
  }

  // Navigate by updating the hash; the hashchange listener performs the render.
  // (Clicking the already-active route just re-renders in place.)
  const go = (route) => {
    const hash = routeToHash(route);
    if (location.hash === hash || (hash === "#/" && location.hash === "")) {
      state.route = route;
      closeMenu();
      render();
      window.scrollTo(0, 0);
    } else {
      location.hash = hash;
    }
  };

  function onHashChange() {
    state.route = hashToRoute();
    closeMenu();
    render();
    window.scrollTo(0, 0);
  }

  // ── Nav ─────────────────────────────────────────────────────────────────────
  function Nav() {
    const route = state.route;
    const items = [
      ["works", "Projects"],
      ["research", "Research"],
      ["profile", "About"],
      ["contact", "Contact"]
    ];
    const active = (k) =>
      route.view === k ||
      (k === "works" && route.view === "project") ||
      (k === "research" && route.view === "research-detail");

    const links = items
      .map(
        ([k, label]) =>
          `<a href="${hrefFor(k)}" class="cg-nav-link${active(k) ? " active" : ""}" data-go data-view="${k}">${label}</a>`
      )
      .join("");

    const header = node(`
      <header class="cg-nav">
        <a class="cg-wm" href="${hrefFor("home")}" data-go data-view="home">Camila Grimaldi</a>
        <nav class="cg-nav-links">${links}</nav>
        <button class="cg-burger" aria-label="Menu"><span></span><span></span></button>
      </header>`);

    header.querySelector(".cg-burger").addEventListener("click", openMenu);
    return header;
  }

  // On the homepage the bar starts translucent over the hero and resolves to the
  // solid paper bar once the hero scrolls past ~62% of the viewport.
  function setupNavScroll() {
    if (state.route.view !== "home") return;
    const header = appEl.querySelector(".cg-nav");
    if (!header) return;
    const onScroll = () => {
      const scrolled = window.scrollY > window.innerHeight * 0.62;
      header.classList.toggle("cg-nav--overlay", !scrolled);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    onCleanup(() => window.removeEventListener("scroll", onScroll));
  }

  // ── Mobile menu ───────────────────────────────────────────────────────────
  function openMenu() {
    if (document.querySelector(".cg-mobile-menu")) return;
    const items = [
      ["works", "Projects"],
      ["research", "Research"],
      ["profile", "About"],
      ["contact", "Contact"]
    ];
    const m = node(`
      <div class="cg-mobile-menu">
        <div class="cg-mobile-menu-head">
          <span class="cg-wm">Camila Grimaldi</span>
          <button class="cg-close" aria-label="Close">×</button>
        </div>
        <nav class="cg-mobile-links">
          ${items.map(([k, l]) => `<a href="${hrefFor(k)}" data-go data-view="${k}">${l}</a>`).join("")}
        </nav>
      </div>`);
    m.querySelector(".cg-close").addEventListener("click", closeMenu);
    document.body.appendChild(m);
  }
  function closeMenu() {
    const m = document.querySelector(".cg-mobile-menu");
    if (m) m.remove();
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  function Footer() {
    return node(`
      <footer class="cg-footer">
        <div class="cg-footer-inner">
          <div class="cg-footer-col">
            <div class="cg-wm inverse">Camila Grimaldi</div>
            <p class="cg-footer-note">Architecture · Adaptive reuse · Landscape</p>
          </div>
          <div class="cg-footer-col links">
            <a href="${hrefFor("works")}" data-go data-view="works">Projects</a>
            <a href="${hrefFor("research")}" data-go data-view="research">Research</a>
            <a href="${hrefFor("profile")}" data-go data-view="profile">About</a>
            <a href="${hrefFor("contact")}" data-go data-view="contact">Contact</a>
          </div>
          <div class="cg-footer-col links">
            <a href="mailto:arq.cgrimaldi@gmail.com">arq.cgrimaldi@gmail.com</a>
            <a href="tel:+393520244112">+39 352 024 4112</a>
            <a href="https://www.linkedin.com/in/camila-grimaldi-56516621a" target="_blank" rel="noopener">LinkedIn</a>
          </div>
        </div>
        <div class="cg-footer-base">
          <span>© 2025 Camila Grimaldi</span>
          <span>Architectural portfolio</span>
        </div>
      </footer>`);
  }

  // ── Shared cards ────────────────────────────────────────────────────────────
  function OverlayCard(image, title, route, extraClass) {
    return node(`
      <article class="cg-pcard${extraClass ? " " + extraClass : ""}" data-go data-view="${route.view}"${
        route.id ? ` data-id="${esc(route.id)}"` : ""
      }>
        <div class="cg-pcard-media">
          <img src="${rA(image)}" alt="${esc(title)}" loading="lazy">
          <span class="cg-pcard-veil"></span>
          <h3 class="cg-pcard-title">${esc(title)}</h3>
        </div>
      </article>`);
  }

  // ── Hero carousel (home) — slow crossfade between project covers ────────────
  function HeroCarousel(images) {
    const sec = node(`<section class="cg-hero"></section>`);
    images.forEach((src, k) => {
      sec.appendChild(
        node(
          `<img class="cg-hero-img${k === 0 ? " on" : ""}" src="${rA(src)}" alt="" aria-hidden="${
            k === 0 ? "false" : "true"
          }">`
        )
      );
    });
    if (images.length >= 2) {
      const imgs = sec.querySelectorAll(".cg-hero-img");
      let i = 0;
      const id = setInterval(() => {
        imgs[i].classList.remove("on");
        imgs[i].setAttribute("aria-hidden", "true");
        i = (i + 1) % images.length;
        imgs[i].classList.add("on");
        imgs[i].setAttribute("aria-hidden", "false");
      }, 3600);
      onCleanup(() => clearInterval(id));
    }
    return sec;
  }

  // ── Image plate (used on Profile) ───────────────────────────────────────────
  function PlateHTML(opts) {
    const { ratio = "4/3", caption, label, src, fit = "cover", eager } = opts;
    const ar = ratio.replace("/", " / ");
    const inner = src
      ? `<img class="cg-plate-img" src="${rA(src)}" alt="${esc(caption || label || "")}" loading="${
          eager ? "eager" : "lazy"
        }" style="object-fit: ${fit}">`
      : `<span class="cg-tick tl"></span><span class="cg-tick tr"></span><span class="cg-tick bl"></span><span class="cg-tick br"></span><span class="cg-plate-tag">${esc(
          label || "Photograph"
        )}</span>`;
    return `<figure class="cg-plate-fig"><div class="cg-plate" style="aspect-ratio: ${ar}; background: ${
      src ? "var(--paper-2)" : "var(--paper-3)"
    }">${inner}</div>${caption ? `<figcaption class="cg-plate-cap">${esc(caption)}</figcaption>` : ""}</figure>`;
  }

  // ── Project / research image carousel ───────────────────────────────────────
  function ProjectCarousel(images, title) {
    const n = images.length;
    let i = 0;
    let full = false;
    let lb = null;
    const ratios = {};

    const sec = node(
      `<section class="cg-carousel" tabindex="0" aria-label="${esc(title)} — images"></section>`
    );
    const stage = node(`<div class="cg-carousel-stage" style="aspect-ratio: 16 / 10"></div>`);
    const track = node(`<div class="cg-carousel-track" style="transform: translateX(0%)"></div>`);

    images.forEach((src, k) => {
      const slide = node(`<div class="cg-carousel-slide"></div>`);
      const img = node(
        `<img src="${rA(src)}" alt="${esc(title)} — ${k + 1} of ${n}" loading="${
          k === 0 ? "eager" : "lazy"
        }" style="cursor: zoom-in">`
      );
      img.addEventListener("load", () => {
        if (ratios[k]) return;
        ratios[k] = img.naturalWidth / img.naturalHeight;
        if (k === i) updateStage();
      });
      img.addEventListener("click", openFull);
      slide.appendChild(img);
      track.appendChild(slide);
    });
    stage.appendChild(track);

    const prevBtn = node(`<button class="cg-carousel-arrow prev" aria-label="Previous image">‹</button>`);
    const fsBtn = node(
      `<button class="cg-fullscreen-btn" aria-label="View fullscreen" title="View fullscreen"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg></button>`
    );
    const nextBtn = node(`<button class="cg-carousel-arrow next" aria-label="Next image">›</button>`);
    prevBtn.addEventListener("click", () => move(-1));
    nextBtn.addEventListener("click", () => move(1));
    fsBtn.addEventListener("click", openFull);
    stage.append(prevBtn, fsBtn, nextBtn);
    sec.appendChild(stage);

    const foot = node(
      `<div class="cg-carousel-foot"><span class="cg-carousel-count"></span><div class="cg-carousel-dots"></div></div>`
    );
    const countEl = foot.querySelector(".cg-carousel-count");
    const dotsEl = foot.querySelector(".cg-carousel-dots");
    images.forEach((_, k) => {
      const d = node(
        `<button class="cg-dot${k === 0 ? " on" : ""}" aria-label="Go to image ${k + 1}"></button>`
      );
      d.addEventListener("click", () => { i = k; update(); });
      dotsEl.appendChild(d);
    });
    sec.appendChild(foot);

    sec.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "Escape") closeFull();
    });

    function updateStage() {
      const r = ratios[i];
      stage.style.aspectRatio = r ? String(r) : "16 / 10";
    }
    function update() {
      track.style.transform = "translateX(-" + i * 100 + "%)";
      countEl.textContent = pad2(i + 1) + " / " + pad2(n);
      dotsEl.querySelectorAll(".cg-dot").forEach((d, k) => d.classList.toggle("on", k === i));
      updateStage();
      if (full) updateLightbox();
    }
    function move(d) { i = (i + d + n) % n; update(); }

    function lbKey(e) {
      if (e.key === "Escape") closeFull();
      else if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
    }
    function openFull() {
      if (full) return;
      full = true;
      lb = buildLightbox();
      document.body.appendChild(lb);
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", lbKey);
    }
    function closeFull() {
      if (!full) return;
      full = false;
      if (lb) { lb.remove(); lb = null; }
      document.body.style.overflow = "";
      window.removeEventListener("keydown", lbKey);
    }
    function buildLightbox() {
      const d = node(`<div class="cg-lightbox"></div>`);
      d.addEventListener("click", closeFull);
      const close = node(`<button class="cg-lightbox-close" aria-label="Close fullscreen">×</button>`);
      close.addEventListener("click", (e) => { e.stopPropagation(); closeFull(); });
      d.appendChild(close);
      if (n > 1) {
        const p = node(`<button class="cg-lightbox-arrow prev" aria-label="Previous image">‹</button>`);
        p.addEventListener("click", (e) => { e.stopPropagation(); move(-1); });
        d.appendChild(p);
      }
      const fig = node(`<figure class="cg-lightbox-fig"></figure>`);
      fig.addEventListener("click", (e) => e.stopPropagation());
      const img = node(`<img alt="${esc(title)}">`);
      fig.appendChild(img);
      d.appendChild(fig);
      if (n > 1) {
        const nx = node(`<button class="cg-lightbox-arrow next" aria-label="Next image">›</button>`);
        nx.addEventListener("click", (e) => { e.stopPropagation(); move(1); });
        d.appendChild(nx);
      }
      const count = node(`<span class="cg-lightbox-count"></span>`);
      d.appendChild(count);
      d._img = img;
      d._count = count;
      updateLightbox(d);
      return d;
    }
    function updateLightbox(target) {
      const d = target || lb;
      if (!d) return;
      d._img.src = rA(images[i]);
      d._img.alt = title + " — " + (i + 1) + " of " + n;
      d._count.textContent = pad2(i + 1) + " / " + pad2(n);
    }

    onCleanup(closeFull); // tidy up if navigating away with the lightbox open
    update();
    return sec;
  }

  // ── Views ───────────────────────────────────────────────────────────────────
  function Home() {
    const research = (CG_RESEARCH && CG_RESEARCH.items) || [];
    const heroImages = CG_PROJECTS.map((p) => p.images[0]);

    const main = node(`<main class="cg-home" data-screen-label="Home"></main>`);
    main.appendChild(HeroCarousel(heroImages));

    const body = node(`<section class="cg-home-body"></section>`);

    body.appendChild(
      node(`
      <div class="cg-home-section cg-about" data-screen-label="About">
        <div class="cg-sec-head">
          <h2 class="cg-home-title">About</h2>
          <a class="cg-sec-link" href="${hrefFor("profile")}" data-go data-view="profile">More <span class="ar">→</span></a>
        </div>
        <div class="cg-about-grid">
          <div class="cg-about-media cg-hoverzoom">
            <img src="${rA("img/About.jpg")}" alt="Camila Grimaldi" loading="lazy">
          </div>
          <div class="cg-about-panel">
            <p class="cg-about-lead">Italian-Argentine architect with international academic and professional experience.</p>
            <p class="cg-about-text">My work explores the relationship between architecture, landscape and the experience of place, seeking to create meaningful spaces rooted in their environmental and cultural context.</p>
            <a class="cg-arrow-link" href="${hrefFor("profile")}" data-go data-view="profile"><span>More about me</span><span class="ar ar-r">→</span></a>
          </div>
        </div>
      </div>`)
    );

    const rprev = node(`
      <div class="cg-home-section" data-screen-label="Research preview">
        <div class="cg-sec-head">
          <h2 class="cg-home-title">Research</h2>
          <a class="cg-sec-link" href="${hrefFor("research")}" data-go data-view="research">All research <span class="ar">→</span></a>
        </div>
        <div class="cg-ogrid cols-3"></div>
      </div>`);
    const rgrid = rprev.querySelector(".cg-ogrid");
    research.forEach((item) =>
      rgrid.appendChild(
        OverlayCard(item.cover || item.images[0], item.title, { view: "research-detail", id: item.id })
      )
    );
    body.appendChild(rprev);

    const pprev = node(`
      <div class="cg-home-section" data-screen-label="Projects preview">
        <div class="cg-sec-head">
          <h2 class="cg-home-title">Projects</h2>
          <a class="cg-sec-link" href="${hrefFor("works")}" data-go data-view="works">All projects <span class="ar">→</span></a>
        </div>
        <div class="cg-ogrid feature"></div>
      </div>`);
    const pgrid = pprev.querySelector(".cg-ogrid");
    CG_PROJECTS.forEach((p) =>
      pgrid.appendChild(OverlayCard(p.images[0], p.title, { view: "project", id: p.id }))
    );
    body.appendChild(pprev);

    main.appendChild(body);
    return main;
  }

  function Works() {
    const main = node(`
      <main class="cg-page" data-screen-label="Projects">
        <section class="cg-works-head">
          <h1 class="cg-page-title">Selected Projects</h1>
          <span class="cg-works-count">Five projects</span>
        </section>
        <section class="cg-ogrid feature" style="margin-top: var(--space-7)"></section>
      </main>`);
    const grid = main.querySelector(".cg-ogrid");
    CG_PROJECTS.forEach((p) =>
      grid.appendChild(OverlayCard(p.images[0], p.title, { view: "project", id: p.id }))
    );
    return main;
  }

  function ProjectDetail(id) {
    const len = CG_PROJECTS.length;
    const idx = Math.max(0, CG_PROJECTS.findIndex((p) => p.id === id));
    const project = CG_PROJECTS[idx];
    const prev = CG_PROJECTS[(idx - 1 + len) % len];
    const next = CG_PROJECTS[(idx + 1) % len];

    const desc =
      project.description && project.description.length
        ? `<section class="cg-project2-text">${project.description
            .map((p) => `<p>${esc(p)}</p>`)
            .join("")}</section>`
        : "";

    const main = node(`
      <main class="cg-project2" data-screen-label="Project ${project.index}">
        <div class="cg-page cg-crumb-wrap">
          <nav class="cg-crumb">
            <a href="${hrefFor("works")}" data-go data-view="works">Projects</a>
            <span class="cg-crumb-sep">/</span>
            <span class="cg-crumb-here">${esc(project.title)}</span>
          </nav>
        </div>

        <header class="cg-cover">
          <img class="cg-cover-img" src="${rA(project.images[0])}" alt="${esc(project.title)}">
          <span class="cg-cover-veil"></span>
          <div class="cg-cover-inner cg-page">
            <h1 class="cg-cover-title">${esc(project.title)}</h1>
            <div class="cg-cover-tags">${project.program
              .map((t) => `<span class="cg-tag">${esc(t)}</span>`)
              .join("")}</div>
          </div>
        </header>

        <div class="cg-page cg-project2-body">
          <div class="cg-gallery-jump">
            <button class="cg-tag-btn">Image Gallery</button>
          </div>
          ${desc}
          <section class="cg-gallery"></section>
          <nav class="cg-project-nav">
            <a class="cg-pn" href="${esc(hrefFor("project", prev.id))}" data-go data-view="project" data-id="${esc(prev.id)}">
              <span class="cg-pn-dir">← Previous</span>
              <span class="cg-pn-title">${esc(prev.title)}</span>
            </a>
            <a class="cg-pn next" href="${esc(hrefFor("project", next.id))}" data-go data-view="project" data-id="${esc(next.id)}">
              <span class="cg-pn-dir">Next →</span>
              <span class="cg-pn-title">${esc(next.title)}</span>
            </a>
          </nav>
        </div>
      </main>`);

    const gallery = main.querySelector(".cg-gallery");
    gallery.appendChild(ProjectCarousel(project.images, project.title));

    main.querySelector(".cg-tag-btn").addEventListener("click", () => {
      const y = gallery.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo(0, y);
    });

    return main;
  }

  function Research() {
    const main = node(`
      <main class="cg-page cg-research" data-screen-label="Research">
        <section class="cg-research-head"><h1 class="cg-page-title">Research</h1></section>
        <section class="cg-rcard-list"></section>
      </main>`);
    const list = main.querySelector(".cg-rcard-list");
    CG_RESEARCH.items.forEach((item) => {
      list.appendChild(
        node(`
        <article class="cg-rcard" data-go data-view="research-detail" data-id="${esc(item.id)}">
          <div class="cg-rcard-media"><img src="${rA(item.cover || item.images[0])}" alt="${esc(
          item.title
        )}" loading="lazy"></div>
          <div class="cg-rcard-body">
            <span class="cg-rcard-index">${item.index}</span>
            <div class="cg-rcard-text">
              <div class="cg-rcard-meta">${esc(item.meta)}${
          item.location ? " · " + esc(item.location) : ""
        }</div>
              <h2 class="cg-rcard-title">${esc(item.title)}</h2>
            </div>
            <span class="cg-rcard-arrow">→</span>
          </div>
        </article>`)
      );
    });
    return main;
  }

  function ResearchDetail(id) {
    const items = CG_RESEARCH.items;
    const len = items.length;
    const idx = Math.max(0, items.findIndex((p) => p.id === id));
    const item = items[idx];
    const prev = items[(idx - 1 + len) % len];
    const next = items[(idx + 1) % len];

    const descHtml = (item.description || []).map((para) => `<p>${renderRich(para)}</p>`).join("");
    const secHtml = (item.sections || [])
      .map(
        (sec) => `
      <div class="cg-research-section">
        ${sec.heading ? `<h2 class="cg-research-section-title">${esc(sec.heading)}</h2>` : ""}
        ${sec.question ? `<p class="cg-research-question">${esc(sec.question)}</p>` : ""}
        ${sec.paragraphs.map((para) => `<p>${renderRich(para)}</p>`).join("")}
      </div>`
      )
      .join("");

    const main = node(`
      <main class="cg-page cg-project cg-research-detail" data-screen-label="Research ${item.index}">
        <div class="cg-project-back">
          <a class="cg-arrow-link" href="${hrefFor("research")}" data-go data-view="research"><span class="ar ar-l">←</span><span>Research</span></a>
          <span class="cg-project-counter">${item.index} / ${pad2(len)}</span>
        </div>

        <h1 class="cg-project-title">${esc(item.title)}</h1>

        <div data-carousel-slot></div>

        <div class="cg-project-lower">
          <dl class="cg-meta" style="grid-template-columns: max-content 1fr">
            <div class="cg-meta-row"><dt class="cg-meta-k">Type</dt><dd class="cg-meta-v">${esc(
              item.meta
            )}</dd></div>
            ${
              item.location
                ? `<div class="cg-meta-row"><dt class="cg-meta-k">Context</dt><dd class="cg-meta-v">${esc(
                    item.location
                  )}</dd></div>`
                : ""
            }
          </dl>
          <div class="cg-project-text">${descHtml}${secHtml}</div>
        </div>

        <nav class="cg-project-nav">
          <a class="cg-pn" href="${esc(hrefFor("research-detail", prev.id))}" data-go data-view="research-detail" data-id="${esc(prev.id)}">
            <span class="cg-pn-dir">← Previous</span>
            <span class="cg-pn-title">${esc(prev.title)}</span>
          </a>
          <a class="cg-pn next" href="${esc(hrefFor("research-detail", next.id))}" data-go data-view="research-detail" data-id="${esc(next.id)}">
            <span class="cg-pn-dir">Next →</span>
            <span class="cg-pn-title">${esc(next.title)}</span>
          </a>
        </nav>
      </main>`);

    main.querySelector("[data-carousel-slot]").replaceWith(ProjectCarousel(item.images, item.title));
    return main;
  }

  function Profile() {
    return node(`
      <main class="cg-page cg-profile" data-screen-label="Profile">
        <section class="cg-profile-top">
          <div class="cg-profile-statement">
            <h1 class="cg-profile-name">Camila Grimaldi</h1>
            <div class="cg-profile-subtitle">Italian-Argentine architect</div>
            <div class="cg-profile-role">Profile</div>
            <div class="cg-profile-body prose">
              <p>Born in Buenos Aires and influenced by both Argentine and Italian cultures, I developed an early awareness of the relationship between place, identity and the built environment.</p>
              <p>I am an architect with international academic and professional experience across Argentina and Italy. Working within these diverse contexts has deepened my interest in the interplay between architecture, landscape and the experience of place, while reinforcing the importance of understanding each site's environmental, cultural and spatial qualities as a foundation for design.</p>
              <p>I am particularly interested in projects that create meaningful relationships between people and place, approaching design through a balance of conceptual thinking, technical rigour and continuous refinement. I see architecture as an opportunity to respond thoughtfully to its surroundings while enriching the way people inhabit and experience space.</p>
            </div>
            <div class="cg-profile-cta">
              <a class="cg-btn-ink" href="${rA(
                "files/Camila Grimaldi CV.pdf"
              )}" download="Camila Grimaldi CV.pdf">Download CV</a>
            </div>
          </div>
          ${PlateHTML({ src: "img/GRIMALDI CAMILA PROFILE - copia 03.jpg", ratio: "1/1", fit: "cover" })}
        </section>

        <section class="cg-profile-cols">
          <div class="cg-info-col">
            <div class="cg-eyebrow">Education</div>
            <ul class="cg-info-list">
              <li><span class="y">2025</span> High-Level Training Course in Architecture for Hospitality / YACademy, Bologna, Italy</li>
              <li><span class="y">2017 — 2022</span> Degree in Architecture / University of Buenos Aires (UBA), Argentina</li>
              <li><span class="y">2012 — 2016</span> International Baccalaureate (IB) / De La Salle College, Buenos Aires, Argentina</li>
            </ul>
          </div>
          <div class="cg-info-col">
            <div class="cg-eyebrow">Professional Experience</div>
            <ul class="cg-info-list">
              <li><span class="y">2026 — Present</span> Architectural Intern / Open Project (Bologna, Italy)</li>
              <li><span class="y">2023 — 2025</span> Architect / XFB Studio (Buenos Aires, Argentina)</li>
              <li><span class="y">2022 — 2023</span> Architect / BMA Studio (Buenos Aires, Argentina)</li>
              <li><span class="y">2021 — 2022</span> Junior Architect / Grupo Naistat (Buenos Aires, Argentina)</li>
              <li><span class="y">2020 — Present</span> Freelance Architectural Visualiser</li>
            </ul>
          </div>
        </section>
      </main>`);
  }

  function Contact() {
    const main = node(`
      <main class="cg-page cg-contact" data-screen-label="Contact">
        <section class="cg-contact-top">
          <h1 class="cg-page-title">Contact</h1>
          <p class="cg-contact-loc">Available for projects across Italy and Europe</p>
        </section>

        <section class="cg-contact-grid">
          <form class="cg-form" novalidate>
            <div class="cg-field"><label>Name</label><input name="name" required placeholder="Your name"></div>
            <div class="cg-field"><label>Email</label><input name="email" type="email" required placeholder="name@studio.com"></div>
            <div class="cg-field"><label>Message</label><textarea name="message" rows="3" required placeholder="Tell me about the project"></textarea></div>
            <!-- Honeypot: hidden from people, tempting to bots; a checked value is rejected. -->
            <input type="checkbox" name="botcheck" class="cg-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
            <button class="cg-btn-ink" type="submit">Send enquiry</button>
            <p class="cg-form-note" role="status" aria-live="polite" hidden></p>
          </form>
          <aside class="cg-contact-aside">
            <div class="cg-info-col">
              <div class="cg-eyebrow">Email</div>
              <p class="cg-contact-detail"><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
            </div>
            <div class="cg-info-col">
              <div class="cg-eyebrow">Phone</div>
              <p class="cg-contact-detail"><a href="tel:+393520244112">+39 352 024 4112</a></p>
            </div>
            <div class="cg-info-col">
              <div class="cg-eyebrow">LinkedIn</div>
              <p class="cg-contact-detail"><a href="https://www.linkedin.com/in/camila-grimaldi-56516621a" target="_blank" rel="noopener">camila-grimaldi</a></p>
            </div>
          </aside>
        </section>
      </main>`);

    const form = main.querySelector(".cg-form");
    const btn = form.querySelector("button");
    const note = form.querySelector(".cg-form-note");

    const showNote = (msg, isError) => {
      note.textContent = msg;
      note.hidden = false;
      note.classList.toggle("error", !!isError);
    };

    // Fallback for when no Web3Forms key is configured yet: open the visitor's
    // mail client with the message pre-filled (the original behaviour).
    const mailtoFallback = (name, email, message) => {
      const subject = "Website enquiry" + (name ? " — " + name : "");
      const body = "Name: " + name + "\nEmail: " + email + "\n\n" + message + "\n";
      window.location.href =
        "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      btn.textContent = "Opening your email…";
      showNote("Your email app should open with the message ready to send to " + CONTACT_EMAIL + ".");
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = (form.elements.name.value || "").trim();
      const email = (form.elements.email.value || "").trim();
      const message = (form.elements.message.value || "").trim();

      if (!name || !email || !message) {
        showNote("Please fill in your name, email and a short message.", true);
        return;
      }
      // Spam honeypot — real visitors never check this hidden box.
      if (form.elements.botcheck && form.elements.botcheck.checked) return;

      if (!web3formsEnabled()) {
        mailtoFallback(name, email, message);
        return;
      }

      btn.disabled = true;
      const original = "Send enquiry";
      btn.textContent = "Sending…";
      note.hidden = true;
      note.classList.remove("error");

      try {
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            access_key: WEB3FORMS_ACCESS_KEY,
            subject: "Website enquiry" + (name ? " — " + name : ""),
            from_name: "Camila Grimaldi — Portfolio",
            name,
            email,
            message,
            replyto: email
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          btn.textContent = "Sent ✓";
          showNote("Thank you — your message has been sent. I'll get back to you soon.");
          form.reset();
        } else {
          btn.disabled = false;
          btn.textContent = original;
          showNote(
            "Sorry, something went wrong sending your message. Please email me directly at " + CONTACT_EMAIL + ".",
            true
          );
        }
      } catch (err) {
        // Network failure → don't lose the message; hand off to the mail client.
        btn.disabled = false;
        btn.textContent = original;
        mailtoFallback(name, email, message);
      }
    });

    return main;
  }

  // ── Router + render loop ────────────────────────────────────────────────────
  function renderView() {
    const r = state.route;
    switch (r.view) {
      case "home": return Home();
      case "works": return Works();
      case "research": return Research();
      case "research-detail": return ResearchDetail(r.id);
      case "project": return ProjectDetail(r.id);
      case "profile": return Profile();
      case "contact": return Contact();
      default: return Home();
    }
  }

  function render() {
    runCleanups();
    appEl.innerHTML = "";
    appEl.appendChild(Nav());
    const reveal = node(`<div class="cg-reveal"></div>`);
    reveal.appendChild(renderView());
    appEl.appendChild(reveal);
    appEl.appendChild(Footer());
    setupNavScroll();
  }

  // ── Boot ────────────────────────────────────────────────────────────────────
  function boot() {
    appEl = document.getElementById("app");

    // Single delegated handler drives all in-app navigation (nav, footer, cards,
    // prev/next, breadcrumb, section links, mobile menu). Real external links
    // (mailto:, tel:, https:, the CV download) carry no [data-go] and pass through.
    // Modifier-clicks (new tab / new window) are left to the browser so the real
    // href on each link opens normally.
    document.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const t = e.target.closest("[data-go]");
      if (!t) return;
      e.preventDefault();
      const view = t.getAttribute("data-view");
      const id = t.getAttribute("data-id");
      go(id ? { view, id } : { view });
    });

    // Back/forward buttons and direct hash edits re-render the matching view.
    window.addEventListener("hashchange", onHashChange);

    state.route = hashToRoute();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
