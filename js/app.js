/**
 * app.js — Main application controller with User Profile, Web Icons & Confetti
 */

import { loadProblems, saveProblems, loadSettings, saveSettings, loadUserProfile, saveUserProfile, exportToCSV, parseCSV, exportToJSON, parseJSON, nextId } from './data.js';
import { filterProblems, getCategoryCounts, getStats } from './filters.js';
import { getIcon } from './icons.js';
import { fireCelebrationConfetti } from './confetti.js';

// ── Preset Avatars & Random Greetings ──────────────────────────
const AVATAR_PRESETS = {
  ninja: '🥷',
  wizard: '🧙‍♂️',
  crown: '👑',
  rocket: '🚀',
  fire: '🔥',
  diamond: '💎',
  star: '⭐',
  cyber: '🤖'
};

const WELCOME_MESSAGES = [
  "Welcome back,",
  "Ready to grind,",
  "Let's code,",
  "Keep pushing,",
  "Master LeetCode,",
  "Level up,",
  "Stay sharp,",
  "Great to see you,",
  "Keep cracking,",
  "Code away,"
];

// ── Load seed data if localStorage is empty ────────────────────
async function loadSeedData() {
  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error('No seed data');
    return await res.json();
  } catch {
    return [];
  }
}

// ── State ──────────────────────────────────────────────────────
let problems = [];
let settings = loadSettings();
let userProfile = loadUserProfile();
let currentGreeting = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];

let state = {
  search: '',
  activeNav: 'all',
  diffFilter: 'all',
  firstTryFilter: '',
  holeInOneFilter: '',
  sortField: settings.sortField || 'problemNo',
  sortDir: settings.sortDir || 'asc',
  view: settings.view || 'table',
  editingId: null
};

// ── DOM References ─────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

async function dismissFullPageSkeleton() {
  const skel = $('fullpage-skeleton');
  if (!skel) return;

  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {}
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      skel.classList.add('fade-out');
      setTimeout(() => {
        if (skel.parentNode) skel.parentNode.removeChild(skel);
      }, 400);
    });
  });
}

// ── Init ───────────────────────────────────────────────────────
async function init() {
  let stored = loadProblems();
  if (!stored || stored.length === 0) {
    stored = await loadSeedData();
    if (stored.length > 0) {
      saveProblems(stored);
      showToast('Loaded your LeetCode tracker data!', 'success');
    }
  }
  problems = stored || [];
  renderStaticIcons();
  renderUserProfile();
  render();
  bindEvents();
  dismissFullPageSkeleton();
}

// ── Static Web Icons Injection ─────────────────────────────────
function renderStaticIcons() {
  if ($('icon-import')) $('icon-import').innerHTML = getIcon('import');
  if ($('icon-export-json')) $('icon-export-json').innerHTML = getIcon('export');
  if ($('icon-export')) $('icon-export').innerHTML = getIcon('export');
  if ($('icon-add')) $('icon-add').innerHTML = getIcon('plus');
  if ($('search-icon-wrap')) $('search-icon-wrap').innerHTML = getIcon('search');
  if ($('btn-view-table')) $('btn-view-table').innerHTML = getIcon('table');
  if ($('btn-view-cards')) $('btn-view-cards').innerHTML = getIcon('cards');
  if ($('th-star')) $('th-star').innerHTML = getIcon('star-fill');
  if ($('modal-close')) $('modal-close').innerHTML = getIcon('close');
  if ($('profile-modal-close')) $('profile-modal-close').innerHTML = getIcon('close');
  if ($('profile-view-close')) $('profile-view-close').innerHTML = getIcon('close');
  if ($('menu-icon-user')) $('menu-icon-user').innerHTML = getIcon('user');
  if ($('menu-icon-settings')) $('menu-icon-settings').innerHTML = getIcon('edit');
}

