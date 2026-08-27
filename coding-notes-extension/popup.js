function formatTime(total) { const hours = Math.floor(total / 3600), minutes = Math.floor((total % 3600) / 60); return hours ? `${hours}h ${minutes}m` : `${minutes}m`; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
function submissionCount(item) { return Number.isInteger(item.submissionCountOverride) ? item.submissionCountOverride : (item.submissions?.length || 0); }
async function init() {
  const storageKey = await globalThis.AtelierSync.storageKey();
  const stored = await chrome.storage.local.get(storageKey);
  const connected = await globalThis.AtelierSync.connected();
  document.getElementById("connection-status").textContent = connected ? "Connected to Atelier" : "Not connected";
  document.getElementById("connect-atelier").textContent = connected ? "Disconnect" : "Connect account";
  document.getElementById("connect-atelier").addEventListener("click", async (event) => {
    const button = event.currentTarget; button.disabled = true;
    try {
      if (await globalThis.AtelierSync.connected()) { await globalThis.AtelierSync.disconnect(); document.getElementById("connection-status").textContent = "Not connected"; button.textContent = "Connect account"; }
      else { document.getElementById("connection-status").textContent = "Finish in Atelier…"; await globalThis.AtelierSync.pair(); document.getElementById("connection-status").textContent = "Connected to Atelier"; button.textContent = "Disconnect"; }
    } catch (error) { document.getElementById("connection-status").textContent = error.message || "Connection failed"; }
    button.disabled = false;
  });
  try { stored[storageKey] = await globalThis.AtelierSync.reconcile(stored[storageKey] || {}); await chrome.storage.local.set({ [storageKey]: stored[storageKey] }); } catch { /* Show cached notes while Atelier is offline. */ }
  const groups = window.SolveNotesGroups.group(Object.values(stored[storageKey] || {}));
  const parents = groups.map((item) => item.parent), attempts = parents.reduce((sum, item) => sum + submissionCount(item), 0), holes = groups.filter(({ parent, children }) => [parent, ...children].some((item) => item.holeInOne)).length;
  document.getElementById("summary").innerHTML = `<div class="metric"><b>${groups.length}</b><span>Problems</span></div><div class="metric"><b>${attempts}</b><span>Primary submissions</span></div><div class="metric"><b>${holes}</b><span>Hole in ones</span></div>`;
  document.getElementById("empty").hidden = groups.length > 0;
  document.getElementById("problems").innerHTML = groups.slice(0, 12).map(({ parent, children }) => { const count = submissionCount(parent); return `<article class="problem"><a href="${escapeHtml(parent.url)}" target="_blank">${escapeHtml(parent.title)}</a><time>${formatTime(parent.seconds)}</time><p>${count} submission${count === 1 ? "" : "s"}${children.length ? ` · +${children.length} linked` : ""}</p>${parent.holeInOne ? '<p class="hole">★ Hole in one</p>' : "<span></span>"}</article>`; }).join("");
  document.getElementById("all-notes").addEventListener("click", () => chrome.tabs.create({ url: globalThis.AtelierSync.codingUrl }));
}
init();
