/**
 * data.js — localStorage persistence + CSV import/export
 */

const STORAGE_KEY = 'lc_tracker_problems';
const SETTINGS_KEY = 'lc_tracker_settings';
const USER_PROFILE_KEY = 'lc_tracker_user_profile';
const VERSION_KEY  = 'lc_tracker_version';
const DATA_VERSION = '3';  // bump this whenever data.json is reset

// ── Default settings ──────────────────────────────────────────
const DEFAULT_SETTINGS = {
  sortField: 'problemNo',
  sortDir: 'asc',
  view: 'table',
  lastFilter: 'all'
};

const DEFAULT_PROFILE = {
  username: 'Alex',
  avatarType: 'preset', // 'preset' or 'custom'
  avatarPreset: 'ninja',
  avatarUrl: ''
};

// ── Load / Save ───────────────────────────────────────────────
export function loadProblems() {
  try {
    // If version changed, wipe stale cache so fresh data.json is used
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== DATA_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('Failed to load problems', e); }
  return null;
}

export function saveProblems(problems) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(problems));
  } catch (e) { console.warn('Failed to save problems', e); }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {}
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {}
}

// ── User Profile ──────────────────────────────────────────────
export function loadUserProfile() {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch (e) {}
  return { ...DEFAULT_PROFILE };
}

export function saveUserProfile(profile) {
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {}
}

// ── JSON Export / Import ──────────────────────────────────────
export function exportToJSON(problems) {
  const jsonStr = JSON.stringify(problems, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function parseJSON(text) {
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data;
  } catch (e) { console.warn('Invalid JSON format', e); }
  return [];
}

// ── CSV Export ────────────────────────────────────────────────
export function exportToCSV(problems) {
  const headers = [
    'id', 'problemNo', 'title', 'category', 'difficulty', 'url',
    'dateSolved', 'solvedFirstTime', 'holeInOne', 'solvedSub20', 'isCompetent', 'notes', 'solved'
  ];
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [
    headers.join(','),
    ...problems.map(p => headers.map(h => escape(p[h])).join(','))
  ];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leetcode-tracker-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── CSV Import ────────────────────────────────────────────────
export function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseCSVRow(lines[0]);
  const problems = [];
  let maxId = 0;
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseCSVRow(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => { obj[h.trim()] = (vals[idx] || '').trim(); });
    const id = parseInt(obj.id) || (Date.now() + i);
    maxId = Math.max(maxId, id);
    problems.push({
      id,
      problemNo: obj.problemNo || obj['Problem No'] || '',
      title:     obj.title     || obj['Problem Title'] || '',
      category:  obj.category  || '',
      difficulty: obj.difficulty || '',
      url:       obj.url || '',
      dateSolved: obj.dateSolved || '',
      solvedFirstTime: obj.solvedFirstTime || '',
      holeInOne:   obj.holeInOne || obj['Hole in One'] || obj['Hole In One'] || '',
      solvedSub20: obj.solvedSub20 || obj['Solved Sub 20'] || '',
      isCompetent: obj.isCompetent || '',
      notes:     obj.notes || '',
      solved:    obj.solved === 'true' || obj.solved === 'TRUE' || !!obj.dateSolved
    });
  }
  return problems;
}

function parseCSVRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Generate new ID ───────────────────────────────────────────
export function nextId(problems) {
  return problems.length > 0 ? Math.max(...problems.map(p => p.id)) + 1 : 1;
}
