/* ==========================================================================
   POST /api/track – records one anonymous visitor event.
   The visitor's country comes from Netlify's edge (context.geo); the IP
   address is never stored and no cookies are used.
   ========================================================================== */
import { getStore } from "@netlify/blobs";

const TYPES = new Set(["visit", "time", "whatsapp", "quiz", "quizSent"]);
const clean = (value, max) => String(value || "").slice(0, max);

export default async (req, context) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  /* only accept calls coming from this site's own pages */
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) return new Response("Forbidden", { status: 403 });

  let data;
  try { data = await req.json(); } catch (e) { return new Response("Bad request", { status: 400 }); }
  if (!data || !TYPES.has(data.type)) return new Response("Bad request", { status: 400 });

  const store = getStore("analytics");
  const now = Date.now();

  /* time on site: one record per browsing session, overwritten as it grows */
  if (data.type === "time") {
    const sid = clean(data.sid, 24).replace(/[^a-z0-9]/gi, "");
    if (!sid) return new Response("Bad request", { status: 400 });
    const seconds = Math.min(Math.max(Number(data.seconds) || 0, 0), 6 * 3600);
    await store.setJSON("t/" + sid, { t: now, seconds });
    return new Response(null, { status: 204 });
  }

  const country = (context && context.geo && context.geo.country) || {};
  await store.setJSON("e/" + now + "-" + Math.random().toString(36).slice(2, 8), {
    t: now,
    type: data.type,
    country: country.code || "XX",
    countryName: country.name || "",
    ref: clean(data.ref, 80),
    lang: clean(data.lang, 5)
  });
  return new Response(null, { status: 204 });
};

export const config = { path: "/api/track" };
