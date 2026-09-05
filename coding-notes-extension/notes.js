let storageKey = "solvenotes.problems.unpaired";
let rawRecords = [], groups = [], currentView = "cards";
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const solved = (item) => item.submissions?.some((submission) => submission.accepted);
const sub20 = (item) => solved(item) && item.seconds > 0 && item.seconds <= 1200;
const formatTime = (total = 0) => `${Math.floor(total / 60)}m ${total % 60}s`;
const submissionCount = (item) => Number.isInteger(item.submissionCountOverride) ? item.submissionCountOverride : (item.submissions?.length || 0);
const site = (item) => window.SolveNotesGroups.site(item);
const category = (item) => item.tags?.[0] || "Uncategorized";

function latestSubmissionAt(record) { return (record.submissions || []).map((item) => item.at).filter(Boolean).sort().at(-1) || null; }

async function repairStoredMetadata() {
  let changed = false;
  for (const record of rawRecords) if (!record.sortAt) { record.sortAt = latestSubmissionAt(record) || record.updatedAt || "1970-01-01T00:00:00.000Z"; changed = true; }
  const stale = rawRecords.filter((record) => site(record) === "leetcode" && !/^\d+\.\s+/.test(record.title || ""));
  for (let start = 0; start < stale.length; start += 20) {
    const batch = stale.slice(start, start + 20), fields = batch.map((record, index) => `p${index}: question(titleSlug: \"${record.key.split(":").slice(1).join(":")}\") { questionFrontendId title difficulty topicTags { name } }`).join(" ");
    try {
      const response = await fetch("https://leetcode.com/graphql/", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `query SolveNotesTitles { ${fields} }` }) });
      if (!response.ok) continue;
      const data = (await response.json()).data || {};
      batch.forEach((record, index) => { const meta = data[`p${index}`]; if (!meta?.title) return; record.title = `${meta.questionFrontendId ? `${meta.questionFrontendId}. ` : ""}${meta.title}`; record.tags ||= meta.topicTags?.map((tag) => tag.name) || []; record.difficulty ||= meta.difficulty || null; changed = true; });
    } catch { /* Keep the stored title when LeetCode metadata is unavailable. */ }
  }
  if (changed) await chrome.storage.local.set({ [storageKey]: Object.fromEntries(rawRecords.map((item) => [item.key, item])) });
}

function showToast(message, error = false) {
  let toast = document.getElementById("notes-toast");
  if (!toast) { toast = document.createElement("div"); toast.id = "notes-toast"; document.body.appendChild(toast); }
  toast.textContent = message; toast.className = error ? "show error" : "show"; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { toast.className = ""; }, 2400);
}

function badges(item) { return `${sub20(item) ? '<span class="badge good">✓ Sub 20</span>' : ""}${item.holeInOne ? '<span class="badge good">★ Hole in one</span>' : ""}${item.neededHints ? '<span class="badge warn">Needed hints</span>' : ""}${item.dontUnderstand ? '<span class="badge danger">Don\'t understand</span>' : ""}`; }
function compactBadges(item) {
  const labels = [];
  if (sub20(item)) labels.push(["good", "✓ Sub 20"]);
  if (item.holeInOne) labels.push(["good", "★ Hole in one"]);
  if (item.neededHints) labels.push(["warn", "Needed hints"]);
  if (item.dontUnderstand) labels.push(["danger", "Don’t understand"]);
  if (!labels.length) return '<span class="row-empty">—</span>';
  return `<span class="badge ${labels[0][0]}">${labels[0][1]}</span>${labels.length > 1 ? `<span class="badge more">+${labels.length - 1}</span>` : ""}`;
}
function leetcodeOptions() { return rawRecords.filter((item) => site(item) === "leetcode").sort((a, b) => String(a.title).localeCompare(String(b.title))).map((item) => `<option value="${escapeHtml(item.key.split(":").slice(1).join(":"))}">${escapeHtml(item.title)}</option>`).join(""); }
function manualLinkMarkup(item) { return site(item) === "neetcode" && rawRecords.some((record) => site(record) === "leetcode") ? `<label class="manual-link">Make child of <select data-link-key="${escapeHtml(item.key)}"><option value="">Choose a LeetCode problem…</option>${leetcodeOptions()}</select></label>` : ""; }
function unlinkMarkup(item) { return item.titleSource === "leetcode" ? `<button class="unlink-primary" data-unlink-key="${escapeHtml(item.key)}" type="button">Unlink from LeetCode title</button>` : ""; }
function editButton(item) { return `<button class="edit-problem" data-edit-key="${escapeHtml(item.key)}" type="button" aria-label="Edit ${escapeHtml(item.title)}" title="Edit problem">✎</button>`; }

