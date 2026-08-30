const ATELIER_API = "https://atelier-olive-omega.vercel.app/api/coding/problems";
const ATELIER_CODING_URL = "https://atelier-olive-omega.vercel.app/coding";

globalThis.AtelierSync = {
  codingUrl: ATELIER_CODING_URL,
  async token() { return (await chrome.storage.local.get("atelier.authToken"))["atelier.authToken"] || null; },
  async storageKey() { const accountId = (await chrome.storage.local.get("atelier.accountId"))["atelier.accountId"]; return accountId ? `solvenotes.problems.${accountId}` : "solvenotes.problems.unpaired"; },
  async connected() { return Boolean(await this.token()); },
  async authenticatedFetch(url, options = {}) {
    const response = await fetch(url, options);
    if (response.status === 401) {
      await chrome.storage.local.remove(["atelier.authToken", "atelier.accountId", "atelier.profile"]);
      throw new Error("Your Atelier connection expired. Reconnect to continue syncing.");
    }
    return response;
  },
  async profile() {
    const token = await this.token();
    if (!token) return null;
    const response = await this.authenticatedFetch("https://atelier-olive-omega.vercel.app/api/profile", { headers: { "Authorization": `Bearer ${token}` } });
    if (!response.ok) throw new Error("Could not load your Atelier profile.");
    const profile = await response.json();
    await chrome.storage.local.set({ "atelier.profile": profile });
    return profile;
  },
  async headers() { const token = await this.token(); if (!token) throw new Error("Connect the extension to Atelier first."); return { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }; },
  async push(problems) {
    const response = await this.authenticatedFetch(ATELIER_API, { method: "POST", headers: await this.headers(), body: JSON.stringify(problems) });
    if (!response.ok) throw new Error("Atelier did not accept the coding notes.");
    return response.json();
  },
  async reconcile(localByKey) {
    const response = await this.authenticatedFetch(ATELIER_API, { headers: await this.headers() });
    if (!response.ok) throw new Error("Atelier is unavailable.");
    const notebook = await response.json(), remoteByKey = Object.fromEntries((notebook.problems || []).map((item) => [item.key, item])), merged = { ...localByKey };
    for (const key of Object.keys(notebook.deletedProblems || {})) delete merged[key];
    for (const remote of notebook.problems || []) {
      const local = merged[remote.key];
      if (!local || new Date(remote.updatedAt).getTime() > new Date(local.updatedAt).getTime()) merged[remote.key] = remote;
    }
    const localNewer = Object.values(merged).filter((problem) => !remoteByKey[problem.key] || new Date(problem.updatedAt).getTime() > new Date(remoteByKey[problem.key].updatedAt).getTime());
    if (localNewer.length) await this.push(localNewer);
    return merged;
  },
  async pair(onCode) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const code = btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    if (onCode) await onCode(code);
    else await chrome.runtime.sendMessage({ type: "open-auth" });
    for (let attempt = 0; attempt < 150; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const response = await fetch(`https://atelier-olive-omega.vercel.app/api/extension/pair?code=${encodeURIComponent(code)}`);
      if (response.status === 202) continue;
      if (!response.ok) throw new Error("Could not pair with Atelier.");
      const { token, accountId } = await response.json();
      const scopedKey = `solvenotes.problems.${accountId}`;
      const existing = await chrome.storage.local.get([scopedKey, "solvenotes.problems"]);
      if (!existing[scopedKey] && existing["solvenotes.problems"]) await chrome.storage.local.set({ [scopedKey]: existing["solvenotes.problems"] });
      await chrome.storage.local.set({ "atelier.authToken": token, "atelier.accountId": accountId });
      await this.profile();
      return true;
    }
    throw new Error("Pairing timed out.");
  },
  async disconnect() { const token = await this.token(); if (token) { try { await fetch("https://atelier-olive-omega.vercel.app/api/extension/pair", { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } }); } catch {} } await chrome.storage.local.remove(["atelier.authToken", "atelier.accountId", "atelier.profile"]); },
};
