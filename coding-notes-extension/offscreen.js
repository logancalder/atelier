const frame = document.createElement("iframe");
frame.src = "http://localhost:3000/extension-auth-frame";
frame.hidden = true;
document.body.appendChild(frame);
const frameReady = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("Atelier is not reachable at localhost:3000.")), 5000);
  frame.addEventListener("load", () => { clearTimeout(timeout); resolve(); }, { once: true });
  frame.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("Atelier's sign-in bridge could not load.")); }, { once: true });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen" || message?.type !== "firebase-auth") return false;
  const timer = setTimeout(() => { cleanup(); sendResponse({ error: "Sign-in timed out." }); }, 120000);
  function cleanup() { clearTimeout(timer); globalThis.removeEventListener("message", receive); }
  function receive(event) {
    if (event.origin !== "http://localhost:3000" || event.data?.type !== "atelier-extension-auth-result") return;
    cleanup(); sendResponse(event.data);
  }
  globalThis.addEventListener("message", receive);
  frameReady
    .then(() => frame.contentWindow.postMessage({ type: "atelier-extension-auth", ...message.payload }, "http://localhost:3000"))
    .catch((error) => { cleanup(); sendResponse({ error: error.message }); });
  return true;
});
