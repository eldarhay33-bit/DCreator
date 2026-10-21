/* ==========================================================================
   DCreator – publish the portfolio straight to GitHub
   The admin panel commits js/portfolio-data.js to the repository through the
   GitHub API. Netlify then redeploys the site by itself (about a minute).
   The access token is kept in this browser only (localStorage).
   ========================================================================== */
(function () {
  const cfg = DC.config;
  const FILE = "js/portfolio-data.js";
  const API = "https://api.github.com/repos/";

  const get = () => DC.store.read(cfg.keys.github, null);
  const set = (value) => DC.store.write(cfg.keys.github, value);
  const clear = () => DC.store.remove(cfg.keys.github);

  /* UTF-8 safe base64 (the file contains Hebrew, Arabic and Chinese) */
  function toBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }

  async function request(conn, path, options) {
    options = options || {};
    const res = await fetch(API + conn.repo + path, {
      method: options.method || "GET",
      headers: Object.assign({
        Authorization: "Bearer " + conn.token,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }, options.body ? { "Content-Type": "application/json" } : {}),
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json.message || "HTTP " + res.status);
      err.status = res.status;
      throw err;
    }
    return json;
  }

  /* Checks that the token can see the repository. */
  const verify = (conn) => request(conn, "");

  async function commit(conn, content) {
    let sha;
    try {
      const current = await request(conn, "/contents/" + FILE + "?ref=" + encodeURIComponent(conn.branch));
      sha = current.sha;
    } catch (e) {
      if (e.status !== 404) throw e;      // 404 = file does not exist yet, create it
    }
    await request(conn, "/contents/" + FILE, {
      method: "PUT",
      body: { message: "Update portfolio (admin panel)", content: toBase64(content), branch: conn.branch, sha }
    });
  }

  /* Publishes are queued so two quick saves never collide on the file's sha.
     getContent() runs when the turn comes, so the newest data is always sent. */
  let queue = Promise.resolve();
  function publish(getContent) {
    const conn = get();
    if (!conn) return Promise.reject(new Error("not connected"));
    queue = queue.catch(() => {}).then(() => commit(conn, getContent()));
    return queue;
  }

  DC.github = { get, set, clear, verify, publish };
})();
