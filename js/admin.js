/* ==========================================================================
   DCreator – owner mode
   · Access-code gate (client-side – hides the UI, it is not server security)
   · Portfolio manager: add / edit / delete links, image, auto-translation
   · Publishing helper and analytics dashboard
   ========================================================================== */
(function () {
  const cfg = DC.config;
  const $ = (id) => document.getElementById(id);
  const tt = (key, vars) => DC.i18n.t(key, DC.i18n.adminLang(), vars);   // admin-panel language
  const P = () => DC.portfolio;

  /* ------------------------------------------------------------ SHA-256 */
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  function sha256(str) {
    const bytes = new TextEncoder().encode(str);
    const len = bytes.length;
    const padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
    padded.set(bytes);
    padded[len] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, Math.floor((len * 8) / 4294967296));
    view.setUint32(padded.length - 4, (len * 8) >>> 0);

    let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const w = new Uint32Array(64);
    for (let off = 0; off < padded.length; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = w[i - 16] + s0 + w[i - 7] + s1;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H = [H[0] + a, H[1] + b, H[2] + c, H[3] + d, H[4] + e, H[5] + f, H[6] + g, H[7] + h].map((x) => x | 0);
    }
    return H.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
  }

  /* ------------------------------------------------------------- session */
  const isAdmin = () => DC.store.session.read(cfg.keys.adminSession) === "1";

  const loginDlg = $("admin-login");
  const panel = $("admin-panel");
  const codeInput = $("admin-code");
  const loginError = $("admin-login-error");
  let attempts = 0;
  let lockedUntil = 0;

  function lockScroll(on) { document.body.style.overflow = on ? "hidden" : ""; }

  function openLogin() {
    loginError.hidden = true;
    codeInput.value = "";
    loginDlg.showModal();
    codeInput.focus();
  }

  function onLogin(e) {
    e.preventDefault();
    const wait = Math.ceil((lockedUntil - Date.now()) / 1000);
    if (wait > 0) {
      loginError.textContent = tt("admin.login.locked", { s: wait });
      loginError.hidden = false;
      return;
    }
    if (sha256(cfg.adminSalt + codeInput.value) === cfg.adminHash) {
      attempts = 0;
      DC.store.session.write(cfg.keys.adminSession, "1");
      codeInput.value = "";
      loginDlg.close();
      openPanel();
      return;
    }
    attempts += 1;
    codeInput.value = "";
    if (attempts >= cfg.adminMaxAttempts) {
      attempts = 0;
      lockedUntil = Date.now() + cfg.adminLockSeconds * 1000;
      loginError.textContent = tt("admin.login.locked", { s: cfg.adminLockSeconds });
    } else {
      loginError.textContent = tt("admin.login.err");
    }
    loginError.hidden = false;
    codeInput.focus();
  }

  function openPanel() {
    selectTab("portfolio");
    resetForm();
    renderList();
    renderPublish();
    panel.showModal();
    const heading = panel.querySelector("h2");
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }

  function logout() {
    DC.store.session.remove(cfg.keys.adminSession);
    panel.close();
  }

  /* ----------------------------------------------------------------- tabs */
  function selectTab(name) {
    ["portfolio", "analytics"].forEach((n) => {
      const on = n === name;
      const tab = $("tab-" + n);
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", String(on));
      $("pane-" + n).hidden = !on;
    });
    if (name === "analytics") renderAnalytics();
  }

  /* ----------------------------------------------------- portfolio manager */
  const f = {};              // form controls, filled in init()
  let editingId = null;
  let imageValue = "";       // https URL or data: URL
  let gridVals = {};         // lang -> { title, desc } for the translation rows
  let busy = false;

  const dirOf = (lang) => DC.i18n.dirOf(lang);

  function showError(msg) { f.error.textContent = msg; f.error.hidden = false; f.status.hidden = true; }
  function showStatus(msg) { f.status.textContent = msg; f.status.hidden = false; f.error.hidden = true; }
  function clearMessages() { f.error.hidden = true; f.status.hidden = true; }

  function setBusy(on) {
    busy = on;
    f.save.disabled = on;
    f.form.querySelectorAll("input, select, textarea, button").forEach((c) => { if (c !== f.save) c.disabled = on; });
  }

  function setImage(value) {
    imageValue = value || "";
    f.preview.style.backgroundImage = imageValue && P().isImageSrc(imageValue)
      ? 'url("' + imageValue.replace(/"/g, "%22") + '")' : "";
    f.imageUrl.value = imageValue.startsWith("data:") ? "" : imageValue;
  }

  function applySourceDirection() {
    const dir = dirOf(f.lang.value);
    f.title.dir = dir;
    f.desc.dir = dir;
  }

  function buildTranslationRows() {
    const src = f.lang.value;
    f.rows.textContent = "";
    P().LANGS.filter((l) => l !== src).forEach((lang) => {
      const row = document.createElement("div");
      row.className = "tr-row";
      row.lang = lang;
      row.dir = dirOf(lang);
      const label = document.createElement("strong");
      label.textContent = cfg.languages[lang].name;
      const title = document.createElement("input");
      title.type = "text";
      title.maxLength = 80;
      title.value = (gridVals[lang] && gridVals[lang].title) || "";
      const desc = document.createElement("textarea");
      desc.maxLength = 400;
      desc.rows = 2;
      desc.value = (gridVals[lang] && gridVals[lang].desc) || "";
      const sync = () => { gridVals[lang] = { title: title.value, desc: desc.value }; };
      title.addEventListener("input", sync);
      desc.addEventListener("input", sync);
      row.append(label, title, desc);
      f.rows.appendChild(row);
    });
  }

  function resetForm(keepStatus) {
    editingId = null;
    gridVals = {};
    f.form.reset();
    f.lang.value = DC.i18n.lang;
    f.auto.checked = true;
    f.file.value = "";
    setImage("");
    applySourceDirection();
    buildTranslationRows();
    f.translations.open = false;
    f.cancel.hidden = true;
    f.formTitle.dataset.i18n = "f.add";
    f.formTitle.textContent = tt("f.add");
    if (!keepStatus) clearMessages();
  }

  function startEdit(id) {
    const item = P().byId(id);
    if (!item) return;
    resetForm();
    editingId = id;
    const src = item.srcLang && cfg.languages[item.srcLang] ? item.srcLang : DC.i18n.lang;
    f.lang.value = src;
    f.category.value = item.category;
    f.title.value = P().pick(item.title, src, src);
    f.desc.value = P().pick(item.desc, src, src);
    f.url.value = item.url;
    setImage(item.image || "");
    gridVals = {};
    P().LANGS.filter((l) => l !== src).forEach((l) => {
      gridVals[l] = { title: (item.title && item.title[l]) || "", desc: (item.desc && item.desc[l]) || "" };
    });
    f.auto.checked = false;               // keep the existing translations unless the text changes
    applySourceDirection();
    buildTranslationRows();
    f.cancel.hidden = false;
    f.formTitle.dataset.i18n = "f.edit";
    f.formTitle.textContent = tt("f.edit");
    f.form.scrollIntoView({ behavior: "smooth", block: "start" });
    f.title.focus({ preventScroll: true });
  }

  async function onSave(e) {
    e.preventDefault();
    if (busy) return;
    clearMessages();

    const src = f.lang.value;
    const title = f.title.value.trim();
    const desc = f.desc.value.trim();
    const url = P().safeUrl(f.url.value);
    if (!title) { showError(tt("f.errTitle")); f.title.focus(); return; }
    if (!url) { showError(tt("f.errUrl")); f.url.focus(); return; }

    let image = imageValue;
    const typedImage = f.imageUrl.value.trim();
    if (typedImage && !imageValue.startsWith("data:")) {
      image = P().safeUrl(typedImage);
      if (!image) { showError(tt("f.errUrl")); f.imageUrl.focus(); return; }
    }

    const others = P().LANGS.filter((l) => l !== src);
    const titles = { [src]: title };
    const descs = { [src]: desc };
    let failed = [];

    setBusy(true);
    try {
      if (f.auto.checked && cfg.translation.enabled) {
        showStatus(tt("f.translating", { n: 0, total: others.length }));
        const res = await P().translateAll({ title, desc }, src, (n, total) => showStatus(tt("f.translating", { n, total })));
        failed = res.failed;
        others.forEach((l) => {
          titles[l] = res.title[l];
          descs[l] = res.desc[l];
          gridVals[l] = { title: res.title[l], desc: res.desc[l] };
        });
      } else {
        others.forEach((l) => {
          const g = gridVals[l] || {};
          titles[l] = (g.title || "").trim() || title;
          descs[l] = (g.desc || "").trim() || desc;
        });
      }

      const existing = editingId ? P().byId(editingId) : null;
      const saved = P().upsert({
        id: editingId || P().newId(),
        category: f.category.value,
        url, image,
        srcLang: src,
        title: titles,
        desc: descs,
        createdAt: existing && existing.createdAt ? existing.createdAt : Date.now()
      });
      if (!saved) { showError(tt("f.errStorage")); return; }

      const langNames = failed.map((l) => cfg.languages[l].name).join(", ");
      resetForm(true);
      showStatus(failed.length ? tt("f.translateFail", { langs: langNames }) : tt("f.saved"));
    } finally {
      setBusy(false);
    }
  }

  async function onFile() {
    const file = f.file.files[0];
    if (!file) return;
    clearMessages();
    try {
      setImage(await P().processImageFile(file));
    } catch (err) {
      showError(tt(err.message === "size" ? "f.errImageSize" : "f.errImage"));
    }
    f.file.value = "";
  }

  /* ------------------------------------------------------------ list/publish */
  function renderList() {
    const list = $("admin-list");
    const all = P().all();
    $("admin-list-title").textContent = tt("list.title", { n: all.length });
    list.textContent = "";
    if (!all.length) {
      const p = document.createElement("li");
      p.className = "admin-empty";
      p.textContent = tt("list.empty");
      list.appendChild(p);
      return;
    }
    const lang = DC.i18n.adminLang();
    all.forEach((item) => {
      const li = document.createElement("li");

      const thumb = document.createElement("div");
      thumb.className = "thumb";
      if (item.image && P().isImageSrc(item.image)) {
        const img = new Image();
        img.alt = "";
        img.src = item.image;
        img.referrerPolicy = "no-referrer";
        img.addEventListener("error", () => img.replaceWith(P().thumbFallback(item)), { once: true });
        thumb.appendChild(img);
      } else {
        thumb.appendChild(P().thumbFallback(item));
      }

      const name = P().pick(item.title, item.srcLang, item.srcLang) || P().pick(item.title, lang, item.srcLang);
      const meta = document.createElement("div");
      meta.className = "meta";
      const strong = document.createElement("strong");
      strong.textContent = name;
      const host = document.createElement("span");
      host.textContent = P().hostOf(item.url) + " · " + DC.i18n.t("filter." + item.category, lang);
      meta.append(strong, host);

      li.append(thumb, meta, iconButton("i-edit", tt("list.edit"), () => startEdit(item.id)),
        iconButton("i-trash", tt("list.delete"), () => {
          if (!window.confirm(tt("list.confirmDelete", { t: name }))) return;
          if (editingId === item.id) resetForm();
          P().remove(item.id);
        }, "danger"));
      list.appendChild(li);
    });
  }

  function iconButton(icon, label, onClick, extra) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "icon-btn" + (extra ? " " + extra : "");
    b.title = label;
    b.setAttribute("aria-label", label);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#" + icon);
    svg.appendChild(use);
    b.appendChild(svg);
    b.addEventListener("click", onClick);
    return b;
  }

  function renderPublish() {
    const status = $("publish-status");
    const dirty = P().isDirty();
    status.textContent = tt(dirty ? "pub.dirty" : "pub.clean");
    status.className = "publish-status " + (dirty ? "is-dirty" : "is-clean");
    $("pub-reset").disabled = !dirty;
  }

  function exportFile() {
    const blob = new Blob([P().exportJs()], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio-data.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ------------------------------------------------------------ analytics */
  function fmtDuration(sec) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h ? h + ":" + pad(m) + ":" + pad(s) : m + ":" + pad(s);
  }

  function renderAnalytics() {
    const r = DC.analytics.report();
    const tiles = [
      [r.visits.toLocaleString(), "an.visits"],
      [fmtDuration(r.avgSeconds), "an.avg"],
      [r.whatsapp.toLocaleString(), "an.whatsapp"],
      [r.quizClicks.toLocaleString(), "an.quizClicks"],
      [r.quizSent.toLocaleString(), "an.quizSent"]
    ];
    const grid = $("stat-grid");
    grid.textContent = "";
    tiles.forEach(([value, key]) => {
      const box = document.createElement("div");
      box.className = "stat";
      const v = document.createElement("div");
      v.className = "value";
      v.textContent = value;
      const l = document.createElement("div");
      l.className = "label";
      l.textContent = tt(key);
      box.append(v, l);
      grid.appendChild(box);
    });

    const list = $("referrer-list");
    list.textContent = "";
    if (!r.referrers.length) {
      const li = document.createElement("li");
      li.className = "admin-empty";
      li.textContent = tt("an.none");
      list.appendChild(li);
    }
    const top = r.referrers.length ? r.referrers[0].count : 1;
    r.referrers.forEach((ref) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = ref.name === "__direct__" ? tt("an.direct") : ref.name;
      const num = document.createElement("span");
      num.className = "num";
      num.textContent = ref.count.toLocaleString();
      const bar = document.createElement("span");
      bar.className = "bar";
      const fill = document.createElement("i");
      fill.style.setProperty("--w", Math.max(4, Math.round((ref.count / top) * 100)) + "%");
      bar.appendChild(fill);
      li.append(name, num, bar);
      list.appendChild(li);
    });

    $("analytics-since").textContent = tt("an.since", { d: new Date(r.since).toLocaleDateString(DC.i18n.adminLang()) });
  }

  /* ----------------------------------------------------------------- init */
  function init() {
    Object.assign(f, {
      form: $("link-form"), formTitle: $("link-form-title"),
      lang: $("f-lang"), category: $("f-category"), title: $("f-title"), desc: $("f-desc"), url: $("f-url"),
      imageUrl: $("f-image-url"), file: $("f-image-file"), preview: $("f-image-preview"), clearImage: $("f-image-clear"),
      auto: $("f-auto"), translations: $("f-translations"), rows: $("f-translation-rows"),
      error: $("link-form-error"), status: $("link-form-status"), save: $("f-save"), cancel: $("f-cancel")
    });

    Object.keys(cfg.languages).forEach((code) => {
      const o = document.createElement("option");
      o.value = code;
      o.textContent = cfg.languages[code].name;
      f.lang.appendChild(o);
    });

    $("admin-open").addEventListener("click", () => (isAdmin() ? openPanel() : openLogin()));
    $("admin-login-form").addEventListener("submit", onLogin);
    $("admin-login-cancel").addEventListener("click", () => loginDlg.close());
    loginDlg.addEventListener("click", (e) => { if (e.target === loginDlg) loginDlg.close(); });
    $("admin-close").addEventListener("click", () => panel.close());
    $("admin-logout").addEventListener("click", logout);
    /* keep the page from scrolling behind an open dialog */
    const scrollWatcher = new MutationObserver(() => lockScroll(loginDlg.open || panel.open));
    [loginDlg, panel].forEach((d) => scrollWatcher.observe(d, { attributes: true, attributeFilter: ["open"] }));

    $("tab-portfolio").addEventListener("click", () => selectTab("portfolio"));
    $("tab-analytics").addEventListener("click", () => selectTab("analytics"));

    f.form.addEventListener("submit", onSave);
    f.cancel.addEventListener("click", () => resetForm());
    f.lang.addEventListener("change", () => { applySourceDirection(); buildTranslationRows(); f.auto.checked = true; });
    [f.title, f.desc].forEach((c) => c.addEventListener("input", () => { f.auto.checked = true; }));
    f.imageUrl.addEventListener("input", () => {
      const v = f.imageUrl.value.trim();
      imageValue = P().safeUrl(v);
      f.preview.style.backgroundImage = imageValue ? 'url("' + imageValue.replace(/"/g, "%22") + '")' : "";
    });
    f.file.addEventListener("change", onFile);
    f.clearImage.addEventListener("click", () => { f.file.value = ""; setImage(""); });

    $("pub-export").addEventListener("click", exportFile);
    $("pub-reset").addEventListener("click", () => {
      if (window.confirm(tt("pub.confirmReset"))) { P().resetLocal(); resetForm(); }
    });
    $("analytics-reset").addEventListener("click", () => {
      if (window.confirm(tt("an.confirmReset"))) { DC.analytics.reset(); renderAnalytics(); }
    });

    document.addEventListener("dc:portfoliochange", () => { if (panel.open) { renderList(); renderPublish(); } });
    document.addEventListener("dc:langchange", () => {
      if (!panel.open) return;
      renderList(); renderPublish();
      if (!$("pane-analytics").hidden) renderAnalytics();
      f.formTitle.textContent = tt(editingId ? "f.edit" : "f.add");
    });
  }

  DC.admin = { init, isAdmin, sha256 };
})();
