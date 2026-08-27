import Link from "next/link";
import { VantaBackground } from "@/components/vanta-background";

export default function LandingPage() {
  return (
    <main className="landing-page">
      <VantaBackground variant="halo" />
      <div className="landing-grain" aria-hidden="true" />

      <nav className="landing-nav" aria-label="Landing navigation">
        <Link href="/" className="landing-brand" aria-label="Atelier home">
          <span className="landing-mark">A</span>
          <span className="font-serif text-xl">Atelier</span>
        </Link>
        <Link href="/coding" className="landing-enter">Enter your desk <span aria-hidden="true">↗</span></Link>
      </nav>

      <section className="landing-hero">
        <p className="landing-kicker">Your private working desk</p>
        <h1><span>A quiet place</span><span>for good work.</span></h1>
        <p className="landing-intro">
          Coding practice and tutoring work—held together, kept distinct, and ready when you are.
        </p>
        <Link href="/coding" className="landing-cta">
          Open Atelier <span aria-hidden="true">→</span>
        </Link>
      </section>

      <div className="landing-foot">
        <p>Study the problem.</p>
        <p>Plan the lesson.</p>
        <p>Keep the work together.</p>
      </div>
    </main>
  );
}
