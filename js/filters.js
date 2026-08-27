/**
 * filters.js — filtering and sorting logic
 */

// ── Filter Problems ────────────────────────────────────────────
export function filterProblems(problems, state) {
  const { search, activeNav, diffFilter, sortField, sortDir, firstTryFilter, holeInOneFilter } = state;

  let result = [...problems];

  // Nav / category filter
  if (activeNav === 'solved') {
    result = result.filter(p => p.solved);
  } else if (activeNav === 'unsolved') {
    result = result.filter(p => !p.solved);
  } else if (activeNav === 'first-try') {
    result = result.filter(p => p.solvedFirstTime === 'Y');
  } else if (activeNav === 'not-first-try') {
    result = result.filter(p => p.solvedFirstTime === 'N');
  } else if (activeNav === 'hole-in-one') {
    result = result.filter(p => p.holeInOne === 'Y');
  } else if (activeNav === 'competent') {
    result = result.filter(p => p.isCompetent === 'Y');
  } else if (activeNav === 'recent') {
    result = result.filter(p => p.dateSolved).sort((a, b) => {
      return new Date(b.dateSolved) - new Date(a.dateSolved);
    }).slice(0, 20);
    return result; // already sorted by date
  } else if (activeNav !== 'all') {
    // It's a category
    result = result.filter(p => p.category === activeNav);
  }

  // Difficulty filter
  if (diffFilter && diffFilter !== 'all') {
    result = result.filter(p => p.difficulty?.toLowerCase() === diffFilter.toLowerCase());
  }

  // First try filter (toolbar pill)
  if (firstTryFilter === 'Y') {
    result = result.filter(p => p.solvedFirstTime === 'Y');
  } else if (firstTryFilter === 'N') {
    result = result.filter(p => p.solvedFirstTime === 'N');
  }

  // Hole in One filter (toolbar pill)
  if (holeInOneFilter === 'Y') {
    result = result.filter(p => p.holeInOne === 'Y');
  } else if (holeInOneFilter === 'N') {
    result = result.filter(p => p.holeInOne === 'N');
  }

  // Search
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.problemNo?.toString().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.notes?.toLowerCase().includes(q)
    );
  }

  // Sort
  result.sort((a, b) => {
    let av = a[sortField] ?? '';
    let bv = b[sortField] ?? '';

    if (sortField === 'problemNo') {
      av = parseInt(av) || 0;
      bv = parseInt(bv) || 0;
    } else if (sortField === 'dateSolved') {
      av = av ? new Date(av).getTime() : 0;
      bv = bv ? new Date(bv).getTime() : 0;
    } else if (sortField === 'difficulty') {
      const order = { easy: 1, medium: 2, hard: 3 };
      av = order[av?.toLowerCase()] ?? 99;
      bv = order[bv?.toLowerCase()] ?? 99;
    } else {
      av = av.toString().toLowerCase();
      bv = bv.toString().toLowerCase();
    }

    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return result;
}

// ── Get categories with counts ─────────────────────────────────
export function getCategoryCounts(problems) {
  const counts = {};
  for (const p of problems) {
    counts[p.category] = (counts[p.category] || 0) + 1;
  }
  return counts;
}

// ── Get stats ─────────────────────────────────────────────────
export function getStats(problems) {
  const total = problems.length;
  const solved = problems.filter(p => p.solved).length;
  const firstTry = problems.filter(p => p.solvedFirstTime === 'Y').length;
  const holeInOne = problems.filter(p => p.holeInOne === 'Y').length;
  const competent = problems.filter(p => p.isCompetent === 'Y').length;
  const easy = problems.filter(p => p.difficulty?.toLowerCase() === 'easy').length;
  const medium = problems.filter(p => p.difficulty?.toLowerCase() === 'medium').length;
  const hard = problems.filter(p => p.difficulty?.toLowerCase() === 'hard').length;
  const easySolved = problems.filter(p => p.difficulty?.toLowerCase() === 'easy' && p.solved).length;
  const mediumSolved = problems.filter(p => p.difficulty?.toLowerCase() === 'medium' && p.solved).length;
  const hardSolved = problems.filter(p => p.difficulty?.toLowerCase() === 'hard' && p.solved).length;
  return { total, solved, firstTry, holeInOne, competent, easy, medium, hard, easySolved, mediumSolved, hardSolved };
}
