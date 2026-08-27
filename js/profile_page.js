/**
 * profile_page.js — Full Width Activity Heatmap Graph & Recently Solved Section
 */

import { loadProblems, loadUserProfile, saveUserProfile } from './data.js';
import { getStats } from './filters.js';
import { getIcon } from './icons.js';
import { getAchievements } from './achievements.js';

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
  "Stay sharp,"
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let problems = [];
let userProfile = loadUserProfile();
let currentGreeting = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
let selectedYear = '2026';

const $ = id => document.getElementById(id);
const escHtml = str => String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function formatLocalDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

async function init() {
  const stored = loadProblems();
  problems = stored || [];
  initYearSelect();
  renderStaticIcons();
  renderProfile();
  bindEvents();
  dismissFullPageSkeleton();
}

function initYearSelect() {
  const select = $('heatmap-year-select');
  if (!select) return;

  const currentYear = new Date().getFullYear();
  const yearsSet = new Set([currentYear, currentYear - 1]);

  problems.forEach(p => {
    if (p.solved && p.dateSolved) {
      const y = parseInt(p.dateSolved.slice(0, 4));
      if (y > 2000 && y <= currentYear + 1) yearsSet.add(y);
    }
  });

  const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
  selectedYear = String(sortedYears[0] || currentYear);

  select.innerHTML = [
    ...sortedYears.map(y => `<option value="${y}">${y}</option>`),
    `<option value="last12">Last 12 Months</option>`
  ].join('');

  select.value = selectedYear;

  select.addEventListener('change', e => {
    selectedYear = e.target.value;
    renderActivityHeatmap();
  });
}

function renderStaticIcons() {
  if ($('icon-back')) $('icon-back').innerHTML = getIcon('cross');
  if ($('modal-close')) $('modal-close').innerHTML = getIcon('close');
  if ($('profile-modal-close')) $('profile-modal-close').innerHTML = getIcon('close');
  if ($('menu-icon-user')) $('menu-icon-user').innerHTML = getIcon('user');
  if ($('menu-icon-settings')) $('menu-icon-settings').innerHTML = getIcon('edit');
  if ($('icon-recent-sparkles')) $('icon-recent-sparkles').innerHTML = getIcon('sparkles');
}

function clearSkeleton(el) {
  if (!el) return;
  el.classList.remove('skeleton', 'skeleton-text-sm', 'skeleton-text-md', 'skeleton-text-lg', 'skeleton-avatar', 'skeleton-avatar-lg', 'skeleton-stat');
}

function renderProfile() {
  if ($('welcome-prefix')) {
    $('welcome-prefix').textContent = currentGreeting;
    clearSkeleton($('welcome-prefix'));
  }
  if ($('header-user-name')) {
    $('header-user-name').textContent = userProfile.username || 'Coder';
    clearSkeleton($('header-user-name'));
  }
  if ($('profile-btn-name')) {
    $('profile-btn-name').textContent = userProfile.username || 'Coder';
    clearSkeleton($('profile-btn-name'));
  }

  const avatarHeader = $('header-avatar-badge');
  const avatarHero = $('pv-avatar-badge');

  const avatarSymbol = userProfile.avatarType === 'custom' && userProfile.avatarUrl
    ? `<img src="${escHtml(userProfile.avatarUrl)}" alt="Avatar" onerror="this.onerror=null;this.parentElement.textContent='👤'" />`
    : (AVATAR_PRESETS[userProfile.avatarPreset] || '🥷');

  if (avatarHeader) {
    clearSkeleton(avatarHeader);
    avatarHeader.innerHTML = typeof avatarSymbol === 'string' && avatarSymbol.startsWith('<img') ? avatarSymbol : avatarSymbol;
  }
  if (avatarHero) {
    clearSkeleton(avatarHero);
    avatarHero.innerHTML = typeof avatarSymbol === 'string' && avatarSymbol.startsWith('<img') ? avatarSymbol : avatarSymbol;
  }

  if ($('pv-username')) {
    $('pv-username').textContent = userProfile.username || 'Coder';
    clearSkeleton($('pv-username'));
  }

  // Stats
  const stats = getStats(problems);
  const totalSolved = stats.solved;
  const firstTryRate = totalSolved > 0 ? Math.round((stats.firstTry / totalSolved) * 100) : 0;
  const sub20Count = problems.filter(p => p.solved && p.solvedSub20 === 'Y').length;

  const statMap = {
    'pv-total-solved': totalSolved,
    'pv-first-try-rate': `${firstTryRate}%`,
    'pv-sub20-count': sub20Count,
    'pv-hard-solved': stats.hardSolved
  };

  Object.keys(statMap).forEach(id => {
    const el = $(id);
    if (el) {
      el.textContent = statMap[id];
      clearSkeleton(el);
    }
  });

  renderAchievements(stats);
  renderActivityHeatmap();
  renderRecentlySolved();
  renderHardestProblems();
}

