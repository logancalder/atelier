import type { CodingProblem } from './types';
import type { ProvaProblem } from './prova';

export function safeProblemUrl(value: string | null | undefined) {
  try { const url = new URL(value || ''); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
function urlIdentity(value: string) {
  try {
    const url = new URL(value); const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const slug = url.pathname.match(/^\/problems\/([^/]+)/)?.[1];
    return slug && ['leetcode.com','neetcode.io'].includes(host) ? host + ':' + slug.toLowerCase() : host + url.pathname.replace(/\/$/, '');
  } catch { return ''; }
}
export function problemAliases(problem: ProvaProblem) {
  return [problem.identity, 'prova:' + problem.id, ...problem.codingKeys || [], urlIdentity(problem.url),
    problem.problemNo && problem.site !== 'NC' ? 'lc-number:' + problem.problemNo : ''].filter(Boolean) as string[];
}
function codingAliases(problem: CodingProblem) {
  return [problem.key, urlIdentity(problem.url), problem.leetcodeSlug ? 'leetcode.com:' + problem.leetcodeSlug.toLowerCase() : '',
    problem.leetcodeFrontendId ? 'lc-number:' + problem.leetcodeFrontendId : ''].filter(Boolean);
}
export function problemHref(problem: ProvaProblem) { return '/problems/' + encodeURIComponent(problem.identity || 'prova:' + problem.id); }
export function codingProblemHref(problem: CodingProblem) { return '/problems/' + encodeURIComponent(problem.key); }

/** Join by explicit source identities, never by display title. Pure and idempotent. */
export function mergeProblemLibrary(stored: ProvaProblem[], incoming: CodingProblem[]) {
  const next = stored.map(p => ({ ...p, codingKeys: [...p.codingKeys || []] }));
  let nextId = Math.max(0, ...next.map(p => p.id)) + 1;
  for (const coding of [...incoming].sort((a,b) => a.updatedAt.localeCompare(b.updatedAt) || a.key.localeCompare(b.key))) {
    const aliases = codingAliases(coding);
    const matches=next.flatMap((p,index)=>problemAliases(p).some(alias=>aliases.includes(alias)) ? [index] : []);
    let index=matches[0] ?? -1;
    // A newly discovered LC link can join previously separate NC/LC records.
    for (const duplicateIndex of matches.slice(1).reverse()) {
      const duplicate=next[duplicateIndex], primary=next[index];
      next[index]={...primary, codingKeys:[...new Set([...primary.codingKeys,...problemAliases(duplicate)])],
        mergedLibraryNotes:[...new Set([...primary.mergedLibraryNotes || [],...duplicate.mergedLibraryNotes || [],primary.notes,duplicate.notes].filter(Boolean))],
        solved:primary.solved || duplicate.solved, dateSolved:primary.dateSolved || duplicate.dateSolved,
        category:primary.category || duplicate.category, difficulty:primary.difficulty || duplicate.difficulty};
      next.splice(duplicateIndex,1);
    }
    if (index < 0) {
      index = next.length;
      next.push({ id:nextId++, identity:coding.key, codingKeys:[], problemNo:'', title:coding.title,
        category:'', difficulty:'', url:coding.url, dateSolved:'', solvedFirstTime:'', holeInOne:'', solvedSub20:'',
        isCompetent:'', notes:'', solved:false, solveTime:'', site:coding.key.startsWith('neetcode:') ? 'NC' : 'LC' });
    }
    const current = next[index];
    const date = coding.submissions.filter(s=>s.accepted && Number.isFinite(Date.parse(s.at))).map(s=>s.at).sort()[0]?.slice(0,10) || '';
    const count = coding.submissionCountOverride ?? coding.submissions.length;
    const latest = !current.codingUpdatedAt || coding.updatedAt > current.codingUpdatedAt;
    next[index] = { ...current, identity:current.identity || 'prova:' + current.id,
      codingKeys:[...new Set([...current.codingKeys, ...aliases])],
      problemNo:current.problemNo || coding.leetcodeFrontendId || '', category:current.category || coding.tags?.[0] || '',
      difficulty:current.difficulty || coding.difficulty || '', url:current.url || coding.url,
      solved:current.solved || !!date, dateSolved:current.dateSolved || date,
      ...(latest ? { codingUpdatedAt:coding.updatedAt, notes:coding.notes, solveTime:coding.seconds > 0 ? String(Math.round(coding.seconds / 60 * 100) / 100) : '',
        solvedFirstTime:date ? count === 1 ? 'Y':'N' : current.solvedFirstTime,
        holeInOne:date ? coding.holeInOne ? 'Y':'N' : current.holeInOne,
        solvedSub20:date ? coding.seconds > 0 && coding.seconds <= 1200 ? 'Y':'N' : current.solvedSub20,
        isCompetent:coding.dontUnderstand ? 'N' : current.isCompetent } : {}) };
  }
  return next;
}