function childMarkup(item) {
  return `<article class="child-record"><div><a href="${escapeHtml(item.url)}" target="_blank">${escapeHtml(item.title)}</a><span>${site(item)} · ${formatTime(item.seconds)} · ${submissionCount(item)} submissions</span></div><div class="child-actions"><div class="badges">${badges(item)}</div>${site(item) === "neetcode" ? `<button data-unlink-key="${escapeHtml(item.key)}" type="button">Unlink</button>` : ""}</div>${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ""}</article>`;
}

function cardMarkup({ parent, children }) {
  return `<article class="card"><div class="card-head"><div><h2><a href="${escapeHtml(parent.url)}" target="_blank">${escapeHtml(parent.title)}</a></h2><div class="site">${site(parent)} data${parent.titleSource ? ` · ${parent.titleSource} title` : ""} · ${category(parent)} · ${formatTime(parent.seconds)} · ${submissionCount(parent)} submissions</div></div><div class="card-tools"><div class="badges">${badges(parent)}</div>${editButton(parent)}</div></div><div class="notes ${parent.notes ? "" : "muted"}">${parent.notes ? escapeHtml(parent.notes) : "No notes yet."}</div>${unlinkMarkup(parent)}${parent.titleSource ? "" : manualLinkMarkup(parent)}${children.length ? `<details><summary>Show linked ${children.map(site).join(", ")} data</summary><div class="children">${children.map(childMarkup).join("")}</div></details>` : ""}</article>`;
}

function listRow({ parent }) {
  return `<div class="problem-row"><div class="row-main"><a class="row-title" href="${escapeHtml(parent.url)}" target="_blank">${escapeHtml(parent.title)}</a><span>${site(parent)} · ${formatTime(parent.seconds)} · ${submissionCount(parent)} subs</span></div><div class="badges compact">${compactBadges(parent)}</div>${editButton(parent)}</div>`;
}

function filteredGroups() {
  const query = document.getElementById("search").value.trim().toLowerCase(), filter = document.getElementById("filter").value;
  return groups.filter(({ parent, children }) => {
    const searchable = [parent, ...children].map((item) => `${item.title} ${item.notes} ${(item.tags || []).join(" ")}`).join(" ").toLowerCase();
    const all = [parent, ...children];
    return searchable.includes(query) && (filter === "all" || (filter === "sub20" && all.some(sub20)) || (filter === "hints" && all.some((item) => item.neededHints)) || (filter === "understand" && all.some((item) => item.dontUnderstand)) || (filter === "hole" && all.some((item) => item.holeInOne)));
  });
}

function render() {
  const shown = filteredGroups();
  document.getElementById("empty").hidden = shown.length > 0;
  const list = document.getElementById("list");
  list.className = currentView === "list" ? "list-view" : "card-view";
  if (currentView === "cards") list.innerHTML = shown.map(cardMarkup).join("");
  else {
    const categorized = new Map();
    shown.sort((a, b) => category(a.parent).localeCompare(category(b.parent)) || String(a.parent.title).localeCompare(String(b.parent.title))).forEach((group) => categorized.set(category(group.parent), [...(categorized.get(category(group.parent)) || []), group]));
    list.innerHTML = [...categorized].map(([name, items]) => `<section class="category-group"><h3>${escapeHtml(name)} <span>${items.length}</span></h3><div>${items.map(listRow).join("")}</div></section>`).join("");
  }
}

