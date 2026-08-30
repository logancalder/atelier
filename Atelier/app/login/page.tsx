import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { safeRedirectDestination } from "@/lib/safe-redirect";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <main className="auth-page"><div className="auth-panel"><Link href="/" className="auth-brand"><span>A</span>Atelier</Link><p className="metric-label">Your private working desk</p><h1>Welcome back.</h1><p className="auth-intro">Coding practice and tutoring work, synced to your private account.</p><AuthForm destination={safeRedirectDestination(next)} /></div></main>;
}
