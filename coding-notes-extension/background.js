chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "open-notes") {
    chrome.tabs.create({ url: "https://atelier-olive-omega.vercel.app/coding" });
  }
  if (message?.type === "open-auth") {
    chrome.windows.create({ url: chrome.runtime.getURL("auth.html"), type: "popup", width: 480, height: 720 });
  }
  if (message?.type === "open-profile") {
    chrome.tabs.create({ url: "https://atelier-olive-omega.vercel.app/profile" });
  }
  if (message?.type === "leetcode-metadata") {
    const slug = typeof message.slug === "string" && /^[a-z0-9-]+$/i.test(message.slug) ? message.slug : "";
    const neetcodeSlug = typeof message.neetcodeSlug === "string" && /^[a-z0-9-]+$/i.test(message.neetcodeSlug) ? message.neetcodeSlug : "";
    if (!slug && !neetcodeSlug) { sendResponse({ error: "No problem slug was available." }); return false; }
    (async () => {
      if (slug) {
        try {
          const query = "query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { questionFrontendId title } }";
          const response = await fetch("https://leetcode.com/graphql/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, variables: { titleSlug: slug } }) });
          if (response.ok) {
            const question = (await response.json())?.data?.question;
            if (question?.questionFrontendId) return { ...question, titleSlug: slug };
          }
        } catch { /* Fall through to NeetCode's solution-page mapping. */ }
      }
      if (neetcodeSlug) {
        const response = await fetch(`https://neetcode.io/solutions/${encodeURIComponent(neetcodeSlug)}`);
        if (!response.ok) throw new Error(`NeetCode returned ${response.status}.`);
        const html = await response.text();
        const questionFrontendId = html.match(/LeetCode\s+(\d{1,5})/i)?.[1];
        const titleSlug = html.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i)?.[1] || slug || null;
        if (questionFrontendId) return { questionFrontendId, titleSlug };
      }
      throw new Error("The matching LeetCode number was unavailable.");
    })()
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message || "Could not load problem metadata." }));
    return true;
  }
  if (message?.type === "open-provider-auth") {
    const provider = message.provider === "github" ? "github" : "google";
    const code = typeof message.code === "string" ? message.code : "";
    if (code.length < 32) { sendResponse({ error: "Invalid pairing code." }); return false; }
    const url = `https://atelier-olive-omega.vercel.app/extension-connect?code=${encodeURIComponent(code)}&provider=${encodeURIComponent(provider)}`;
    chrome.windows.create({ url, type: "popup", width: 520, height: 760 })
      .then((created) => sendResponse({ windowId: created.id }))
      .catch((error) => sendResponse({ error: error.message || "Could not open Atelier sign-in." }));
    return true;
  }
  if (message?.type === "close-provider-auth" && Number.isInteger(message.windowId)) {
    chrome.windows.remove(message.windowId).catch(() => {});
  }
  return false;
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id || !/^https:\/\/(www\.)?neetcode\.io\/problems\//.test(tab.url || "")) return;
  chrome.tabs.sendMessage(tab.id, { type: "toggle-drawer" }).catch(() => {});
});

let creatingOffscreen;
async function ensureOffscreen() {
  const url = chrome.runtime.getURL("offscreen.html");
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"], documentUrls: [url] });
  if (contexts.length) return;
  if (!creatingOffscreen) creatingOffscreen = chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["DOM_SCRAPING"], justification: "Authenticate the user with Firebase inside the extension." }).finally(() => { creatingOffscreen = null; });
  await creatingOffscreen;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "extension-auth") return false;
  (async () => {
    await ensureOffscreen();
    const result = await chrome.runtime.sendMessage({ type: "firebase-auth", target: "offscreen", payload: message.payload });
    if (result?.error) throw new Error(result.error);
    const response = await fetch("https://atelier-olive-omega.vercel.app/api/extension/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: result.idToken }) });
    const session = await response.json();
    if (!response.ok) throw new Error(session.error || "Atelier could not create the extension session.");
    const scopedKey = `solvenotes.problems.${session.accountId}`;
    const existing = await chrome.storage.local.get([scopedKey, "solvenotes.problems"]);
    if (!existing[scopedKey] && existing["solvenotes.problems"]) await chrome.storage.local.set({ [scopedKey]: existing["solvenotes.problems"] });
    await chrome.storage.local.set({ "atelier.authToken": session.token, "atelier.accountId": session.accountId, "atelier.profile": session.profile });
    return session.profile;
  })().then((profile) => sendResponse({ profile })).catch((error) => sendResponse({ error: error.message || "Sign-in failed." }));
  return true;
});