// ── User Profile UI ───────────────────────────────────────────
function renderUserProfile() {
  if ($('welcome-prefix')) {
    $('welcome-prefix').textContent = currentGreeting;
    clearSkeleton($('welcome-prefix'));
  }
  if ($('header-user-name')) {
    $('header-user-name').textContent = userProfile.username || 'Coder';
    clearSkeleton($('header-user-name'));
  }

  const avatarBadge = $('header-avatar-badge');
  const btnName = $('profile-btn-name');
  if (btnName) {
    btnName.textContent = userProfile.username || 'Coder';
    clearSkeleton(btnName);
  }

  if (avatarBadge) {
    clearSkeleton(avatarBadge);
    if (userProfile.avatarType === 'custom' && userProfile.avatarUrl) {
      avatarBadge.innerHTML = `<img src="${escHtml(userProfile.avatarUrl)}" alt="Avatar" onerror="this.onerror=null;this.parentElement.textContent='👤'" />`;
    } else {
      const symbol = AVATAR_PRESETS[userProfile.avatarPreset] || '🥷';
      avatarBadge.textContent = symbol;
    }
  }
}

function openProfileViewModal() {
  const pvAvatar = $('pv-avatar-badge');
  const pvUsername = $('pv-username');
  if (pvUsername) pvUsername.textContent = userProfile.username || 'Coder';

  if (pvAvatar) {
    if (userProfile.avatarType === 'custom' && userProfile.avatarUrl) {
      pvAvatar.innerHTML = `<img src="${escHtml(userProfile.avatarUrl)}" alt="Avatar" onerror="this.onerror=null;this.parentElement.textContent='👤'" />`;
    } else {
      const symbol = AVATAR_PRESETS[userProfile.avatarPreset] || '🥷';
      pvAvatar.textContent = symbol;
    }
  }

  const stats = getStats(problems);
  const totalSolved = stats.solved;
  const firstTryRate = totalSolved > 0 ? Math.round((stats.firstTry / totalSolved) * 100) : 0;
  const hardSolved = stats.hardSolved;

  if ($('pv-total-solved')) $('pv-total-solved').textContent = totalSolved;
  if ($('pv-first-try-rate')) $('pv-first-try-rate').textContent = `${firstTryRate}%`;
  if ($('pv-hard-solved')) $('pv-hard-solved').textContent = hardSolved;

  const hardSolvedProblems = problems.filter(p => p.solved && p.difficulty?.toLowerCase() === 'hard');
  const hardListContainer = $('pv-hardest-list');
  if (hardListContainer) {
    if (hardSolvedProblems.length === 0) {
      hardListContainer.innerHTML = `<span style="color:var(--muted);font-size:12.5px">No Hard difficulty problems solved yet. Keep grinding! 🔥</span>`;
    } else {
      hardListContainer.innerHTML = hardSolvedProblems.map(p => `
        <a href="${p.url}" target="_blank" rel="noopener" class="hard-problem-chip">
          #${p.problemNo} ${escHtml(p.title)} <span class="link-icon">${getIcon('external')}</span>
        </a>
      `).join('');
    }
  }

  renderActivityHeatmap();
  $('profile-view-modal-overlay').classList.add('open');
}

function closeProfileViewModal() {
  $('profile-view-modal-overlay').classList.remove('open');
}

function renderActivityHeatmap() {
  const grid = $('heatmap-grid');
  if (!grid) return;

  const dateCounts = {};
  problems.forEach(p => {
    if (p.solved && p.dateSolved) {
      const dateStr = p.dateSolved.slice(0, 10);
      dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    }
  });

  const today = new Date();
  const days = [];
  let activeDaysCount = 0;

  for (let i = 363; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = dateCounts[dateStr] || 0;
    if (count > 0) activeDaysCount++;

    let level = 0;
    if (count === 1) level = 1;
    else if (count === 2) level = 2;
    else if (count === 3) level = 3;
    else if (count >= 4) level = 4;

    days.push({ dateStr, count, level });
  }

  if ($('pv-active-days')) {
    $('pv-active-days').textContent = `${activeDaysCount} active day${activeDaysCount !== 1 ? 's' : ''} in past year`;
  }

  grid.innerHTML = days.map(d => `
    <div class="heatmap-square level-${d.level}" title="${d.count} problem${d.count !== 1 ? 's' : ''} solved on ${d.dateStr}"></div>
  `).join('');
}

