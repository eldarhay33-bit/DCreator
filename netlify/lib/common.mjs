/* Shared helpers for the DCreator Netlify Functions. */
import { createHash, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

/* Same value as adminHash / adminSalt in site/js/config.js.
   Set ADMIN_HASH in the Netlify environment to override it. */
const SALT = "dcreator:";
const DEFAULT_HASH = "33af3e4df65c1be7d65434857aecc0beeaa1a48d92b4ce586e0a5f2c848fbf26";

export const store = () => getStore("dcreator");

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });

export function isAdmin(req) {
  const code = req.headers.get("x-admin-code") || "";
  if (!code || code.length > 200) return false;
  const given = createHash("sha256").update(SALT + code).digest();
  const expected = Buffer.from(process.env.ADMIN_HASH || DEFAULT_HASH, "hex");
  return expected.length === given.length && timingSafeEqual(given, expected);
}
