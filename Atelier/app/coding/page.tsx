import Link from "next/link";
import { Shell } from "@/components/shell";
import { Badge, Card, Empty } from "@/components/ui";
import { readCodingNotebook } from "@/lib/coding-db";
import { mirrorCurrentData } from "@/lib/cloud-sync";
import { dataOwnerId } from "@/lib/auth";
import type { CodingProblem } from "@/lib/types";

function submissions(problem: CodingProblem) {
  return Number.isInteger(problem.submissionCountOverride)
    ? problem.submissionCountOverride as number
    : problem.submissions.length;
}

function solved(problem: CodingProblem) {
  return problem.submissions.some((submission) => submission.accepted);
}

function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return seconds >= 3600 ? `${Math.floor(seconds / 3600)}h ${minutes % 60}m` : `${minutes}m`;
}

function activity(problems: CodingProblem[]) {
  const dayMs = 86_400_000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - 181 * dayMs);
  const counts = new Map<string, number>();
  for (const problem of problems) {
    for (const submission of problem.submissions) {
      const date = new Date(submission.at);
      if (Number.isNaN(date.valueOf())) continue;
      const key = date.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return Array.from({ length: 182 }, (_, index) => {
    const date = new Date(start.getTime() + index * dayMs);
    const key = date.toISOString().slice(0, 10);
    const count = counts.get(key) ?? 0;
    const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4;
    return { key, count, level };
  });
}

export default async function CodingPage() {
  const notebook = readCodingNotebook(await dataOwnerId());
  await mirrorCurrentData();
  const problems = notebook.problems;
  const solvedProblems = problems.filter(solved);
  const retry = problems.filter((problem) => problem.dontUnderstand || problem.neededHints || !solved(problem));
  const activityDays = activity(problems);
  const activityTotal = activityDays.reduce((total, day) => total + day.count, 0);
  const activeDays = activityDays.filter((day) => day.count > 0).length;
  let currentStreak = 0;
  for (let index = activityDays.length - 1; index >= 0 && activityDays[index].count > 0; index -= 1) currentStreak += 1;
  const bestWeek = Math.max(0, ...Array.from({ length: 26 }, (_, week) =>
    activityDays.slice(week * 7, week * 7 + 7).reduce((total, day) => total + day.count, 0),
  ));

  return (
    <Shell eyebrow="Coding workspace" title="Problem notes" section="coding">
      <div className="stat-strip mb-16 grid sm:grid-cols-3">
        <Card><p className="metric-label">Problems</p><p className="mt-2 font-serif text-3xl">{problems.length}</p><p className="text-sm text-mute">held in Atelier</p></Card>
        <Card><p className="metric-label">Solved</p><p className="mt-2 font-serif text-3xl">{solvedProblems.length}</p><p className="text-sm text-mute">{problems.length ? Math.round((solvedProblems.length / problems.length) * 100) : 0}% of the notebook</p></Card>
        <Card><p className="metric-label">Retry next</p><p className="mt-2 font-serif text-3xl">{retry.length}</p><p className="text-sm text-mute">flagged or not yet solved</p></Card>
      </div>

      <Card className="content-section activity-section">
        <div className="activity-heading">
          <div>
            <p className="metric-label">Last 26 weeks</p>
            <h2 className="mt-1 font-serif text-2xl">Submission activity</h2>
          </div>
          <p><strong>{activityTotal}</strong> submissions</p>
        </div>
        <div className="activity-body">
          <div>
            <div className="atelier-activity-scroll">
              <div className="atelier-activity" aria-label={`${activityTotal} coding submissions in the last 26 weeks`}>
                {activityDays.map((day) => (
                  <span key={day.key} data-level={day.level} title={`${day.key}: ${day.count} submission${day.count === 1 ? "" : "s"}`} />
                ))}
              </div>
            </div>
            <div className="activity-legend" aria-hidden="true"><span>Less</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} data-level={level} />)}<span>More</span></div>
          </div>
          <dl className="activity-insights">
            <div><dt>Current streak</dt><dd>{currentStreak}<span> days</span></dd></div>
            <div><dt>Active days</dt><dd>{activeDays}<span> of 182</span></dd></div>
            <div><dt>Best week</dt><dd>{bestWeek}<span> submissions</span></dd></div>
          </dl>
        </div>
      </Card>

      <Card className="content-section">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="font-serif text-2xl">Practice notebook</h2><p className="mt-1 text-sm text-mute">Synced automatically by the Atelier Problem Notes extension.</p></div>
          {notebook.updatedAt ? <Badge tone="quiet">Synced {new Date(notebook.updatedAt).toLocaleString()}</Badge> : null}
        </div>
        {problems.length ? (
          <div className="problem-grid">
            {problems.map((problem) => (
              <article className="problem-card" key={problem.key}>
                <div className="problem-card-head">
                  <div className="min-w-0">
                    <p className="metric-label">{problem.key.split(":")[0]}{problem.tags?.[0] ? ` · ${problem.tags[0]}` : ""}</p>
                    <h3><Link href={problem.url} target="_blank">{problem.title}</Link></h3>
                  </div>
                  <span className="problem-time">{duration(problem.seconds)}</span>
                </div>
                <div className="problem-badges">
                  <Badge tone={solved(problem) ? "good" : "quiet"}>{solved(problem) ? "Solved" : "Open"}</Badge>
                  <Badge tone="quiet">{submissions(problem)} submissions</Badge>
                  {problem.holeInOne ? <Badge tone="good">★ Hole in one</Badge> : null}
                  {problem.neededHints ? <Badge tone="warn">Needed hints</Badge> : null}
                  {problem.dontUnderstand ? <Badge tone="late">Don’t understand</Badge> : null}
                </div>
                <p className={problem.notes ? "problem-notes" : "problem-notes text-mute"}>{problem.notes || "No notes yet."}</p>
              </article>
            ))}
          </div>
        ) : <Empty title="No coding notes yet" body="Load the Atelier Problem Notes extension, open a LeetCode or NeetCode problem, and save a note. It will appear here while Atelier is running." />}
      </Card>
    </Shell>
  );
}
