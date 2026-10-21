/* ==========================================================================
   DCreator – site configuration
   Everything you are likely to want to change lives in this file.
   ========================================================================== */
window.DC = window.DC || {};

DC.config = {
  brand: "DCreator",

  /* ---- Contact ---------------------------------------------------------- */
  phoneDisplay: "055-9112028",
  whatsappNumber: "972559112028",        // international format, digits only
  whatsappUrl: "https://wa.me/972559112028",

  /* Language of the pre-filled WhatsApp message that reaches YOU.
     "he"  = always Hebrew (recommended – you read it)
     "ui"  = the language the visitor chose on the site */
  whatsappMessageLang: "he",

  /* ---- Logo ------------------------------------------------------------- */
  /* Put your own logo file in the assets folder and point to it here.
       logoMode "svg"   – built-in neon circle logo (default)
       logoMode "image" – your image (falls back to the SVG if it can't load)
       logoMode "both"  – your image next to the SVG circle                     */
  logoImage: "assets/logo.jpg",
  logoMode: "svg",

  /* ---- Languages -------------------------------------------------------- */
  defaultLang: "en",
  languages: {
    en: { name: "English",  dir: "ltr", mm: "en" },
    he: { name: "עברית",    dir: "rtl", mm: "he" },
    ar: { name: "العربية",  dir: "rtl", mm: "ar" },
    es: { name: "Español",  dir: "ltr", mm: "es" },
    zh: { name: "中文",      dir: "ltr", mm: "zh-CN" }
  },

  /* Automatic translation of portfolio titles/descriptions.
     Uses the free MyMemory API (no key, daily quota). */
  translation: {
    enabled: true,
    endpoint: "https://api.mymemory.translated.net/get",
    maxBytesPerRequest: 450
  },

  /* ---- Admin ------------------------------------------------------------ */
  /* SHA-256 of "dcreator:" + access code. The code itself is not stored here.
     NOTE: this is a client-side check – it hides the admin UI, it is not
     server-grade security. */
  adminHash: "33af3e4df65c1be7d65434857aecc0beeaa1a48d92b4ce586e0a5f2c848fbf26",
  adminSalt: "dcreator:",
  adminMaxAttempts: 3,
  adminLockSeconds: 30,

  /* ---- Storage keys (localStorage) -------------------------------------- */
  keys: {
    prefs: "dc_prefs",
    portfolio: "dc_portfolio",
    analytics: "dc_analytics",
    adminSession: "dc_admin",
    visitSession: "dc_visit"
  }
};

/* Tiny safe wrapper – storage can throw (private mode, blocked cookies, quota). */
DC.store = {
  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  },
  remove(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } },
  session: {
    read(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } },
    write(key, value) { try { sessionStorage.setItem(key, value); } catch (e) { /* ignore */ } },
    remove(key) { try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ } }
  }
};

/* Preferences (theme / language / effects) live in one object. */
DC.prefs = {
  get() { return DC.store.read(DC.config.keys.prefs, {}) || {}; },
  set(patch) {
    const next = Object.assign(DC.prefs.get(), patch);
    DC.store.write(DC.config.keys.prefs, next);
    return next;
  }
};
