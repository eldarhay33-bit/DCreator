/* ==========================================================================
   DCreator – quote questionnaire (4-step wizard → WhatsApp)
   ========================================================================== */
(function () {
  const cfg = DC.config;
  const form = document.getElementById("quote-form");
  if (!form) return;

  const steps = Array.from(form.querySelectorAll(".step"));
  const dots = Array.from(form.querySelectorAll("#quote-progress li"));
  const backBtn = document.getElementById("quote-back");
  const nextBtn = document.getElementById("quote-next");
  const sendBtn = document.getElementById("quote-send");
  const errorBox = document.getElementById("quote-error");
  const preview = document.getElementById("quote-preview");
  const done = document.getElementById("quote-done");
  const doneLink = document.getElementById("quote-done-link");
  const TOTAL = steps.length;
  let current = 1;

  const field = (name) => form.querySelector('[name="' + name + '"]');
  const checked = (name) => { const r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ""; };
  const t = (key) => DC.i18n.t(key);

  function read() {
    return {
      type: checked("type"),
      typeOther: field("typeOther").value.trim(),
      budget: field("budget").value.trim(),
      budgetMode: checked("budgetMode"),
      timeline: field("timeline").value.trim(),
      timelineMode: checked("timelineMode"),
      name: field("name").value.trim(),
      notes: field("notes").value.trim()
    };
  }

  /* ---------------------------------------------------------- message */
  function buildMessage() {
    const lang = cfg.whatsappMessageLang === "ui" ? DC.i18n.lang : "he";
    const T = (key) => DC.i18n.t(key, lang);
    const d = read();
    const none = T("wa.none");

    const type = [d.type && T("q1." + d.type), d.typeOther].filter(Boolean).join(" – ") || none;

    let budget = d.budget || none;
    if (d.budget && d.budgetMode) {
      const prefix = T("q2." + d.budgetMode).replace(/[.…]+$/, "");
      budget = prefix + (lang === "he" && /ה$/.test(prefix) ? "-" : " ") + d.budget;
    }

    const timeline = [d.timelineMode && T("q3." + d.timelineMode), d.timeline].filter(Boolean).join(" – ") || none;

    return [
      T("wa.greeting"),
      "",
      "*" + T("wa.type") + ":* " + type,
      "*" + T("wa.budget") + ":* " + budget,
      "*" + T("wa.timeline") + ":* " + timeline,
      "*" + T("wa.name") + ":* " + (d.name || none),
      "*" + T("wa.notes") + ":* " + (d.notes || none),
      "",
      "(" + T("wa.lang") + ": " + cfg.languages[DC.i18n.lang].name + ")"
    ].join("\n");
  }

  const whatsappUrl = () => cfg.whatsappUrl + "?text=" + encodeURIComponent(buildMessage());
  const updatePreview = () => { if (current === TOTAL) preview.textContent = buildMessage(); };

  /* ------------------------------------------------------------ steps */
  function showError(key) { errorBox.textContent = t(key); errorBox.hidden = false; }
  function clearError() { errorBox.hidden = true; errorBox.textContent = ""; }

  function validate(step) {
    const d = read();
    if (step === 1 && !d.type && !d.typeOther) { showError("quote.err.type"); return false; }
    if (step === TOTAL && !d.name) { showError("quote.err.name"); field("name").focus(); return false; }
    clearError();
    return true;
  }

  function show(n, userAction) {
    current = n;
    steps.forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
    dots.forEach((li) => {
      const i = Number(li.dataset.step);
      li.classList.toggle("is-active", i === n);
      li.classList.toggle("is-done", i < n);
      if (i === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    backBtn.hidden = n === 1;
    nextBtn.hidden = n === TOTAL;
    sendBtn.hidden = n !== TOTAL;
    clearError();
    updatePreview();

    if (userAction) {
      const legend = steps[n - 1].querySelector("legend");
      legend.tabIndex = -1;
      legend.focus({ preventScroll: true });
      if (form.getBoundingClientRect().top < 70) form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function goNext() { if (validate(current) && current < TOTAL) show(current + 1, true); }
  function goBack() { if (current > 1) show(current - 1, true); }

  /* Radios that can be switched off again by clicking them a second time. */
  function toggleableRadios(container) {
    container.addEventListener("click", (e) => {
      const input = e.target.closest('input[type="radio"]');
      if (!input) return;
      if (input.dataset.was === "1") {
        input.checked = false;
        input.dataset.was = "0";
      } else {
        container.querySelectorAll('input[type="radio"]').forEach((r) => { r.dataset.was = "0"; });
        input.dataset.was = "1";
      }
      updatePreview();
    });
  }

  function reset() {
    form.reset();
    form.querySelectorAll('input[type="radio"]').forEach((r) => { r.dataset.was = "0"; });
    form.classList.remove("is-done");
    done.hidden = true;
    show(1, false);
  }

  function submit(e) {
    e.preventDefault();
    if (current !== TOTAL) { goNext(); return; }   // Enter key on an earlier step
    if (!validate(TOTAL)) return;

    const url = whatsappUrl();
    DC.analytics.track("quizSent");
    const win = window.open(url, "_blank");
    if (win) win.opener = null;                    // if blocked, the button below still works

    doneLink.href = url;
    form.classList.add("is-done");
    done.hidden = false;
    done.querySelector("h3").tabIndex = -1;
    done.querySelector("h3").focus({ preventScroll: true });
  }

  function init() {
    toggleableRadios(document.getElementById("budget-seg"));
    toggleableRadios(document.getElementById("timeline-seg"));
    nextBtn.addEventListener("click", goNext);
    backBtn.addEventListener("click", goBack);
    document.getElementById("quote-restart").addEventListener("click", reset);
    form.addEventListener("submit", submit);
    form.addEventListener("input", updatePreview);
    form.addEventListener("change", updatePreview);
    document.addEventListener("dc:langchange", () => { clearError(); updatePreview(); });
    show(1, false);
  }

  DC.questionnaire = { init };
})();