function openProfileModal() {
  $('p-username').value = userProfile.username || '';
  $('p-avatar-url').value = userProfile.avatarUrl || '';

  document.querySelectorAll('.avatar-option').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.avatar === (userProfile.avatarPreset || 'ninja'));
  });

  $('profile-modal-overlay').classList.add('open');
}

function closeProfileModal() {
  $('profile-modal-overlay').classList.remove('open');
}

function saveProfileModal() {
  const username = $('p-username').value.trim() || 'Coder';
  const avatarUrl = $('p-avatar-url').value.trim();
  
  let selectedPreset = userProfile.avatarPreset || 'ninja';
  document.querySelectorAll('.avatar-option').forEach(btn => {
    if (btn.classList.contains('selected')) {
      selectedPreset = btn.dataset.avatar;
    }
  });

  userProfile = {
    username,
    avatarType: avatarUrl ? 'custom' : 'preset',
    avatarPreset: selectedPreset,
    avatarUrl
  };

  saveUserProfile(userProfile);
  renderUserProfile();
  closeProfileModal();
  showToast(`Profile updated! Hello, ${username}! ✨`, 'success');
}

// ── Render ─────────────────────────────────────────────────────
function render() {
  renderStats();
  renderSidebar();
  renderToolbar();
  renderProblems();
}

function clearSkeleton(el) {
  if (!el) return;
  el.classList.remove('skeleton', 'skeleton-text-sm', 'skeleton-text-md', 'skeleton-text-lg', 'skeleton-avatar', 'skeleton-avatar-lg', 'skeleton-stat');
}

function renderStats() {
  const stats = getStats(problems);
  const pct = stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0;

  const map = {
    'stat-total': stats.total,
    'stat-solved': stats.solved,
    'stat-first-try': stats.firstTry,
    'stat-hole-in-one': stats.holeInOne,
    'stat-competent': stats.competent,
    'stat-easy': `${stats.easySolved}/${stats.easy}`,
    'stat-medium': `${stats.mediumSolved}/${stats.medium}`,
    'stat-hard': `${stats.hardSolved}/${stats.hard}`
  };

  Object.keys(map).forEach(id => {
    const el = $(id);
    if (el) {
      el.textContent = map[id];
      clearSkeleton(el);
    }
  });

  if ($('progress-fill')) $('progress-fill').style.width = pct + '%';
  if ($('progress-text')) $('progress-text').innerHTML = `<strong>${pct}%</strong> complete`;
}

function renderSidebar() {
  const counts = getCategoryCounts(problems);
  const stats = getStats(problems);

  document.querySelectorAll('[data-nav]').forEach(el => {
    const key = el.dataset.nav;
    let count = 0;
    if (key === 'all') count = problems.length;
    else if (key === 'solved') count = stats.solved;
    else if (key === 'unsolved') count = problems.length - stats.solved;
    else if (key === 'first-try') count = stats.firstTry;
    else if (key === 'not-first-try') count = problems.filter(p => p.solvedFirstTime === 'N').length;
    else if (key === 'hole-in-one') count = stats.holeInOne;
    else if (key === 'competent') count = stats.competent;
    else if (key === 'recent') count = Math.min(20, stats.solved);
    else count = counts[key] || 0;

    const badge = el.querySelector('.nav-count');
    if (badge) badge.textContent = count;

    el.classList.toggle('active', key === state.activeNav);
  });
}

function renderToolbar() {
  document.querySelectorAll('[data-diff]').forEach(el => {
    el.classList.toggle('active', el.dataset.diff === state.diffFilter);
  });

  document.querySelectorAll('[data-firsttry]').forEach(el => {
    el.classList.toggle('active', el.dataset.firsttry === state.firstTryFilter);
  });

  document.querySelectorAll('[data-holeinone]').forEach(el => {
    el.classList.toggle('active', el.dataset.holeinone === state.holeInOneFilter);
  });

  document.querySelectorAll('[data-sort]').forEach(el => {
    const isActive = el.dataset.sort === state.sortField;
    el.classList.toggle('sorted', isActive);
    const arrow = el.querySelector('.sort-arrow');
    if (arrow) arrow.textContent = isActive ? (state.sortDir === 'asc' ? '↑' : '↓') : '↕';
  });

  document.querySelectorAll('[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === state.view);
  });
}

