/* GET  /api/portfolio  – the list every visitor sees
   POST /api/portfolio  – owner only: replaces the list (header x-admin-code) */
import { store, json, isAdmin } from "../lib/common.mjs";

const MAX_BYTES = 5 * 1024 * 1024;     // Netlify Functions accept ~6 MB per request

export default async (req) => {
  if (req.method === "GET") {
    const items = await store().get("portfolio", { type: "json" });
    return json({ items: Array.isArray(items) ? items : null });
  }

  if (req.method === "POST") {
    if (!isAdmin(req)) return json({ error: "unauthorized" }, 401);
    const text = await req.text();
    if (text.length > MAX_BYTES) return json({ error: "too large" }, 413);
    let body;
    try { body = JSON.parse(text); } catch (e) { return json({ error: "bad json" }, 400); }
    if (!body || !Array.isArray(body.items)) return json({ error: "items required" }, 400);
    await store().setJSON("portfolio", body.items);
    return json({ ok: true, count: body.items.length });
  }

  return json({ error: "method not allowed" }, 405);
};

export const config = { path: "/api/portfolio" };
