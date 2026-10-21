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
  const sendBtn = document.getElementById("quote-send");          // automatic email
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
      reach: field("reach").value.trim(),
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
      "*" + T("wa.country") + ":* " + (d.country || none),
      "*" + T("wa.budget") + ":* " + budget,
      "*" + T("wa.currency") + ":* " + (d.currency === "other" ? T("q2.currencyOther") : d.currency),
      "*" + T("wa.timeline") + ":* " + timeline,
      "*" + T("wa.name") + ":* " + (d.name || none),
      "*" + T("wa.reach") + ":* " + (d.reach || none),
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

  /* needReach: the email route has no phone number attached, so we must ask for one */
  function validate(step, needReach) {
    const d = read();
    if (step === 1 && !d.type && !d.typeOther) { showError("quote.err.type"); return false; }
    if (step === 2 && !d.country) { showError("quote.err.country"); field("country").focus(); return false; }
    if (step === TOTAL && !d.name) { showError("quote.err.name"); field("name").focus(); return false; }
    if (step === TOTAL && needReach && !d.reach) { showError("quote.err.reach"); field("reach").focus(); return false; }
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

  function showDone(titleKey, textKey) {
    const title = done.querySelector("h3");
    title.dataset.i18n = titleKey;
    done.querySelector("p").dataset.i18n = textKey;
    DC.i18n.apply(done);
    doneLink.href = whatsappUrl();
    form.classList.add("is-done");
    done.hidden = false;
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
  }

  /* "Send" – delivered to the owner's inbox automatically, no app needed */
  async function submit(e) {
    e.preventDefault();
    if (current !== TOTAL) { goNext(); return; }   // Enter key on an earlier step
    if (!validate(TOTAL, true)) return;

    const d = read();
    const label = sendBtn.querySelector("span");
    sendBtn.disabled = true;
    label.textContent = t("contact.sending");
    try {
      await DC.mail.send({
        name: d.name,
        reach: d.reach,
        message: buildMessage().replace(/\*/g, ""),
        language: cfg.languages[DC.i18n.lang].name
      });
      DC.analytics.track("quizSent");
      showDone("quote.doneMail.title", "quote.doneMail.text");
    } catch (err) {
      showError("quote.err.send");
    } finally {
      sendBtn.disabled = false;
      label.textContent = t("btn.sendMail");
    }
  }

  /* "Send via WhatsApp" – opens a chat with the message already written */
  function sendWhatsapp() {
    if (!validate(TOTAL, false)) return;
    DC.analytics.track("quizSent");
    const win = window.open(whatsappUrl(), "_blank");
    if (win) win.opener = null;                    // if blocked, the button on the next screen still works
    showDone("quote.done.title", "quote.done.text");
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
