/* ==========================================================================
   DCreator – contact form
   Both buttons open the visitor's own WhatsApp / email app with the message
   already written, addressed to you. Nothing is sent from the server.
   ========================================================================== */
(function () {
  const cfg = DC.config;
  const t = (key) => DC.i18n.t(key);

  const whatsappUrl = (text) => cfg.whatsappUrl + "?text=" + encodeURIComponent(text);
  const mailtoUrl = (subject, body) =>
    "mailto:" + cfg.contactEmail + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

  /* Windows mail links break above ~2000 characters, so long texts are trimmed to fit. */
  const MAX_URL = 1900;
  function mailtoFit(subject, body) {
    let url = mailtoUrl(subject, body);
    while (url.length > MAX_URL && body.length > 40) {
      body = body.slice(0, Math.floor(body.length * 0.9)).trimEnd();
      url = mailtoUrl(subject, body + "…");
    }
    return url;
  }

  function initForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;
    const field = (name) => form.querySelector('[name="' + name + '"]');
    const errorBox = document.getElementById("contact-error");

    /* returns the message text, or null (and shows an error) when it is empty */
    function compose() {
      errorBox.hidden = true;
      const message = field("message").value.trim();
      if (!message) {
        errorBox.textContent = t("contact.err");
        errorBox.hidden = false;
        field("message").focus();
        return null;
      }
      const name = field("name").value.trim();
      return (name ? name + "\n\n" : "") + message;
    }

    document.getElementById("contact-wa").addEventListener("click", () => {
      const text = compose();
      if (text === null) return;
      DC.analytics.track("whatsapp");
      const win = window.open(whatsappUrl(text), "_blank");
      if (win) win.opener = null;
    });

    document.getElementById("contact-mail").addEventListener("click", () => {
      const text = compose();
      if (text === null) return;
      window.location.href = mailtoFit(cfg.mailSubject, text);
    });
  }

  DC.mail = { whatsappUrl, mailtoUrl, mailtoFit, MAX_URL, initForm };
})();
