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
  const sendBtn = document.getElementById("quote-send");          // opens the email app
  const sendWaBtn = document.getElementById("quote-send-wa");     // opens WhatsApp
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
      country: field("country").value.trim(),
      currency: field("currency").value,
      timeline: field("timeline").value.trim(),
      timelineMode: checked("timelineMode"),
      name: field("name").value.trim(),
      notes: field("notes").value.trim()
    };
  }

  /* ---------------------------------------------------------- message */
  function buildMessage(forceLang) {
    const lang = forceLang || (cfg.whatsappMessageLang === "ui" ? DC.i18n.lang : "he");
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
      "*" + T("wa.country") + ":* " + (d.country || none),
      "*" + T("wa.budget") + ":* " + budget,
      "*" + T("wa.currency") + ":* " + (d.currency === "other" ? T("q2.currencyOther") : d.currency),
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
    if (step === 2 && !d.country) { showError("quote.err.country"); field("country").focus(); return false; }
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
    sendWaBtn.hidden = n !== TOTAL;
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

  /* Called from the service cards: jumps to step 1 with the service chosen.
     A service that has no matching option is written into the free-text box. */
  function prefill(opts) {
    if (form.classList.contains("is-done")) reset();
    form.querySelectorAll('input[name="type"]').forEach((r) => { r.checked = false; });
    field("typeOther").value = "";
    const radio = opts.type && form.querySelector('input[name="type"][value="' + opts.type + '"]');
    if (radio) radio.checked = true;
    else if (opts.textKey) field("typeOther").value = t(opts.textKey);
    show(1, false);
    document.getElementById("quote").scrollIntoView();
  }

  const doneMail = document.getElementById("quote-done-mail");

  /* kind: "wa" or "mail" – shows the matching message and fallback button */
  function showDone(kind) {
    const title = done.querySelector("h3");
    title.dataset.i18n = kind === "mail" ? "quote.doneMail.title" : "quote.done.title";
    done.querySelector("p").dataset.i18n = kind === "mail" ? "quote.doneMail.text" : "quote.done.text";
    DC.i18n.apply(done);
    doneLink.hidden = kind === "mail";
    doneMail.hidden = kind !== "mail";
    doneLink.href = whatsappUrl();
    doneMail.href = mailUrl();
    form.classList.add("is-done");
    done.hidden = false;
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
  }

  /* mailto links are limited to about 2000 characters on Windows, and Hebrew
     is long once encoded – so fall back to English labels, then to a trimmed text */
  function mailUrl() {
    const body = (lang) => buildMessage(lang).replace(/\*/g, "");
    let url = DC.mail.mailtoUrl(cfg.mailSubject, body());
    if (url.length > DC.mail.MAX_URL) url = DC.mail.mailtoUrl(cfg.mailSubject, body("en"));
    return url.length > DC.mail.MAX_URL ? DC.mail.mailtoFit(cfg.mailSubject, body("en")) : url;
  }

  /* "Send via email" – opens the visitor's email app with the message written */
  function submit(e) {
    e.preventDefault();
    if (current !== TOTAL) { goNext(); return; }   // Enter key on an earlier step
    if (!validate(TOTAL)) return;
    DC.analytics.track("quizSent");
    showDone("mail");
    window.location.href = mailUrl();
  }

  /* "Send via WhatsApp" – opens a chat with the message already written */
  function sendWhatsapp() {
    if (!validate(TOTAL)) return;
    DC.analytics.track("quizSent");
    showDone("wa");
    const win = window.open(whatsappUrl(), "_blank");
    if (win) win.opener = null;                    // if blocked, the button on this screen still works
  }
  function init() {
    toggleableRadios(document.getElementById("budget-seg"));
    toggleableRadios(document.getElementById("timeline-seg"));
    nextBtn.addEventListener("click", goNext);
    backBtn.addEventListener("click", goBack);
    document.getElementById("quote-restart").addEventListener("click", reset);
    form.addEventListener("submit", submit);
    sendWaBtn.addEventListener("click", sendWhatsapp);
    form.addEventListener("input", updatePreview);
    form.addEventListener("change", updatePreview);
    document.addEventListener("dc:langchange", () => { clearError(); updatePreview(); });
    show(1, false);
  }

  DC.questionnaire = { init, prefill };
})();