function renderAchievements(stats) {
  const achievements = getAchievements(problems, stats);
  const unlocked = achievements.filter(a => a.unlocked);

  if ($('pv-badge-count')) {
    $('pv-badge-count').textContent = `${unlocked.length} / ${achievements.length} Unlocked`;
  }

  // Top 3 unlocked badges in Hero Card
  const top3 = unlocked.slice(0, 3);
  const topContainer = $('pv-top-badges');
  if (topContainer) {
    if (top3.length === 0) {
      topContainer.innerHTML = `<span style="color:var(--muted);font-size:12px">Solve problems to unlock your top badges! 🚀</span>`;
    } else {
      topContainer.innerHTML = top3.map(b => `
        <div class="top-badge-chip" title="${escHtml(b.desc)}">
          <span class="tb-icon">${b.icon}</span>
          <span class="tb-name">${escHtml(b.name)}</span>
        </div>
      `).join('');
    }
  }

  // Full Achievements Grid
  const grid = $('achievements-grid');
  if (grid) {
    grid.innerHTML = achievements.map(a => `
      <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}">
        <div class="achieve-icon">${a.icon}</div>
        <div class="achieve-details">
          <div class="achieve-title">${escHtml(a.name)}</div>
          <div class="achieve-desc">${escHtml(a.desc)}</div>
        </div>
        <div class="achieve-status">${a.unlocked ? '✓ Unlocked' : 'Locked'}</div>
      </div>
    `).join('');
  }
}

// ── GitHub-Replica Activity Heatmap Matrix ─────────────────────
function renderActivityHeatmap() {
  const matrixEl = $('heatmap-grid-matrix');
  const monthsRowEl = $('heatmap-months-row');
  const titleEl = $('heatmap-contrib-title');
  if (!matrixEl || !monthsRowEl) return;

  const dateCounts = {};
  problems.forEach(p => {
    if (p.solved && p.dateSolved) {
      const dateStr = p.dateSolved.slice(0, 10);
      dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    }
  });

  let startDate, endDate;

  if (selectedYear === 'last12') {
    const today = new Date();
    endDate = new Date(today);
    startDate = new Date(today);
    startDate.setFullYear(today.getFullYear() - 1);
  } else {
    const yr = parseInt(selectedYear) || new Date().getFullYear();
    startDate = new Date(yr, 0, 1);
    endDate = new Date(yr, 11, 31);
  }

  const startSunday = new Date(startDate);
  startSunday.setDate(startDate.getDate() - startDate.getDay());

  const endSaturday = new Date(endDate);
  endSaturday.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.round((endSaturday - startSunday) / dayMs) + 1;
  const numWeeks = Math.ceil(totalDays / 7);

  let totalPuzzlesInPeriod = 0;
  const squaresMarkup = [];
  const monthLabelsMarkup = [];

  let currentMonth = -1;
  let lastMonthWeekCol = -5;

  for (let w = 0; w < numWeeks; w++) {
    const wednesday = new Date(startSunday.getTime() + (w * 7 + 3) * dayMs);

    if (wednesday >= startDate || w === 0) {
      const m = wednesday < startDate ? startDate.getMonth() : wednesday.getMonth();

      if (m !== currentMonth && (w - lastMonthWeekCol >= 3)) {
        currentMonth = m;
        lastMonthWeekCol = w;
        monthLabelsMarkup.push(`
          <span class="month-lbl" style="grid-column:${w + 1}">${MONTH_NAMES[m]}</span>
        `);
      }
    }

    for (let r = 0; r < 7; r++) {
      const currDate = new Date(startSunday.getTime() + (w * 7 + r) * dayMs);
      const dateStr = formatLocalDateStr(currDate);
      const isWithinBounds = currDate >= startDate && currDate <= endDate;
      const count = isWithinBounds ? (dateCounts[dateStr] || 0) : 0;

      if (isWithinBounds && count > 0) {
        totalPuzzlesInPeriod += count;
      }

      let level = 0;
      if (isWithinBounds && count > 0) {
        if (count === 1) level = 1;
        else if (count === 2) level = 2;
        else if (count === 3) level = 3;
        else level = 4;
      }

      const formattedTitle = `${count} puzzle${count !== 1 ? 's' : ''} solved on ${dateStr}`;
      squaresMarkup.push(`
        <div class="heatmap-square level-${level} ${!isWithinBounds ? 'out-bounds' : ''}" style="grid-row:${r+1};grid-column:${w+1}" title="${formattedTitle}"></div>
      `);
    }
  }

  if (titleEl) {
    const yearLabel = selectedYear === 'last12' ? 'the past 12 months' : selectedYear;
    titleEl.textContent = `${totalPuzzlesInPeriod} puzzle${totalPuzzlesInPeriod !== 1 ? 's' : ''} solved in ${yearLabel}`;
  }

  monthsRowEl.style.display = 'grid';
  monthsRowEl.style.gridTemplateColumns = `repeat(${numWeeks}, 1fr)`;
  monthsRowEl.style.gap = '3px';
  monthsRowEl.innerHTML = monthLabelsMarkup.join('');

  matrixEl.style.gridTemplateColumns = `repeat(${numWeeks}, 1fr)`;
  matrixEl.style.gap = '3px';
  matrixEl.innerHTML = squaresMarkup.join('');
}

