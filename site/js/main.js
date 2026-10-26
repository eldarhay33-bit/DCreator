/* ==========================================================================
   DCreator – bootstrap: logo, theme, effects toggle, language, mobile nav
   ========================================================================== */
(function () {
  const cfg = DC.config;
  const html = document.documentElement;
  const $ = (id) => document.getElementById(id);

  /* ---------------------------------------------------------------- logo */
  function logoSvg() {
    return document.getElementById("logo-svg-tpl").content.firstElementChild.cloneNode(true);
  }

  function buildLogo(container) {
    container.textContent = "";
    const wantImage = (cfg.logoMode === "image" || cfg.logoMode === "both") && cfg.logoImage;
    if (!wantImage) { container.appendChild(logoSvg()); return; }

    const img = new Image();
    img.className = "logo-img";
    img.alt = cfg.brand;
    img.addEventListener("error", () => {
      img.remove();
      if (!container.querySelector(".logo-svg")) container.appendChild(logoSvg());
    }, { once: true });
    img.src = cfg.logoImage;
    container.appendChild(img);
    if (cfg.logoMode === "both") container.appendChild(logoSvg());
  }

  /* --------------------------------------------------------------- theme */
  function updateToggleLabels() {
    const theme = html.dataset.theme;
    const themeBtn = $("theme-toggle");
    const themeLabel = DC.i18n.t(theme === "night" ? "ui.theme.toDay" : "ui.theme.toNight");
    themeBtn.setAttribute("aria-label", themeLabel);
    themeBtn.title = themeLabel;

    const on = html.dataset.fx !== "off";
    const fxBtn = $("fx-toggle");
    const fxLabel = DC.i18n.t(on ? "ui.fx.on" : "ui.fx.off");
    fxBtn.setAttribute("aria-label", fxLabel);
    fxBtn.title = fxLabel;
    fxBtn.dataset.state = on ? "on" : "off";
  }

  function setTheme(theme, persist) {
    html.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "night" ? "#07090d" : "#f1faff";
    if (persist) DC.prefs.set({ theme });
    updateToggleLabels();
  }

  function setFx(on, persist) {
    html.dataset.fx = on ? "on" : "off";
    DC.effects.set(on);
    if (persist) DC.prefs.set({ fx: on });
    updateToggleLabels();
  }

  /* ------------------------------------------------------------ language */
  function initLanguageSelect() {
    const select = $("lang-select");
    Object.keys(cfg.languages).forEach((code) => {
      const o = document.createElement("option");
      o.value = code;
      o.textContent = cfg.languages[code].name;
      select.appendChild(o);
    });
    select.addEventListener("change", () => DC.i18n.setLang(select.value));
    document.addEventListener("dc:langchange", (e) => { select.value = e.detail.lang; updateToggleLabels(); });
  }

  /* ----------------------------------------------------------- mobile nav */
  function initNav() {
    const header = $("site-header");
    const toggle = $("nav-toggle");
    const nav = $("main-nav");
    const setOpen = (open) => {
      header.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };
    toggle.addEventListener("click", () => setOpen(!header.classList.contains("nav-open")));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    document.addEventListener("click", (e) => { if (!header.contains(e.target)) setOpen(false); });
    window.matchMedia("(min-width: 901px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
  }

  /* ----------------------------------------------------------------- init */
  function init() {
    const prefs = DC.prefs.get();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.querySelectorAll("[data-logo]").forEach(buildLogo);
    $("year").textContent = new Date().getFullYear();

    DC.analytics.init();
    DC.portfolio.init();
    DC.questionnaire.init();
    DC.mail.initForm();
    DC.admin.init();
    initLanguageSelect();
    initNav();

    $("theme-toggle").addEventListener("click", () => setTheme(html.dataset.theme === "night" ? "day" : "night", true));
    $("fx-toggle").addEventListener("click", () => setFx(html.dataset.fx === "off", true));

    setTheme(prefs.theme === "night" ? "night" : "day", false);   // day (blue-white) is the default
    setFx(typeof prefs.fx === "boolean" ? prefs.fx : !reducedMotion, false);
    DC.i18n.setLang(cfg.languages[prefs.lang] ? prefs.lang : cfg.defaultLang, false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
