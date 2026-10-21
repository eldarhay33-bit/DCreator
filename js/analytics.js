/* ==========================================================================
   DCreator – analytics (stored in this browser's localStorage)
   Tracks: visits, referrer, active time on site, WhatsApp clicks,
   questionnaire clicks and questionnaires sent.
   Any element with data-track="whatsapp" | "quiz" is counted on click.
   ========================================================================== */
(function () {
  const cfg = DC.config;
  const KEY = cfg.keys.analytics;
  const SESSION_KEY = cfg.keys.visitSession;
  const FLUSH_EVERY = 5; // seconds

  const blank = () => ({
    since: Date.now(),
    visits: 0,
    seconds: 0,
    referrers: {},
    whatsapp: 0,
    quizClicks: 0,
    quizSent: 0
  });

  let data = Object.assign(blank(), DC.store.read(KEY, {}));
  let pending = 0;

  const save = () => DC.store.write(KEY, data);

  function referrerName() {
    try {
      const params = new URLSearchParams(location.search);
      const tagged = params.get("utm_source") || params.get("ref");
      if (tagged) return tagged.slice(0, 60);
      if (document.referrer) {
        const host = new URL(document.referrer).hostname.replace(/^www\./, "");
        if (host && host !== location.hostname.replace(/^www\./, "")) return host;
      }
    } catch (e) { /* malformed referrer */ }
    return "";
  }

  function trackVisit() {
    if (DC.store.session.read(SESSION_KEY)) return; // one visit per browser session
    DC.store.session.write(SESSION_KEY, "1");
    data.visits += 1;
    const ref = referrerName() || "__direct__";
    data.referrers[ref] = (data.referrers[ref] || 0) + 1;
    save();
  }

  /* Active time: counts only while the tab is visible. */
  function startTimer() {
    setInterval(() => {
      if (document.hidden) return;
      data.seconds += 1;
      pending += 1;
      if (pending >= FLUSH_EVERY) { pending = 0; save(); }
    }, 1000);
    const flush = () => { if (pending) { pending = 0; save(); } };
    document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
    window.addEventListener("pagehide", flush);
  }

  function track(event) {
    if (event === "whatsapp") data.whatsapp += 1;
    else if (event === "quiz") data.quizClicks += 1;
    else if (event === "quizSent") data.quizSent += 1;
    else return;
    save();
  }

  function report() {
    return {
      since: data.since,
      visits: data.visits,
      avgSeconds: data.visits ? Math.round(data.seconds / data.visits) : 0,
      whatsapp: data.whatsapp,
      quizClicks: data.quizClicks,
      quizSent: data.quizSent,
      referrers: Object.entries(data.referrers)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    };
  }

  function reset() {
    data = blank();
    pending = 0;
    save();
  }

  function init() {
    trackVisit();
    startTimer();
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-track]");
      if (el) track(el.dataset.track);
    });
  }

  DC.analytics = { init, track, report, reset };
})();