function renderSummary() {
  const parents = groups.map((item) => item.parent), submissions = parents.reduce((sum, item) => sum + submissionCount(item), 0);
  document.getElementById("summary").innerHTML = `<div class="metric"><b>${groups.length}</b><span>Problems</span></div><div class="metric"><b>${groups.filter(({ parent, children }) => [parent, ...children].some(sub20)).length}</b><span>Sub 20</span></div><div class="metric"><b>${groups.filter(({ parent, children }) => [parent, ...children].some((item) => item.neededHints)).length}</b><span>Needed hints</span></div><div class="metric"><b>${submissions}</b><span>Submissions</span></div>`;
}

function renderActivity() {
  const day = 86400000, today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - 363 * day), counts = new Map();
  for (const { parent } of groups) for (const submission of parent.submissions || []) { const date = new Date(submission.at); if (!Number.isNaN(date.valueOf())) { const key = date.toISOString().slice(0, 10); counts.set(key, (counts.get(key) || 0) + 1); } }
  const cells = []; let total = 0;
  for (let index = 0; index < 364; index += 1) { const date = new Date(start.getTime() + index * day), key = date.toISOString().slice(0, 10), count = counts.get(key) || 0; total += count; const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4; cells.push(`<i data-level="${level}" title="${key}: ${count} submission${count === 1 ? "" : "s"}"></i>`); }
  document.getElementById("activity").innerHTML = cells.join(""); document.getElementById("activity-total").textContent = `${total} submissions in the last year`;
}

