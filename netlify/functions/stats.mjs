/* ==========================================================================
   GET /api/stats – aggregated visitor statistics for the admin panel.
   Requires the owner's access code in the "x-admin-code" header. The code is
   checked against the same salted SHA-256 hash as js/config.js
   (change both together if you ever change the code).
   ========================================================================== */
import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";

const SALT = "dcreator:";
const HASH = "33af3e4df65c1be7d65434857aecc0beeaa1a48d92b4ce586e0a5f2c848fbf26";
const MAX_RECORDS = 20000;

async function readAll(store, prefix) {
  const { blobs } = await store.list({ prefix });
  const keys = blobs.map((b) => b.key).sort().slice(-MAX_RECORDS);
  const records = [];
  for (let i = 0; i < keys.length; i += 50) {
    const batch = await Promise.all(keys.slice(i, i + 50).map((key) => store.get(key, { type: "json" })));
    batch.forEach((record) => { if (record) records.push(record); });
  }
  return records;
}

const sorted = (list) => list.sort((a, b) => b.count - a.count);

export default async (req) => {
  const code = req.headers.get("x-admin-code") || "";
  if (createHash("sha256").update(SALT + code).digest("hex") !== HASH) {
    return new Response("Unauthorized", { status: 401 });
  }

  const store = getStore("analytics");
  const [events, times] = await Promise.all([readAll(store, "e/"), readAll(store, "t/")]);

  const totals = { whatsapp: 0, quiz: 0, quizSent: 0 };
  const countries = {};
  const referrers = {};
  const days = new Set();
  let visits = 0;
  let first = Infinity;

  for (const e of events) {
    first = Math.min(first, e.t);
    if (e.type === "visit") {
      visits += 1;
      const code2 = e.country || "XX";
      countries[code2] = countries[code2] || { code: code2, name: e.countryName || "", count: 0 };
      countries[code2].count += 1;
      const ref = e.ref || "__direct__";
      referrers[ref] = (referrers[ref] || 0) + 1;
      days.add(new Date(e.t).toISOString().slice(0, 10));
    } else if (e.type in totals) {
      totals[e.type] += 1;
    }
  }

  const spanDays = visits ? Math.max(1, Math.ceil((Date.now() - first) / 86400000)) : 0;
  const avgSeconds = times.length ? Math.round(times.reduce((sum, t) => sum + t.seconds, 0) / times.length) : 0;

  return new Response(JSON.stringify({
    since: Number.isFinite(first) ? first : null,
    visits,
    avgPerDay: spanDays ? Math.round((visits / spanDays) * 10) / 10 : 0,
    activeDays: days.size,
    avgSeconds,
    whatsapp: totals.whatsapp,
    quizClicks: totals.quiz,
    quizSent: totals.quizSent,
    countries: sorted(Object.values(countries)),
    referrers: sorted(Object.entries(referrers).map(([name, count]) => ({ name, count })))
  }), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
};

export const config = { path: "/api/stats" };