function renderProblems() {
  const filtered = filterProblems(problems, state);

  if (state.view === 'table') {
    renderTable(filtered);
    $('table-wrap').style.display = 'block';
    $('cards-grid').style.display = 'none';
  } else {
    renderCards(filtered);
    $('table-wrap').style.display = 'none';
    $('cards-grid').style.display = 'grid';
  }

  $('result-count').textContent = `${filtered.length} problem${filtered.length !== 1 ? 's' : ''}`;
}

function renderTable(filtered) {
  const tbody = $('problems-tbody');
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr class="no-results-row"><td colspan="10">
      <div style="font-size:32px;margin-bottom:10px;opacity:0.3">${getIcon('search')}</div>
      <div>No problems match your filters</div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((p, i) => `
    <tr data-id="${p.id}" style="animation-delay:${Math.min(i * 0.012, 0.3)}s">
      <td class="cell-num">#${p.problemNo}</td>
      <td class="cell-title">
        <div style="display:flex;align-items:center;gap:8px">
          <button class="solve-toggle ${p.solved ? 'solved' : ''}" data-id="${p.id}" title="${p.solved ? 'Mark unsolved' : 'Mark solved'}">
            ${p.solved ? getIcon('check') : ''}
          </button>
          <a href="${p.url}" target="_blank" rel="noopener" title="Open on LeetCode">
            ${escHtml(p.title)} <span class="link-icon">${getIcon('external')}</span>
          </a>
        </div>
      </td>
      <td><span class="badge badge-${p.difficulty?.toLowerCase()}">${p.difficulty || '—'}</span></td>
      <td><span class="badge badge-category">${escHtml(p.category)}</span></td>
      <td>
        ${p.dateSolved
          ? `<span class="date-cell">${p.dateSolved}</span>`
          : `<span class="status-dot unsolved">Unsolved</span>`}
      </td>
      <td>
        ${p.solvedFirstTime === 'Y'
          ? `<span class="badge first-try-badge first-try-y"><span class="pill-icon">${getIcon('check')}</span> Yes</span>`
          : p.solvedFirstTime === 'N'
          ? `<span class="badge first-try-badge first-try-n"><span class="pill-icon">${getIcon('cross')}</span> No</span>`
          : `<span class="first-try-na">—</span>`}
      </td>
      <td>
        ${p.holeInOne === 'Y'
          ? `<span class="badge first-try-badge first-try-y"><span class="pill-icon">${getIcon('check')}</span> Yes</span>`
          : p.holeInOne === 'N'
          ? `<span class="badge first-try-badge first-try-n"><span class="pill-icon">${getIcon('cross')}</span> No</span>`
          : `<span class="first-try-na">—</span>`}
      </td>
      <td>
        ${p.solvedSub20 === 'Y'
          ? `<span class="badge first-try-badge first-try-y"><span class="pill-icon">${getIcon('check')}</span> Yes</span>`
          : p.solvedSub20 === 'N'
          ? `<span class="badge first-try-badge first-try-n"><span class="pill-icon">${getIcon('cross')}</span> No</span>`
          : `<span class="first-try-na">—</span>`}
      </td>
      <td>
        <span class="competent-star ${p.isCompetent === 'Y' ? 'active' : ''}" data-id="${p.id}" title="Toggle competent">
          ${p.isCompetent === 'Y' ? getIcon('star-fill') : getIcon('star-outline')}
        </span>
      </td>
      <td class="notes-cell" title="${escHtml(p.notes)}">${escHtml(p.notes) || '<span style="color:var(--border-light)">—</span>'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon edit" data-id="${p.id}" title="Edit">${getIcon('edit')}</button>
          <button class="btn-icon delete" data-id="${p.id}" title="Delete">${getIcon('delete')}</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.solve-toggle').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); toggleSolved(+btn.dataset.id); });
  });
  tbody.querySelectorAll('.competent-star').forEach(el => {
    el.addEventListener('click', () => toggleCompetent(+el.dataset.id));
  });
  tbody.querySelectorAll('.btn-icon.edit').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openEditModal(+btn.dataset.id); });
  });
  tbody.querySelectorAll('.btn-icon.delete').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); deleteProblem(+btn.dataset.id); });
  });
}

function renderCards(filtered) {
  const grid = $('cards-grid');
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">${getIcon('search')}</div><p>No problems match your filters</p></div>`;
    return;
  }
  grid.innerHTML = filtered.map((p, i) => `
    <div class="problem-card ${p.solved ? 'solved-card' : ''}" style="animation-delay:${Math.min(i*0.015, 0.3)}s">
      <div class="card-header">
        <div>
          <div class="card-num">#${p.problemNo}</div>
          <div class="card-title">${escHtml(p.title)}</div>
        </div>
        <button class="solve-toggle ${p.solved ? 'solved' : ''}" data-id="${p.id}" title="${p.solved ? 'Mark unsolved' : 'Mark solved'}">
          ${p.solved ? getIcon('check') : ''}
        </button>
      </div>
      <div class="card-meta">
        <span class="badge badge-${p.difficulty?.toLowerCase()}">${p.difficulty || '—'}</span>
        <span class="badge badge-category">${escHtml(p.category)}</span>
        ${p.solvedFirstTime === 'Y' ? `<span class="badge first-try-badge first-try-y"><span class="pill-icon">${getIcon('check')}</span> 1st Try</span>` :
          p.solvedFirstTime === 'N' ? `<span class="badge first-try-badge first-try-n"><span class="pill-icon">${getIcon('cross')}</span> Not 1st</span>` : ''}
        ${p.holeInOne === 'Y' ? `<span class="badge first-try-badge first-try-y"><span class="pill-icon">${getIcon('check')}</span> ⛳ Hole in 1</span>` :
          p.holeInOne === 'N' ? `<span class="badge first-try-badge first-try-n"><span class="pill-icon">${getIcon('cross')}</span> Not H-in-1</span>` : ''}
        ${p.solvedSub20 === 'Y' ? `<span class="badge first-try-badge first-try-y"><span class="pill-icon">${getIcon('check')}</span> Sub 20</span>` :
          p.solvedSub20 === 'N' ? `<span class="badge first-try-badge first-try-n"><span class="pill-icon">${getIcon('cross')}</span> > 20m</span>` : ''}
      </div>
      <div class="card-footer">
        <span class="card-date">${p.dateSolved || 'Not solved'}</span>
        <div class="card-actions">
          <a href="${p.url}" target="_blank" rel="noopener" class="btn btn-secondary" style="padding:4px 10px;font-size:11px">${getIcon('external')} LC</a>
          <button class="btn btn-secondary edit-card-btn" data-id="${p.id}" style="padding:4px 10px;font-size:11px">${getIcon('edit')}</button>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.solve-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleSolved(+btn.dataset.id));
  });
  grid.querySelectorAll('.edit-card-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(+btn.dataset.id));
  });
}

// ── Problem Actions ────────────────────────────────────────────
function toggleSolved(id) {
  const p = problems.find(x => x.id === id);
  if (!p) return;
  const wasSolved = p.solved;
  p.solved = !p.solved;
  if (p.solved && !p.dateSolved) {
    p.dateSolved = new Date().toISOString().slice(0, 10);
  } else if (!p.solved) {
    p.dateSolved = '';
    p.solvedFirstTime = '';
    p.holeInOne = '';
    p.solvedSub20 = '';
  }
  persist();
  render();

  if (!wasSolved && p.solved) {
    fireCelebrationConfetti();
    showToast(`🎉 Great job! Marked "${p.title}" as solved! ✨`, 'success');
  } else {
    showToast(`Marked as unsolved`, 'info');
  }
}

function toggleCompetent(id) {
  const p = problems.find(x => x.id === id);
  if (!p) return;
  p.isCompetent = p.isCompetent === 'Y' ? '' : 'Y';
  persist();
  renderProblems();
  renderSidebar();
}

function deleteProblem(id) {
  const p = problems.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Delete "${p.title}"?`)) return;
  problems = problems.filter(x => x.id !== id);
  persist();
  render();
  showToast(`Deleted "${p.title}"`, 'error');
}

