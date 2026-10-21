/* ==========================================================================
   DCreator – automatic email (contact form + questionnaire "Send")
   ========================================================================== */
(function () {
  const cfg = DC.config;
  const t = (key) => DC.i18n.t(key);

  /* Posts the fields to the form relay. Rejects if it could not be delivered. */
  async function send(fields) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(cfg.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(Object.assign({ _subject: cfg.formSubject, _template: "table", _captcha: "false" }, fields)),
        signal: ctrl.signal
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !(json.success === true || json.success === "true")) throw new Error(json.message || "send failed");
    } finally { clearTimeout(timer); }
  }

  function initForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;
    const field = (name) => form.querySelector('[name="' + name + '"]');
    const button = document.getElementById("contact-send");
    const label = button.querySelector("span");
    const errorBox = document.getElementById("contact-error");
    const status = document.getElementById("contact-status");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      status.hidden = true;

      const name = field("name").value.trim();
      const reach = field("reach").value.trim();
      const message = field("message").value.trim();

      if (field("_honey").value) { form.reset(); return; }   // bot filled the hidden field
      if (!message || !reach) {
        errorBox.textContent = t("contact.err");
        errorBox.hidden = false;
        return;
      }

      button.disabled = true;
      label.textContent = t("contact.sending");
      try {
        await send({
          name: name || "-",
          reach,
          message,
          language: cfg.languages[DC.i18n.lang].name
        });
        form.reset();
        status.textContent = t("contact.sent");
        status.hidden = false;
      } catch (err) {
        errorBox.textContent = t("quote.err.send");
        errorBox.hidden = false;
      } finally {
        button.disabled = false;
        label.textContent = t("contact.send");
      }
    });
  }

  DC.mail = { send, initForm };
})();
