/* POST /api/track – anonymous visitor counting (see site/js/analytics.js) */
import { store, json } from "../lib/common.mjs";

const MAX_SESSIONS = 3000;     // per-session timers kept; older ones are folded into the total

const blank = () => ({
  since: Date.now(), visits: 0, seconds: 0, sessions: {},
  referrers: {}, countries: {}, whatsapp: 0, quizClicks: 0, quizSent: 0
});

const clean = (s, n) => String(s || "").slice(0, n).replace(/[^\w.\-@ ]/g, "");

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  let body;
  try { body = await req.json(); } catch (e) { return json({ error: "bad json" }, 400); }
  if (!body || typeof body.type !== "string") return json({ error: "type required" }, 400);

  const db = store();
  const data = Object.assign(blank(), await db.get("stats", { type: "json" }));

  switch (body.type) {
    case "visit": {
      data.visits += 1;
      const ref = clean(body.ref, 60) || "__direct__";
      data.referrers[ref] = (data.referrers[ref] || 0) + 1;
      const geo = context && context.geo && context.geo.country;
      const code = (geo && geo.code) || "XX";
      const name = (geo && geo.name) || "";
      const c = data.countries[code] || { name, count: 0 };
      c.count += 1;
      data.countries[code] = c;
      break;
    }
    case "time": {
      /* the client sends the running total for its session, so keep the largest value per session */
      const sid = clean(body.sid, 40);
      const secs = Math.min(Math.max(0, Math.round(Number(body.seconds) || 0)), 86400);
      if (!sid || !secs) break;
      data.sessions[sid] = Math.max(data.sessions[sid] || 0, secs);
      const ids = Object.keys(data.sessions);
      if (ids.length > MAX_SESSIONS) {
        ids.slice(0, ids.length - MAX_SESSIONS).forEach((id) => { data.seconds += data.sessions[id]; delete data.sessions[id]; });
      }
      break;
    }
    case "whatsapp": data.whatsapp += 1; break;
    case "quiz": data.quizClicks += 1; break;
    case "quizSent": data.quizSent += 1; break;
    default: return json({ error: "unknown type" }, 400);
  }

  await db.setJSON("stats", data);
  return json({ ok: true });
};

export const config = { path: "/api/track" };
