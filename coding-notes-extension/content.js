(() => {
  let storageKey = "solvenotes.problems.unpaired";
  const TAB_ID = "solvenotes-tab";
  const PANEL_ID = "solvenotes-panel";
  const LAUNCHER_ID = "atelier-notes-handle";
  const TIMER_RE = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/;
  const ACCEPTED_RE = /\b(accepted|success|correct answer)\b/i;
  const FAILURE_RE = /\b(wrong answer|time limit exceeded|memory limit exceeded|runtime error|compile error|output limit exceeded)\b/i;
  let problemKey = getProblemKey();
  let record;
  let saveTimer;
  let notesOpen = false;
  let hiddenPanelChildren = [];
  const isLeetCode = () => location.hostname.includes("leetcode") && !location.hostname.includes("neetcode");

  function getProblemKey() {
    const parts = location.pathname.split("/").filter(Boolean);
    const marker = parts.indexOf("problems");
    const slug = marker >= 0 ? parts[marker + 1] : parts.at(-1);
    return slug ? `${location.hostname.includes("neetcode") ? "neetcode" : "leetcode"}:${slug}` : null;
  }

  function problemTitle() {
    const slug = problemKey?.split(":").slice(1).join(":");
    if (location.hostname.includes("leetcode") && !location.hostname.includes("neetcode") && slug) {
      const canonical = [...document.querySelectorAll(`a[href="/problems/${CSS.escape(slug)}/"], a[href="/problems/${CSS.escape(slug)}"]`)].find((node) => /^\d+\.\s+/.test(node.textContent?.trim() || ""));
      if (canonical) return canonical.textContent.trim();
    }
    const heading = [...document.querySelectorAll("h1, [data-cy='question-title'], [class*='title']")].find((node) => node.textContent?.trim() && !node.closest(`#${PANEL_ID}`));
    const headingTitle = heading?.textContent?.trim();
    if (location.hostname.includes("leetcode") && !location.hostname.includes("neetcode")) {
      const numberedDocumentTitle = document.title.match(/^\s*(\d+\.\s*[^|–—-]+)/)?.[1]?.trim();
      return (/^\d+\.\s*/.test(headingTitle || "") ? headingTitle : numberedDocumentTitle || headingTitle) || problemKey?.split(":")[1].replaceAll("-", " ") || "Problem";
    }
    return headingTitle?.replace(/^\d+\.\s*/, "") || problemKey?.split(":")[1].replaceAll("-", " ") || "Problem";
  }

  function findLeetCodeSlug() {
    if (!location.hostname.includes("neetcode")) return null;
    const href = document.querySelector('a[href*="leetcode.com/problems/"]')?.href;
    return href?.match(/leetcode\.com\/problems\/([^/?#]+)/i)?.[1] || null;
  }

  function findProblemTags() {
    const known = ["Array", "String", "Hash Table", "Dynamic Programming", "Math", "Sorting", "Greedy", "Depth-First Search", "Breadth-First Search", "Binary Search", "Tree", "Binary Tree", "Matrix", "Two Pointers", "Bit Manipulation", "Stack", "Heap", "Graph", "Sliding Window", "Backtracking", "Union Find", "Linked List", "Trie", "Intervals", "Prefix Sum"];
    const found = new Set(record?.tags || []);
    for (const node of document.querySelectorAll('[class*="topic"], [class*="tag"], a[href*="topic"], a[href*="tag"]')) {
      const text = (node.textContent || "").trim();
      const match = known.find((tag) => tag.toLowerCase() === text.toLowerCase());
      if (match) found.add(match);
    }
    return [...found];
  }

  function emptyRecord() {
    const now = new Date().toISOString();
    return { key: problemKey, title: problemTitle(), url: location.href.split("?")[0], notes: "", seconds: 0, submissions: [], holeInOne: false, neededHints: false, dontUnderstand: false, sortAt: now, updatedAt: now };
  }

  async function readAll() { return (await chrome.storage.local.get(storageKey))[storageKey] || {}; }
  async function load() {
    const all = await readAll(), stored = all[problemKey] || {}, pageTitle = problemTitle();
    record = { ...emptyRecord(), ...stored };
    record.sortAt ||= record.submissions?.map((item) => item.at).filter(Boolean).sort().at(-1) || stored.updatedAt || new Date().toISOString();
    if (isLeetCode() && /^\d+\.\s+/.test(pageTitle) && pageTitle !== record.title) { record.title = pageTitle; all[problemKey] = record; await chrome.storage.local.set({ [storageKey]: all }); }
  }

  async function save() {
    record.updatedAt = new Date().toISOString();
    record.title = problemTitle();
    record.url = location.href.split("?")[0];
    record.tags = findProblemTags();
    if (record.linkSource !== "manual") record.leetcodeSlug = findLeetCodeSlug() || record.leetcodeSlug || null;
    const all = await readAll();
    all[problemKey] = record;
    await chrome.storage.local.set({ [storageKey]: all });
    try { await globalThis.AtelierSync.push(record); } catch { /* Keep working from the local cache while Atelier is offline. */ }
    renderRecord();
    const status = document.querySelector(`#${PANEL_ID} [data-status]`);
    if (status) { status.textContent = "Saved"; setTimeout(() => { status.textContent = ""; }, 1000); }
    showToast("Saved");
  }

  function showToast(message, error = false) {
    let toast = document.getElementById("solvenotes-toast");
    if (!toast) { toast = document.createElement("div"); toast.id = "solvenotes-toast"; document.body.appendChild(toast); }
    toast.textContent = message; toast.className = error ? "sn-toast-error sn-toast-show" : "sn-toast-show";
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { toast.className = ""; }, 2400);
  }

  function parseTimer(text) {
    const match = text.trim().match(TIMER_RE);
    if (!match) return null;
    const hours = Number(match[1] || 0), minutes = Number(match[2]), seconds = Number(match[3]);
    return minutes <= 59 && seconds <= 59 ? hours * 3600 + minutes * 60 + seconds : null;
  }

  function readPageTimer() {
    let best = null;
    for (const node of document.querySelectorAll("time, [role='timer'], [class*='timer'], button, span")) {
      if (node.closest(`#${PANEL_ID}`) || node.children.length > 2) continue;
      const seconds = parseTimer(node.textContent || "");
      if (seconds === null) continue;
      const context = `${node.getAttribute("aria-label") || ""} ${node.parentElement?.textContent || ""}`;
      const score = /timer|elapsed|stopwatch/i.test(context) ? 2 : 1;
      if (!best || score > best.score || (score === best.score && seconds > best.seconds)) best = { seconds, score };
    }
    return best?.seconds ?? null;
  }

  function syncTimer() {
    const seconds = readPageTimer();
    if (seconds !== null && seconds > record.seconds) { record.seconds = seconds; renderRecord(); clearTimeout(saveTimer); saveTimer = setTimeout(save, 1200); }
  }

  function formatTime(total) {
    const hours = Math.floor(total / 3600), minutes = Math.floor((total % 3600) / 60), seconds = total % 60;
    return [hours, minutes, seconds].filter((_, index) => hours || index > 0).map((part) => String(part).padStart(2, "0")).join(":");
  }

  function isSub20() { return record.seconds > 0 && record.seconds <= 1200 && record.submissions.some((submission) => submission.accepted); }
  function submissionCount() { return Number.isInteger(record.submissionCountOverride) ? record.submissionCountOverride : record.submissions.length; }

  function syncVisibleSubmissionHistory() {
    const isNeetCode = location.hostname.includes("neetcode");
    const onHistory = isNeetCode ? /\/history\/?$/.test(location.pathname) : Boolean(document.querySelector(".flexlayout__tab_button--selected #submissions_tab"));
    if (!onHistory) return;
    const statuses = isNeetCode
      ? [...document.querySelectorAll("table.submission-history-table tbody > tr")]
          .map((row) => row.querySelector(".submission-status-text")?.textContent?.trim())
          .filter(Boolean)
      : [...document.querySelectorAll("body *")]
          .filter((node) => !node.closest(`#${PANEL_ID}`) && node.children.length === 0 && node.getClientRects().length > 0)
          .map((node) => (node.textContent || "").trim())
          .filter((text) => /^(accepted|wrong answer|time limit exceeded|memory limit exceeded|runtime error|compile error|output limit exceeded)$/i.test(text));
    if (!statuses.length) return;
    const historySignature = statuses.join("|").toLowerCase();
    if (record.historySignature === historySignature) return;
    record.historySignature = historySignature;
    record.submissions = statuses.reverse().map((status, index) => ({
      accepted: ACCEPTED_RE.test(status),
      at: new Date(Date.now() - (statuses.length - index) * 1000).toISOString(),
      seconds: record.seconds,
      source: "history"
    }));
    record.holeInOne = Boolean(record.submissions[0]?.accepted);
    record.sortAt = new Date().toISOString();
    save();
  }

  function setSyncStatus(message, error = false) {
    const status = document.querySelector(`#${PANEL_ID} [data-sync-status]`);
    if (status) { status.textContent = message; status.classList.toggle("sn-error", error); }
    showToast(message, error);
  }

  async function fetchLeetCodeMetadata(slugs) {
    const metadata = new Map();
    for (let start = 0; start < slugs.length; start += 20) {
      const batch = slugs.slice(start, start + 20);
      const fields = batch.map((slug, index) => `p${index}: question(titleSlug: \"${slug}\") { questionFrontendId title difficulty topicTags { name } }`).join(" ");
      const response = await fetch("/graphql/", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: `query SolveNotesSync { ${fields} }` }) });
      if (!response.ok) continue;
      const data = (await response.json()).data || {};
      batch.forEach((slug, index) => { if (data[`p${index}`]) metadata.set(slug, data[`p${index}`]); });
    }
    return metadata;
  }

  async function syncLeetCodeAccount() {
    setSyncStatus("Scanning LeetCode submissions…");
    const dumps = [];
    let offset = 0, lastKey = "";
    for (let page = 0; page < 100; page += 1) {
      const response = await fetch(`/api/submissions/?offset=${offset}&limit=40&lastkey=${encodeURIComponent(lastKey)}`, { credentials: "include" });
      if (!response.ok) throw new Error(`LeetCode returned ${response.status}`);
      const data = await response.json();
      const pageItems = data.submissions_dump || [];
      dumps.push(...pageItems);
      if (!data.has_next || !pageItems.length) break;
      offset += pageItems.length;
      lastKey = data.last_key || "";
    }
    if (!dumps.length) throw new Error("No account submissions were returned. Make sure you are signed in.");
    const grouped = new Map();
    for (const item of dumps) grouped.set(item.title_slug, [...(grouped.get(item.title_slug) || []), item]);
    const metadata = await fetchLeetCodeMetadata([...grouped.keys()]);
    const all = await readAll();
    for (const [slug, items] of grouped) {
      const key = `leetcode:${slug}`, existing = all[key] || {};
      const meta = metadata.get(slug) || {};
      const submissions = items.map((item) => ({ accepted: ACCEPTED_RE.test(item.status_display || ""), at: new Date(Number(item.timestamp) * 1000).toISOString(), language: item.lang, source: "account-sync" })).sort((a, b) => new Date(a.at) - new Date(b.at));
      all[key] = { ...emptyRecord(), ...existing, key, title: `${meta.questionFrontendId ? `${meta.questionFrontendId}. ` : ""}${meta.title || items[0].title}`, url: `${location.origin}/problems/${slug}/`, submissions, holeInOne: submissions.length === 1 && submissions[0].accepted, tags: meta.topicTags?.map((tag) => tag.name) || existing.tags || [], difficulty: meta.difficulty || existing.difficulty || null, sortAt: submissions.at(-1)?.at || existing.sortAt || new Date().toISOString(), syncedAt: new Date().toISOString(), updatedAt: existing.updatedAt || new Date().toISOString() };
    }
    await chrome.storage.local.set({ [storageKey]: all });
    record = { ...record, ...(all[problemKey] || {}) };
    renderRecord();
    setSyncStatus(`Synced ${grouped.size} problems and ${dumps.length} submissions.`);
  }

  async function syncNeetCodeCurrent() {
    const rows = [...document.querySelectorAll("table.submission-history-table tbody > tr")];
    if (!rows.length) throw new Error("Open this problem’s Submissions tab, then press Sync again.");
    const submissions = rows.map((row) => {
      const status = row.querySelector(".submission-status-text")?.textContent?.trim() || "";
      const dateText = row.querySelector(".submission-date-text")?.textContent?.trim();
      return { accepted: ACCEPTED_RE.test(status), at: dateText && !Number.isNaN(Date.parse(dateText)) ? new Date(dateText).toISOString() : new Date().toISOString(), source: "account-sync" };
    }).reverse();
    record.submissions = submissions;
    record.holeInOne = submissions.length === 1 && submissions[0].accepted;
    record.sortAt = submissions.at(-1)?.at || new Date().toISOString();
    record.tags = findProblemTags();
    record.historySignature = submissions.map((item) => item.accepted ? "accepted" : "miss").join("|");
    await save();
    setSyncStatus(`Synced this problem: ${submissions.length} submissions. NeetCode does not expose account-wide history here.`);
  }

  async function syncSite() {
    const button = document.querySelector(`#${PANEL_ID} [data-sync]`);
    if (button) button.disabled = true;
    try { if (location.hostname.includes("neetcode")) await syncNeetCodeCurrent(); else await syncLeetCodeAccount(); }
    catch (error) { setSyncStatus(error.message || "Sync failed.", true); }
    finally { if (button) button.disabled = false; }
  }

  function findTabStrip() {
    if (location.hostname.includes("neetcode")) {
      return document.querySelector(".tabs-container > .tabs-list, ul.tabs-list");
    }
    const leetcodeStrip = document.querySelector(".flexlayout__tabset_tabbar_inner_tab_container_top");
    if (leetcodeStrip?.querySelector("#submissions_tab")) return leetcodeStrip;
    return [...document.querySelectorAll("[role='tablist'], nav, header, div")]
      .filter((node) => !node.closest(`#${PANEL_ID}`) && /\b(submissions?|discuss)\b/i.test(node.textContent || ""))
      .filter((node) => [...node.children].some((child) => /\b(question|description|editorial|solution|submissions?|discuss)\b/i.test(child.textContent || "")))
      .sort((a, b) => a.childElementCount - b.childElementCount)[0] || null;
  }

  function findContentPanel(tabStrip) {
    if (location.hostname.includes("leetcode") && !location.hostname.includes("neetcode")) {
      const tabset = tabStrip.closest(".flexlayout__tabset");
      if (tabset) return tabset;
    }
    let current = tabStrip;
    for (let depth = 0; current && depth < 5; depth += 1, current = current.parentElement) {
      const sibling = current.nextElementSibling;
      if (sibling && sibling.getBoundingClientRect().height > 80) return sibling;
    }
    return tabStrip.parentElement;
  }

  function leetCodeBounds(strip) {
    let container = strip.parentElement;
    while (container && container !== document.body) {
      const rect = container.getBoundingClientRect();
      if (rect.width > 320 && rect.height > 220) return { container, rect, top: strip.getBoundingClientRect().bottom };
      container = container.parentElement;
    }
    const rect = strip.getBoundingClientRect();
    return { container: document.body, rect: { left: rect.left, right: innerWidth, bottom: innerHeight, width: innerWidth - rect.left }, top: rect.bottom };
  }

  function positionLeetCodePanel() {
    const panel = document.getElementById(PANEL_ID), strip = findTabStrip();
    if (!panel?.classList.contains("sn-leetcode-overlay") || !strip) return;
    const bounds = leetCodeBounds(strip), right = bounds.rect.right ?? (bounds.rect.left + bounds.rect.width);
    Object.assign(panel.style, { left: `${bounds.rect.left}px`, top: `${bounds.top}px`, width: `${right - bounds.rect.left}px`, height: `${Math.max(180, bounds.rect.bottom - bounds.top)}px` });
  }

  function mountTab() {
    if (document.getElementById(TAB_ID)) return;
    const strip = findTabStrip();
    if (!strip) return;
    const reference = [...strip.children].find((node) => /\bdiscuss\b/i.test(node.textContent || "")) || [...strip.children].find((node) => /\bsubmissions?\b/i.test(node.textContent || ""));
    let tab;
    if (location.hostname.includes("neetcode")) {
      tab = document.createElement("li");
      tab.id = TAB_ID;
      tab.innerHTML = `<a href="#solvenotes"><span class="tab-header light-text"><span class="sn-tab-icon" aria-hidden="true">✎</span> Notes</span></a>`;
      tab.querySelector("a").addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); openNotes(strip); });
    } else if (strip.classList.contains("flexlayout__tabset_tabbar_inner_tab_container_top")) {
      tab = document.createElement("div");
      tab.id = TAB_ID;
      tab.className = "flexlayout__tab_button flexlayout__tab_button_top flexlayout__tab_button--unselected";
      tab.innerHTML = `<div class="flexlayout__tab_button_content"><div class="relative flex items-center gap-1 overflow-hidden text-sm capitalize"><span class="sn-tab-icon" aria-hidden="true">✎</span><div class="relative"><div class="medium whitespace-nowrap font-medium">Notes</div></div></div></div>`;
      tab.addEventListener("click", () => openNotes(strip));
    } else {
      tab = document.createElement("button");
      tab.id = TAB_ID; tab.type = "button"; tab.setAttribute("role", "tab");
      tab.innerHTML = `<span aria-hidden="true">✎</span><span>Notes</span>`;
      tab.addEventListener("click", () => openNotes(strip));
    }
    if (reference) reference.after(tab); else strip.appendChild(tab);
  }

  function openNotes(strip) {
    if (notesOpen) return;
    const host = isLeetCode() ? document.body : findContentPanel(strip);
    if (!host) return;
    notesOpen = true;
    const isLeetCodeTabset = host.classList.contains("flexlayout__tabset");
    const contentChildren = isLeetCode() ? [] : (isLeetCodeTabset ? [...host.children].filter((node) => !node.contains(strip)) : [...host.children]);
    hiddenPanelChildren = contentChildren.map((node) => ({ node, display: node.style.display }));
    hiddenPanelChildren.forEach(({ node }) => { node.style.display = "none"; });
    [...strip.querySelectorAll("[role='tab'], button")].forEach((node) => node.removeAttribute("data-solvenotes-active"));
    if (location.hostname.includes("neetcode")) {
      [...strip.children].forEach((node) => node.classList.remove("my-active-tab"));
      document.getElementById(TAB_ID)?.classList.add("my-active-tab");
    }
    document.getElementById(TAB_ID)?.setAttribute("data-solvenotes-active", "true");
    const panel = document.createElement("section");
    panel.id = PANEL_ID; panel.innerHTML = editorMarkup();
    if (isLeetCode()) panel.classList.add("sn-leetcode-overlay");
    host.appendChild(panel); positionLeetCodePanel(); wireEditor(panel);
  }

  function closeNotes() {
    if (!notesOpen) return;
    notesOpen = false;
    document.getElementById(PANEL_ID)?.remove();
    hiddenPanelChildren.forEach(({ node, display }) => { node.style.display = display; });
    hiddenPanelChildren = [];
    document.getElementById(TAB_ID)?.removeAttribute("data-solvenotes-active");
    document.getElementById(TAB_ID)?.classList.remove("my-active-tab");
  }

  function editorMarkup() {
    return `<div class="sn-editor"><div class="sn-drawer-top"><span class="sn-brand">ATELIER <i>·</i> CODING</span><button data-close type="button" aria-label="Close notes">×</button></div><header><div><span class="sn-eyebrow">PROBLEM NOTES</span><h2>${escapeHtml(record.title)}</h2></div></header><div class="sn-account-row"><span data-account-status>Checking account…</span><button data-account type="button"></button></div><div class="sn-header-actions"><button data-sync type="button">↻ Sync</button><button data-all type="button">Open Atelier ↗</button></div><div class="sn-sync-status" data-sync-status aria-live="polite"></div><div class="sn-badges"><span>◷ <b data-time></b></span><span class="sn-submission-pill"><b data-attempts></b><button data-edit-count type="button" aria-label="Edit submission count" title="Edit submission count">✎</button></span><span data-sub20></span><span data-hole></span></div><div class="sn-count-popover" data-count-popover hidden><label for="sn-count">Submission count</label><input id="sn-count" data-count-input type="number" min="0" step="1"><button data-save-count type="button">Set</button><button data-auto-count type="button">Automatic (<span data-auto-total></span>)</button></div><div class="sn-flags"><label><input data-hints type="checkbox"> <span><b>Needed hints</b><small>I didn’t solve this fully on my own</small></span></label><label><input data-understand type="checkbox"> <span><b>Don’t understand</b><small>Flag this problem to revisit</small></span></label></div><label class="sn-notes-label" for="sn-notes">Notes</label><textarea id="sn-notes" placeholder="Approach, edge cases, mistakes, complexity…"></textarea><footer><span data-status aria-live="polite"></span><button data-save type="button">Save notes</button></footer></div>`;
  }

  function wireEditor(panel) {
    const notes = panel.querySelector("textarea");
    const top = panel.querySelector(".sn-drawer-top");
    const close = panel.querySelector("[data-close]");
    const sync = panel.querySelector("[data-sync]");
    const atelier = panel.querySelector("[data-all]");
    const badges = panel.querySelector(".sn-badges");
    const footer = panel.querySelector("footer");
    const accountRow = panel.querySelector(".sn-account-row");
    panel.querySelector("[data-save]").textContent = "Save";
    sync.textContent = "↻";
    sync.setAttribute("aria-label", "Sync this problem");
    sync.title = "Sync this problem";
    atelier.textContent = "A";
    atelier.setAttribute("aria-label", "Open Atelier");
    atelier.title = "Open Atelier";
    atelier.classList.add("sn-atelier-action");
    top.insertBefore(atelier, close);
    top.insertBefore(sync, close);
    panel.querySelector("header").after(badges);
    panel.querySelectorAll(".sn-flags small").forEach((description) => description.remove());
    footer.prepend(accountRow);
    notes.value = record.notes;
    panel.querySelector("[data-hints]").checked = record.neededHints;
    panel.querySelector("[data-understand]").checked = record.dontUnderstand;
    panel.querySelector("[data-all]").addEventListener("click", () => chrome.runtime.sendMessage({ type: "open-notes" }));
    panel.querySelector("[data-close]").addEventListener("click", closeDrawer);
    wireAccount(panel);
    panel.querySelector("[data-sync]").addEventListener("click", syncSite);
    panel.querySelector("[data-edit-count]").addEventListener("click", (event) => { event.stopPropagation(); panel.querySelector("[data-count-popover]").classList.toggle("sn-count-open"); });
    panel.querySelector("[data-save]").addEventListener("click", save);
    panel.querySelector("[data-save-count]").addEventListener("click", () => {
      const value = panel.querySelector("[data-count-input]").value;
      if (!/^\d+$/.test(value)) return;
      record.submissionCountOverride = Number(value);
      record.holeInOne = Number(value) === 1;
      save(); panel.querySelector("[data-count-popover]").classList.remove("sn-count-open");
    });
    panel.querySelector("[data-auto-count]").addEventListener("click", () => { record.submissionCountOverride = null; record.holeInOne = record.submissions.length === 1 && Boolean(record.submissions[0]?.accepted); save(); panel.querySelector("[data-count-popover]").classList.remove("sn-count-open"); });
    notes.addEventListener("input", () => { record.notes = notes.value; clearTimeout(saveTimer); saveTimer = setTimeout(save, 700); });
    panel.querySelector("[data-hints]").addEventListener("change", (event) => { record.neededHints = event.target.checked; save(); });
    panel.querySelector("[data-understand]").addEventListener("change", (event) => { record.dontUnderstand = event.target.checked; save(); });
    renderRecord();
  }

  async function wireAccount(panel) {
    const status = panel.querySelector("[data-account-status]");
    const button = panel.querySelector("[data-account]");
    const avatar = document.createElement("span");
    avatar.className = "sn-account-avatar";
    const identity = document.createElement("span");
    identity.className = "sn-account-copy";
    const name = document.createElement("strong");
    name.textContent = "Not connected";
    status.textContent = "Notes are saved in this browser";
    button.textContent = "Connect";
    avatar.textContent = "A";
    const accountRow = status.parentElement;
    accountRow.insertBefore(avatar, status);
    accountRow.insertBefore(identity, status);
    identity.append(name, status);
    const authPanel = document.createElement("section");
    authPanel.className = "sn-auth-panel";
    authPanel.innerHTML = `<div class="sn-auth-mark">A</div><p class="sn-auth-eyebrow">ATELIER · CODING</p><h3>Welcome back.</h3><p class="sn-auth-intro">Your private practice log, wherever you solve.</p><div class="sn-auth-providers"><button type="button" data-provider="google" aria-label="Continue with Google"><span class="sn-google">G</span> Continue with Google</button><button type="button" data-provider="github" aria-label="Continue with GitHub"><span class="sn-github">●</span> Continue with GitHub</button></div><div class="sn-auth-divider"><span>or</span></div><form><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" minlength="6" autocomplete="current-password" required></label><button type="submit" data-email-submit>Sign in</button></form><button type="button" class="sn-auth-mode">New here? Create an account</button><small class="sn-auth-error" role="alert"></small>`;
    authPanel.querySelector(".sn-google").innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4a4.6 4.6 0 0 1-2 3v2.7h3.3c1.9-1.8 2.9-4.4 2.9-7.7Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.7c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.5-4H3.1v2.8A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 13.9a6 6 0 0 1 0-3.8V7.3H3.1a10 10 0 0 0 0 9.4l3.4-2.8Z"/><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.8A9.7 9.7 0 0 0 3.1 7.3l3.4 2.8A5.9 5.9 0 0 1 12 6.1Z"/></svg>`;
    authPanel.querySelector(".sn-github").innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .7a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.2.8-.5v-2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11.2 11.2 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.8 5.4-5.5 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5A11.5 11.5 0 0 0 12 .7Z"/></svg>`;
    accountRow.after(authPanel);
    let authMode = "signin";
    const authError = authPanel.querySelector(".sn-auth-error");
    async function authenticate(payload) {
      authPanel.classList.add("sn-auth-busy");
      authError.textContent = "";
      try {
        const result = await chrome.runtime.sendMessage({ type: "extension-auth", payload });
        if (result?.error) throw new Error(result.error);
        await refresh();
      } catch (error) { authError.textContent = error.message?.includes("context invalidated") ? "Reload this NeetCode page, then try again." : error.message || "Sign-in failed."; }
      finally { authPanel.classList.remove("sn-auth-busy"); }
    }
    authPanel.querySelector(".sn-auth-providers").addEventListener("click", (event) => {
      const provider = event.target.closest("button[data-provider]")?.dataset.provider;
      if (provider) void authenticate({ provider });
    });
    authPanel.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      void authenticate({ provider: "email", mode: authMode, email: String(data.get("email")), password: String(data.get("password")) });
    });
    authPanel.querySelector(".sn-auth-mode").addEventListener("click", (event) => {
      authMode = authMode === "signin" ? "signup" : "signin";
      authPanel.querySelector("[data-email-submit]").textContent = authMode === "signin" ? "Sign in" : "Create account";
      event.currentTarget.textContent = authMode === "signin" ? "Create an account instead" : "Already have an account? Sign in";
    });
    const refresh = async () => {
      const connected = await globalThis.AtelierSync.connected();
      const cached = (await chrome.storage.local.get("atelier.profile"))["atelier.profile"];
      let profile = cached;
      if (connected) try { profile = await globalThis.AtelierSync.profile(); } catch { /* Show the cached identity while Atelier is offline. */ }
      const fullName = profile?.displayName || profile?.email?.split("@")[0] || "Atelier";
      name.textContent = connected ? fullName.trim().split(/\s+/)[0] : "Not connected";
      status.textContent = connected ? (profile?.email || "Syncing with Atelier") : "Notes are only saved in this browser";
      avatar.textContent = (profile?.displayName || profile?.email || "A").slice(0, 1).toUpperCase();
      avatar.style.setProperty("--sn-avatar-image", connected && profile?.photoURL ? `url(${JSON.stringify(profile.photoURL).slice(1, -1)})` : "none");
      avatar.classList.toggle("sn-has-photo", Boolean(connected && profile?.photoURL));
      button.textContent = connected ? "Sign Out" : "Connect";
      button.hidden = !connected;
      authPanel.hidden = connected;
      panel.classList.toggle("sn-disconnected", !connected);
      return connected;
    };
    await refresh();
    avatar.setAttribute("role", "button");
    avatar.setAttribute("tabindex", "0");
    avatar.setAttribute("aria-label", "Open profile actions");
    const toggleProfileActions = () => accountRow.classList.toggle("sn-signout-open");
    avatar.addEventListener("click", toggleProfileActions);
    avatar.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleProfileActions(); } });
    button.addEventListener("click", async () => {
      if (!(await globalThis.AtelierSync.connected())) { chrome.runtime.sendMessage({ type: "open-auth" }); return; }
      button.disabled = true;
      try {
        await globalThis.AtelierSync.disconnect();
        accountRow.classList.remove("sn-signout-open");
        storageKey = await globalThis.AtelierSync.storageKey();
        await load();
        renderRecord();
        await refresh();
      } catch (error) { showToast(error.message || "Could not connect to Atelier.", true); }
      finally { button.disabled = false; }
    });
    chrome.storage.onChanged.addListener((changes) => {
      if (changes["atelier.authToken"] || changes["atelier.profile"]) void refresh();
    });
  }

  function mountLauncher() {
    if (document.getElementById(LAUNCHER_ID)) return;
    const launcher = document.createElement("button");
    launcher.id = LAUNCHER_ID;
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open Atelier problem notes");
    launcher.setAttribute("aria-expanded", "false");
    launcher.innerHTML = `<span aria-hidden="true" class="sn-launcher-logo">A</span>`;
    launcher.addEventListener("click", toggleDrawer);
    document.body.appendChild(launcher);
  }

  function openDrawer() {
    mountLauncher();
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement("aside");
      panel.id = PANEL_ID;
      panel.setAttribute("aria-label", "Atelier problem notes");
      panel.innerHTML = editorMarkup();
      document.body.appendChild(panel);
      wireEditor(panel);
    }
    notesOpen = true;
    requestAnimationFrame(() => panel.setAttribute("data-open", "true"));
    const launcher = document.getElementById(LAUNCHER_ID);
    launcher?.setAttribute("aria-expanded", "true");
    launcher?.setAttribute("data-open", "true");
  }

  function closeDrawer() {
    notesOpen = false;
    document.getElementById(PANEL_ID)?.removeAttribute("data-open");
    const launcher = document.getElementById(LAUNCHER_ID);
    launcher?.setAttribute("aria-expanded", "false");
    launcher?.removeAttribute("data-open");
  }

  function toggleDrawer() { notesOpen ? closeDrawer() : openDrawer(); }

  function renderRecord() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    panel.querySelector("[data-time]").textContent = formatTime(record.seconds);
    const count = submissionCount();
    panel.querySelector("[data-attempts]").textContent = `${count} submission${count === 1 ? "" : "s"}`;
    panel.querySelector("[data-count-input]").value = count;
    panel.querySelector("[data-auto-total]").textContent = record.submissions.length;
    const sub20 = panel.querySelector("[data-sub20]"); sub20.textContent = isSub20() ? "✓ Sub 20" : "Sub 20 —"; sub20.classList.toggle("sn-positive", isSub20());
    const hole = panel.querySelector("[data-hole]"); hole.textContent = record.holeInOne ? "★ Hole in one" : ""; hole.hidden = !record.holeInOne;
  }

  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }

  async function boot() {
    if (!problemKey) return;
    storageKey = await globalThis.AtelierSync.storageKey();
    try { const merged = await globalThis.AtelierSync.reconcile(await readAll()); await chrome.storage.local.set({ [storageKey]: merged }); } catch { /* Atelier may not be running. */ }
    await load(); mountLauncher();
    chrome.runtime.onMessage.addListener((message) => { if (message?.type === "toggle-drawer") toggleDrawer(); });
    const observer = new MutationObserver(() => { if (getProblemKey() !== problemKey) location.reload(); mountLauncher(); const linkedSlug = findLeetCodeSlug(); if (record.linkSource !== "manual" && linkedSlug && linkedSlug !== record.leetcodeSlug) { record.leetcodeSlug = linkedSlug; save(); } syncTimer(); syncVisibleSubmissionHistory(); });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    setInterval(syncTimer, 1000);
  }
  boot();
})();
