import { redirect } from 'next/navigation';
export default async function SessionsPage({searchParams}:{searchParams:Promise<{week?:string}>}) { const {week}=await searchParams; redirect('/studio?view=calendar'+(week?'&week='+encodeURIComponent(week):'')); }