// ── Problem Modal ──────────────────────────────────────────────
function openAddModal() {
  state.editingId = null;
  $('modal-title').textContent = 'Add New Problem';
  clearForm();
  openModal();
}

function openEditModal(id) {
  const p = problems.find(x => x.id === id);
  if (!p) return;
  state.editingId = id;
  $('modal-title').textContent = 'Edit Problem';
  populateForm(p);
  openModal();
}

function populateForm(p) {
  $('f-problemNo').value = p.problemNo || '';
  $('f-title').value = p.title || '';
  $('f-url').value = p.url || '';
  $('f-category').value = p.category || '';
  $('f-difficulty').value = p.difficulty || '';
  $('f-dateSolved').value = p.dateSolved || '';
  $('f-notes').value = p.notes || '';
  setToggle('f-firstTry', p.solvedFirstTime || '');
  setToggle('f-holeInOne', p.holeInOne || '');
  setToggle('f-sub20', p.solvedSub20 || '');
  setToggle('f-competent', p.isCompetent || '');
}

function clearForm() {
  ['f-problemNo','f-title','f-url','f-dateSolved','f-notes'].forEach(id => { $(id).value = ''; });
  $('f-category').value = '';
  $('f-difficulty').value = '';
  setToggle('f-firstTry', '');
  setToggle('f-holeInOne', '');
  setToggle('f-sub20', '');
  setToggle('f-competent', '');
}