function renderRecentlySolved() {
  const container = $('recent-act-list');
  if (!container) return;

  const solvedProblems = problems
    .filter(p => p.solved)
    .sort((a, b) => {
      const da = a.dateSolved || a.dateAdded || '';
      const db = b.dateSolved || b.dateAdded || '';
      return db.localeCompare(da);
    })
    .slice(0, 6);

  if (solvedProblems.length === 0) {
    container.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:16px 0;text-align:center">No recently solved problems yet.</div>`;
    return;
  }

  container.innerHTML = solvedProblems.map(p => {
    const diffClass = (p.difficulty || 'easy').toLowerCase();
    const dateFormatted = p.dateSolved ? p.dateSolved.slice(5) : '';
    return `
      <div class="recent-act-row">
        <div class="rar-left">
          <a href="${p.url}" target="_blank" rel="noopener" class="rar-title">#${p.problemNo} ${escHtml(p.title)}</a>
          <span class="rar-category">${escHtml(p.category || 'General')}</span>
        </div>
        <div class="rar-right">
          <span class="pill diff-${diffClass}">${escHtml(p.difficulty || 'Easy')}</span>
          <span class="rar-date">${dateFormatted}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderHardestProblems() {
  const hardSolvedProblems = problems.filter(p => p.solved && p.difficulty?.toLowerCase() === 'hard');
  const container = $('pv-hardest-list');
  if (!container) return;

  if (hardSolvedProblems.length === 0) {
    container.innerHTML = `<span style="color:var(--muted);font-size:12.5px">No Hard difficulty problems solved yet. Keep grinding! 🔥</span>`;
  } else {
    container.innerHTML = hardSolvedProblems.map(p => `
      <a href="${p.url}" target="_blank" rel="noopener" class="hard-problem-chip">
        #${p.problemNo} ${escHtml(p.title)} <span class="link-icon">${getIcon('external')}</span>
      </a>
    `).join('');
  }
}

// ── Profile Modal Events ──────────────────────────────────────
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
  renderProfile();
  closeProfileModal();
}

function bindEvents() {
  $('btn-profile').addEventListener('click', e => {
    e.stopPropagation();
    $('profile-dropdown-menu').classList.toggle('show');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.profile-menu-wrap')) {
      $('profile-dropdown-menu')?.classList.remove('show');
    }
  });

  if ($('menu-edit-profile')) {
    $('menu-edit-profile').addEventListener('click', () => {
      $('profile-dropdown-menu')?.classList.remove('show');
      openProfileModal();
    });
  }

  if ($('btn-edit-profile-hero')) {
    $('btn-edit-profile-hero').addEventListener('click', openProfileModal);
  }

  if ($('profile-modal-close')) $('profile-modal-close').addEventListener('click', closeProfileModal);
  if ($('btn-profile-cancel')) $('btn-profile-cancel').addEventListener('click', closeProfileModal);
  if ($('btn-profile-save')) $('btn-profile-save').addEventListener('click', saveProfileModal);
  $('profile-modal-overlay').addEventListener('click', e => {
    if (e.target === $('profile-modal-overlay')) closeProfileModal();
  });

  document.querySelectorAll('.avatar-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeProfileModal();
  });
}

init();