function renderRetries() {
  const ranked = groups.map(({ parent }) => {
    const reasons = []; let score = 0;
    if (!solved(parent)) { score += 6; reasons.push("Not solved"); }
    if (parent.dontUnderstand) { score += 5; reasons.push("Don’t understand"); }
    if (parent.neededHints) { score += 4; reasons.push("Needed hints"); }
    if (submissionCount(parent) > 1) { score += 2; reasons.push(`${submissionCount(parent)} attempts`); }
    if (parent.seconds > 1200) { score += 1; reasons.push("Over 20 min"); }
    return { parent, reasons, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || new Date(a.parent.sortAt || 0) - new Date(b.parent.sortAt || 0)).slice(0, 4);
  document.getElementById("retry-list").innerHTML = ranked.length ? ranked.map(({ parent, reasons }, index) => `<a class="retry-row" href="${escapeHtml(parent.url)}" target="_blank"><span class="retry-rank">${index + 1}</span><span><b>${escapeHtml(parent.title)}</b><small>${escapeHtml(reasons.slice(0, 2).join(" · "))}${reasons.length > 2 ? ` · +${reasons.length - 2}` : ""}</small></span><i>↗</i></a>`).join("") : '<p class="retry-empty">Nothing is flagged for a retry yet.</p>';
}

async function persist(message = "Saved") { const byKey = Object.fromEntries(rawRecords.map((item) => [item.key, item])); await chrome.storage.local.set({ [storageKey]: byKey }); try { await globalThis.AtelierSync.push(rawRecords); } catch { /* Keep the local notebook usable offline. */ } groups = window.SolveNotesGroups.group(rawRecords); renderSummary(); renderActivity(); renderRetries(); render(); showToast(message); }
async function setParent(key, leetcodeSlug) { const record = rawRecords.find((item) => item.key === key); if (!record || site(record) !== "neetcode") return; record.leetcodeSlug = leetcodeSlug || null; record.linkSource = leetcodeSlug ? "manual" : null; record.updatedAt = new Date().toISOString(); await persist(leetcodeSlug ? "Problems linked" : "Problem unlinked"); }

function openEditor(key) {
  const raw = rawRecords.find((item) => item.key === key); if (!raw) return;
  const display = groups.find(({ parent }) => parent.key === key)?.parent || raw;
  document.getElementById("edit-key").value = key; document.getElementById("edit-title").textContent = display.title;
  const count = document.getElementById("edit-count"); count.value = submissionCount(raw); count.dataset.automatic = Number.isInteger(raw.submissionCountOverride) ? "false" : "true";
  document.getElementById("edit-auto-count").textContent = raw.submissions?.length || 0;
  const secondsInput = document.getElementById("edit-seconds");
  secondsInput.value = raw.seconds > 0 ? (raw.seconds / 60).toFixed(2) : "";
  document.getElementById("edit-hints").checked = Boolean(raw.neededHints); document.getElementById("edit-understand").checked = Boolean(raw.dontUnderstand); document.getElementById("edit-notes").value = raw.notes || ""; document.getElementById("edit-dialog").showModal();
}

async function saveEditor() {
  const record = rawRecords.find((item) => item.key === document.getElementById("edit-key").value); if (!record) return;
  const countInput = document.getElementById("edit-count"), count = Number(countInput.value); if (!Number.isInteger(count) || count < 0) return;
  record.submissionCountOverride = countInput.dataset.automatic === "true" ? null : count;
  record.holeInOne = record.submissionCountOverride === null ? record.submissions?.length === 1 && Boolean(record.submissions[0]?.accepted) : count === 1;
  const secondsInput = document.getElementById("edit-seconds");
  if (secondsInput.value) {
    const minutes = parseFloat(secondsInput.value);
    if (!isNaN(minutes) && minutes >= 0) {
      record.seconds = Math.round(minutes * 60);
    }
  }
  record.neededHints = document.getElementById("edit-hints").checked; record.dontUnderstand = document.getElementById("edit-understand").checked; record.notes = document.getElementById("edit-notes").value; record.updatedAt = new Date().toISOString();
  await persist("Changes saved"); document.getElementById("edit-dialog").close();
}

async function init() {
  storageKey = await globalThis.AtelierSync.storageKey(); let local = (await chrome.storage.local.get(storageKey))[storageKey] || {}; try { local = await globalThis.AtelierSync.reconcile(local); await chrome.storage.local.set({ [storageKey]: local }); } catch { /* Use the local cache. */ } rawRecords = Object.values(local); await repairStoredMetadata(); groups = window.SolveNotesGroups.group(rawRecords); renderSummary(); renderActivity(); renderRetries(); render();
  document.getElementById("search").addEventListener("input", render); document.getElementById("filter").addEventListener("change", render);
  document.querySelector(".view-switch").addEventListener("click", (event) => { const button = event.target.closest("[data-view]"); if (!button) return; currentView = button.dataset.view; document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("active", item === button)); render(); });
  document.getElementById("list").addEventListener("change", (event) => { const select = event.target.closest("[data-link-key]"); if (select?.value) setParent(select.dataset.linkKey, select.value); });
  document.getElementById("list").addEventListener("click", (event) => { const unlink = event.target.closest("[data-unlink-key]"); if (unlink) setParent(unlink.dataset.unlinkKey, null); const edit = event.target.closest("[data-edit-key]"); if (edit) openEditor(edit.dataset.editKey); });
  document.getElementById("edit-count").addEventListener("input", (event) => { event.target.dataset.automatic = "false"; });
  document.getElementById("edit-use-auto").addEventListener("click", () => { const input = document.getElementById("edit-count"); input.value = document.getElementById("edit-auto-count").textContent; input.dataset.automatic = "true"; });
  document.getElementById("edit-save").addEventListener("click", saveEditor);
  document.getElementById("export").addEventListener("click", () => { const url = URL.createObjectURL(new Blob([JSON.stringify(rawRecords, null, 2)], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `solvenotes-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); });
}
init();
