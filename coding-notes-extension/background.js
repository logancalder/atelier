chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "open-notes") {
    chrome.tabs.create({ url: "http://localhost:3000/coding" });
  }
  if (message?.type === "open-auth") {
    chrome.windows.create({ url: chrome.runtime.getURL("auth.html"), type: "popup", width: 480, height: 720 });
  }
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
    const response = await fetch("http://localhost:3000/api/extension/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: result.idToken }) });
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
