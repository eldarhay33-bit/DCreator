/* GET /api/stats – owner only: numbers from all visitors (header x-admin-code) */
import { store, json, isAdmin } from "../lib/common.mjs";

export default async (req) => {
  if (req.method !== "GET") return json({ error: "method not allowed" }, 405);
  if (!isAdmin(req)) return json({ error: "unauthorized" }, 401);

  const d = (await store().get("stats", { type: "json" })) || {};
  const visits = d.visits || 0;
  const since = d.since || Date.now();
  const seconds = (d.seconds || 0) + Object.values(d.sessions || {}).reduce((a, b) => a + b, 0);
  const byCount = (a, b) => b.count - a.count;

  return json({
    since,
    visits,
    avgSeconds: visits ? Math.round(seconds / visits) : 0,
    avgPerDay: visits ? Math.round((visits / Math.max(1, Math.ceil((Date.now() - since) / 86400000))) * 10) / 10 : 0,
    countries: Object.entries(d.countries || {}).map(([code, c]) => ({ code, name: c.name, count: c.count })).sort(byCount),
    whatsapp: d.whatsapp || 0,
    quizClicks: d.quizClicks || 0,
    quizSent: d.quizSent || 0,
    referrers: Object.entries(d.referrers || {}).map(([name, count]) => ({ name, count })).sort(byCount)
  });
};

export const config = { path: "/api/stats" };
