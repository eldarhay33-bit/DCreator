/* ==========================================================================
   /api/portfolio – the portfolio list shown to every visitor.
   GET   public: returns { items: [...] | null }
   POST  owner only (x-admin-code header): replaces the list.
   The access code is checked against the same salted SHA-256 hash as
   js/config.js (change both together if you ever change the code).
   ========================================================================== */
import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";

const SALT = "dcreator:";
const HASH = "33af3e4df65c1be7d65434857aecc0beeaa1a48d92b4ce586e0a5f2c848fbf26";
const KEY = "portfolio";
const MAX_BYTES = 5000000;
const MAX_ITEMS = 200;
const CATEGORIES = new Set(["web", "game", "sim", "other"]);
const LANGS = ["en", "he", "ar", "es", "zh"];

const reply = (data, status) => new Response(JSON.stringify(data), {
  status: status || 200,
  headers: { "content-type": "application/json", "cache-control": "no-store" }
});

/* keep only known languages and cap the text length */
function cleanTexts(map, max) {
  const out = {};
  if (map && typeof map === "object") {
    LANGS.forEach((lang) => { if (typeof map[lang] === "string") out[lang] = map[lang].slice(0, max); });
  }
  return out;
}

/* never trust the browser: only http(s) links and plain raster images are kept */
function cleanItem(item) {
  if (!item || typeof item !== "object") return null;
  let url;
  try {
    const parsed = new URL(String(item.url));
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    url = parsed.href;
  } catch (e) { return null; }

  const image = typeof item.image === "string" &&
    (/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(item.image) || /^https?:\/\//i.test(item.image))
    ? item.image : "";

  return {
    id: String(item.id || "").slice(0, 40),
    category: CATEGORIES.has(item.category) ? item.category : "other",
    url,
    image,
    srcLang: LANGS.includes(item.srcLang) ? item.srcLang : "en",
    title: cleanTexts(item.title, 120),
    desc: cleanTexts(item.desc, 600),
    createdAt: Number(item.createdAt) || Date.now()
  };
}

export default async (req) => {
  const store = getStore("site");

  if (req.method === "GET") {
    const items = await store.get(KEY, { type: "json" });
    return reply({ items: Array.isArray(items) ? items : null });
  }

  if (req.method === "POST") {
    const code = req.headers.get("x-admin-code") || "";
    if (createHash("sha256").update(SALT + code).digest("hex") !== HASH) return reply({ error: "unauthorized" }, 401);

    const raw = await req.text();
    if (raw.length > MAX_BYTES) return reply({ error: "too large" }, 413);
    let body;
    try { body = JSON.parse(raw); } catch (e) { return reply({ error: "bad request" }, 400); }
    if (!body || !Array.isArray(body.items) || body.items.length > MAX_ITEMS) return reply({ error: "bad request" }, 400);

    const items = body.items.map(cleanItem).filter(Boolean);
    await store.setJSON(KEY, items);
    return reply({ ok: true, count: items.length });
  }

  return reply({ error: "method not allowed" }, 405);
};

export const config = { path: "/api/portfolio" };
