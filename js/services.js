/* ==========================================================================
   DCreator – expandable service cards
   Click a card to open it. It then offers "Go to the questionnaire" (type
   pre-selected, or written into the free-text box when the questionnaire has
   no matching option) and "View portfolio" (opened on the matching category).
   ========================================================================== */
(function () {
  const cards = Array.from(document.querySelectorAll(".service"));
  if (!cards.length) return;

  function setOpen(card, open) {
    card.classList.toggle("is-open", open);
    card.querySelector(".service-toggle").setAttribute("aria-expanded", String(open));
  }

  cards.forEach((card) => {
    /* one card open at a time; clicks on the action buttons are not toggles */
    card.addEventListener("click", (e) => {
      if (e.target.closest(".service-actions")) return;
      const open = !card.classList.contains("is-open");
      cards.forEach((c) => setOpen(c, false));
      setOpen(card, open);
    });

    const quote = card.querySelector('[data-act="quote"]');
    if (quote) {
      quote.addEventListener("click", (e) => {
        e.preventDefault();
        DC.questionnaire.prefill({ type: card.dataset.q, textKey: card.dataset.qText });
      });
    }

    const portfolio = card.querySelector('[data-act="portfolio"]');
    if (portfolio) {
      portfolio.addEventListener("click", (e) => {
        e.preventDefault();
        DC.portfolio.show(card.dataset.pf);
      });
    }
  });
})();
