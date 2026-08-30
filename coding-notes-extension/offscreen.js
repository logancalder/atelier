const frame = document.createElement("iframe");
frame.src = "https://atelier-olive-omega.vercel.app/extension-auth-frame";
frame.hidden = true;
document.body.appendChild(frame);
const frameReady = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("Atelier cloud is not reachable.")), 5000);
  frame.addEventListener("load", () => { clearTimeout(timeout); resolve(); }, { once: true });
  frame.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("Atelier's sign-in bridge could not load.")); }, { once: true });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen" || message?.type !== "firebase-auth") return false;
  const timer = setTimeout(() => { cleanup(); sendResponse({ error: "Sign-in timed out." }); }, 120000);
  function cleanup() { clearTimeout(timer); globalThis.removeEventListener("message", receive); }
  function receive(event) {
    if (event.origin !== "https://atelier-olive-omega.vercel.app" || event.data?.type !== "atelier-extension-auth-result") return;
    cleanup(); sendResponse(event.data);
  }
  globalThis.addEventListener("message", receive);
  frameReady
    .then(() => frame.contentWindow.postMessage({ type: "atelier-extension-auth", ...message.payload }, "https://atelier-olive-omega.vercel.app"))
    .catch((error) => { cleanup(); sendResponse({ error: error.message }); });
  return true;
});
