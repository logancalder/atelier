import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { readProva } from '@/lib/prova';
import { readCodingNotebook } from '@/lib/coding-db';
import { problemAliases, safeProblemUrl } from '@/lib/problem-library';
import { Shell } from '@/components/shell';
import { Card } from '@/components/ui';
import { EditCodingProblemButton } from '@/components/edit-coding-problem-button';

export default async function ProblemPage({params}:{params:Promise<{id:string}>}) {
  const routeParams=await params, id=decodeURIComponent(routeParams.id), user=await currentUser();
  const library=await readProva(user), problem=library.find(p=>problemAliases(p).includes(id));
  if (!problem) notFound();
  const records=readCodingNotebook(user?.uid || 'local').problems.filter(p=>problem.codingKeys?.includes(p.key));
  const links=[...new Set([problem.url,...records.flatMap(p=>[p.url,p.leetcodeSlug ? 'https://leetcode.com/problems/'+p.leetcodeSlug+'/' : ''])])].map(safeProblemUrl).filter((url):url is string=>!!url);
  const metrics=[['Number',problem.problemNo],['Difficulty',problem.difficulty],['Category',problem.category],['Solved',problem.solved?'Yes':'Not yet'],['Solved on',problem.dateSolved],['Time (minutes)',problem.solveTime],['First try',problem.solvedFirstTime],['Hole in one',problem.holeInOne],['Sub 20',problem.solvedSub20],['Competent',problem.isCompetent]];
  return <Shell title={problem.title} eyebrow="Problem detail" description="One problem, all your practice records." className="problem-detail">
    <div className="workflow-tabs"><Link href="/prova">Master library</Link><Link href="/coding">Recent notes</Link></div>
    <Card className="content-section"><h2>Problem overview</h2><dl className="problem-facts">{metrics.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl><p className="problem-notes">{problem.notes || 'No notes yet.'}</p><div className="workflow-tabs">{links.map(url=><a key={url} href={url} target="_blank" rel="noreferrer">Original problem · {new URL(url).hostname}</a>)}</div></Card>
    {problem.mergedLibraryNotes?.length ? <Card className="content-section"><h2>Earlier library notes</h2>{problem.mergedLibraryNotes.map((note,index)=><p key={index} className="problem-notes">{note}</p>)}</Card>:null}
    {records.map(record=><Card className="content-section" key={record.key}><div className="workflow-tabs"><h2>{record.key}</h2><EditCodingProblemButton problem={record}/></div><p>Time: {record.seconds}s · Submissions: {record.submissionCountOverride ?? record.submissions.length} · Hints: {record.neededHints?'Yes':'No'} · Revisit: {record.dontUnderstand?'Yes':'No'} · Updated: {record.updatedAt}</p><p className="problem-notes">{record.notes || 'No notes yet.'}</p><h3>Note history</h3>{record.noteHistory?.length ? record.noteHistory.map((entry,index)=><div className="note-history" key={index}><time>{entry.at}</time><p>{entry.notes || '(Empty note)'}</p></div>):<p>No earlier note revisions recorded.</p>}<h3>Submission history</h3>{record.submissions.length ? <ol>{record.submissions.map((s,index)=><li key={index}>{s.at} · {s.accepted?'Accepted':'Attempt'}{s.source ? ' · '+s.source:''}</li>)}</ol>:<p>No submissions recorded.</p>}</Card>)}
  </Shell>;
}