function setToggle(name, value) {
  document.querySelectorAll(`[data-toggle="${name}"]`).forEach(btn => {
    btn.classList.remove('active-yes', 'active-no');
    if (btn.dataset.value === 'Y' && value === 'Y') btn.classList.add('active-yes');
    if (btn.dataset.value === 'N' && value === 'N') btn.classList.add('active-no');
  });
}

function getToggleValue(name) {
  let val = '';
  document.querySelectorAll(`[data-toggle="${name}"]`).forEach(btn => {
    if (btn.classList.contains('active-yes') || btn.classList.contains('active-no')) {
      val = btn.dataset.value;
    }
  });
  return val;
}

function openModal() {
  $('modal-overlay').classList.add('open');
  setTimeout(() => $('f-problemNo').focus(), 200);
}
function closeModal() {
  $('modal-overlay').classList.remove('open');
  state.editingId = null;
}

function slugifyTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseLeetCodeSlug(url) {
  if (!url) return '';
  const raw = String(url).trim();

  const fullUrlMatch = raw.match(/leetcode\.com\/problems\/([^/?#]+)/i);
  if (fullUrlMatch) return fullUrlMatch[1].toLowerCase();

  const pathMatch = raw.match(/^\/?problems\/([^/?#]+)/i);
  if (pathMatch) return pathMatch[1].toLowerCase();

  return '';
}

function titleFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function saveForm() {
  const problemNo = $('f-problemNo').value.trim();
  const urlInput = $('f-url').value.trim();
  let title = $('f-title').value.trim();

  if (!title && urlInput) {
    const slugFromUrl = parseLeetCodeSlug(urlInput);
    if (slugFromUrl) {
      title = titleFromSlug(slugFromUrl);
      $('f-title').value = title;
    }
  }

  if (!title) { showToast('Title is required', 'error'); return; }

  let url = urlInput;
  if (!url && title) {
    const slug = slugifyTitle(title);
    url = `https://leetcode.com/problems/${slug}/`;
  }

  const dateSolved = $('f-dateSolved').value.trim();
  const isSolved = !!dateSolved;

  const data = {
    problemNo,
    title,
    url,
    category: $('f-category').value,
    difficulty: $('f-difficulty').value,
    dateSolved,
    solvedFirstTime: getToggleValue('f-firstTry'),
    holeInOne: getToggleValue('f-holeInOne'),
    solvedSub20: getToggleValue('f-sub20'),
    isCompetent: getToggleValue('f-competent'),
    notes: $('f-notes').value.trim(),
    solved: isSolved
  };

  let wasSolvedBefore = false;
  if (state.editingId) {
    const idx = problems.findIndex(x => x.id === state.editingId);
    if (idx >= 0) {
      wasSolvedBefore = problems[idx].solved;
      problems[idx] = { ...problems[idx], ...data };
    }
    showToast(`Updated "${title}"`, 'success');
  } else {
    problems.push({ id: nextId(problems), ...data });
    showToast(`Added "${title}"`, 'success');
  }

  persist();
  render();
  closeModal();

  if (isSolved && !wasSolvedBefore) {
    fireCelebrationConfetti();
  }
}

function autoFillUrl() {
  const title = $('f-title').value.trim();
  const urlField = $('f-url');
  if (title && !urlField.value) {
    const slug = slugifyTitle(title);
    urlField.value = `https://leetcode.com/problems/${slug}/`;
  }
}

function autoFillTitleFromUrl() {
  const titleField = $('f-title');
  const url = $('f-url').value.trim();
  if (!url || titleField.value.trim()) return;

  const slug = parseLeetCodeSlug(url);
  if (!slug) return;

  titleField.value = titleFromSlug(slug);
}

// ── File Import (JSON / CSV) ───────────────────────────────────
function handleImport(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    let parsed = [];
    if (file.name.toLowerCase().endsWith('.json') || text.trim().startsWith('[') || text.trim().startsWith('{')) {
      parsed = parseJSON(text);
    } else {
      parsed = parseCSV(text);
    }

    if (parsed.length === 0) { showToast('No valid data found in file', 'error'); return; }
    if (confirm(`Import ${parsed.length} problems? This will merge with existing data.`)) {
      const existingNos = new Set(problems.map(p => p.problemNo + '|' + p.category));
      let added = 0;
      for (const p of parsed) {
        const key = p.problemNo + '|' + p.category;
        if (!existingNos.has(key)) {
          problems.push({ ...p, id: nextId(problems) });
          added++;
        } else {
          const idx = problems.findIndex(ex => (ex.problemNo + '|' + ex.category) === key);
          if (idx >= 0) {
            problems[idx] = { ...problems[idx], ...p };
          }
        }
      }
      persist();
      render();
      showToast(`Imported ${parsed.length} problems!`, 'success');
    }
  };
  reader.readAsText(file);
}

// ── Persist & Settings ─────────────────────────────────────────
function persist() {
  saveProblems(problems);
  saveSettings({
    sortField: state.sortField,
    sortDir: state.sortDir,
    view: state.view
  });
}

// ── Toast ──────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const iconMap = {
    success: getIcon('check'),
    error: getIcon('cross'),
    info: getIcon('info')
  };
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${iconMap[type] || getIcon('info')}</span><span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ── Build Sidebar Category nav items ──────────────────────────
function buildCategoryNav() {
  const container = $('category-nav');
  const counts = getCategoryCounts(problems);
  const categories = Object.keys(counts).sort();
  container.innerHTML = categories.map(cat => `
    <div class="nav-item" data-nav="${escHtml(cat)}">
      <span class="nav-icon">${getIcon('folder')}</span>
      <span>${escHtml(cat)}</span>
      <span class="nav-count">${counts[cat] || 0}</span>
    </div>
  `).join('');
  container.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      state.activeNav = el.dataset.nav;
      render();
    });
  });
}

