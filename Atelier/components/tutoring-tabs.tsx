import Link from 'next/link';
export function TutoringTabs({active}:{active:'today'|'calendar'|'students'|'billing'}) {
  return <nav className="workflow-tabs" aria-label="Tutoring workflow">{[
    ['today','/studio','Today'],['calendar','/studio?view=calendar','Calendar'],['students','/studio?view=students','Students'],['billing','/money','Billing']
  ].map(([key,href,label])=><Link key={key} href={href} aria-current={active===key?'page':undefined}>{label}</Link>)}</nav>;
}