// ── Bind Events ───────────────────────────────────────────────
function bindEvents() {
  // Search
  $('search-input').addEventListener('input', e => {
    state.search = e.target.value;
    renderProblems();
  });

  // Nav items (smart filters)
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      state.activeNav = el.dataset.nav;
      render();
    });
  });

  // Diff filter pills
  document.querySelectorAll('[data-diff]').forEach(el => {
    el.addEventListener('click', () => {
      state.diffFilter = el.dataset.diff;
      renderProblems();
      renderToolbar();
    });
  });

  // First try pills
  document.querySelectorAll('[data-firsttry]').forEach(el => {
    el.addEventListener('click', () => {
      state.firstTryFilter = state.firstTryFilter === el.dataset.firsttry ? '' : el.dataset.firsttry;
      renderProblems();
      renderToolbar();
    });
  });

  // Hole in 1 pills
  document.querySelectorAll('[data-holeinone]').forEach(el => {
    el.addEventListener('click', () => {
      state.holeInOneFilter = state.holeInOneFilter === el.dataset.holeinone ? '' : el.dataset.holeinone;
      renderProblems();
      renderToolbar();
    });
  });

  // Sort headers
  document.querySelectorAll('[data-sort]').forEach(el => {
    el.addEventListener('click', () => {
      if (state.sortField === el.dataset.sort) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortField = el.dataset.sort;
        state.sortDir = 'asc';
      }
      persist();
      renderProblems();
      renderToolbar();
    });
  });

  // View toggle
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', () => {
      state.view = el.dataset.view;
      persist();
      renderProblems();
      renderToolbar();
    });
  });

  // Toggle buttons (modal)
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.toggle;
      const value = btn.dataset.value;
      const current = getToggleValue(name);
      setToggle(name, current === value ? '' : value);
    });
  });

  // Modal open/close
  $('btn-add').addEventListener('click', openAddModal);
  $('modal-close').addEventListener('click', closeModal);
  $('btn-cancel').addEventListener('click', closeModal);
  $('btn-save').addEventListener('click', saveForm);
  $('modal-overlay').addEventListener('click', e => {
    if (e.target === $('modal-overlay')) closeModal();
  });

  // Profile header dropdown toggle
  $('btn-profile').addEventListener('click', e => {
    e.stopPropagation();
    $('profile-dropdown-menu').classList.toggle('show');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.profile-menu-wrap')) {
      $('profile-dropdown-menu')?.classList.remove('show');
    }
  });

  if ($('menu-view-profile')) {
    $('menu-view-profile').addEventListener('click', () => {
      $('profile-dropdown-menu')?.classList.remove('show');
      openProfileViewModal();
    });
  }

  if ($('menu-edit-profile')) {
    $('menu-edit-profile').addEventListener('click', () => {
      $('profile-dropdown-menu')?.classList.remove('show');
      openProfileModal();
    });
  }

  // User Profile Edit Modal events
  if ($('profile-modal-close')) $('profile-modal-close').addEventListener('click', closeProfileModal);
  if ($('btn-profile-cancel')) $('btn-profile-cancel').addEventListener('click', closeProfileModal);
  if ($('btn-profile-save')) $('btn-profile-save').addEventListener('click', saveProfileModal);
  $('profile-modal-overlay').addEventListener('click', e => {
    if (e.target === $('profile-modal-overlay')) closeProfileModal();
  });

  // User Profile View Modal events
  if ($('profile-view-close')) $('profile-view-close').addEventListener('click', closeProfileViewModal);
  if ($('btn-profile-view-done')) $('btn-profile-view-done').addEventListener('click', closeProfileViewModal);
  if ($('btn-profile-view-edit')) {
    $('btn-profile-view-edit').addEventListener('click', () => {
      closeProfileViewModal();
      openProfileModal();
    });
  }
  if ($('profile-view-modal-overlay')) {
    $('profile-view-modal-overlay').addEventListener('click', e => {
      if (e.target === $('profile-view-modal-overlay')) closeProfileViewModal();
    });
  }

  // Avatar grid option click
  document.querySelectorAll('.avatar-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Auto-fill URL from title
  $('f-title').addEventListener('blur', autoFillUrl);

  // Auto-fill title from URL
  $('f-url').addEventListener('blur', autoFillTitleFromUrl);
  $('f-url').addEventListener('paste', () => {
    setTimeout(autoFillTitleFromUrl, 0);
  });

  // Export JSON
  if ($('btn-export-json')) {
    $('btn-export-json').addEventListener('click', () => {
      exportToJSON(problems);
      showToast('Exported data.json!', 'success');
    });
  }

  // Export CSV
  $('btn-export').addEventListener('click', () => {
    exportToCSV(problems);
    showToast('CSV exported!', 'success');
  });

  // Import button
  $('btn-import').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleImport(file);
    e.target.value = '';
  });

  // Keyboard shortcut: N = new problem
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeProfileModal();
      closeProfileViewModal();
    }
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      openAddModal();
    }
  });

  // Build category nav
  buildCategoryNav();
}

// ── Utility ────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Start ──────────────────────────────────────────────────────
init();
