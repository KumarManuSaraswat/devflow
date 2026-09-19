import { Link } from "react-router-dom";
import Reveal from "../components/motion/Reveal";
import WorkflowDemo from "../components/motion/WorkflowDemo";

const features = [
  { icon: "↗", title: "One clear workflow", text: "Assign a task, keep progress visible, and move work through review to completion. Every next step has a home.", color: "blue", type: "flow" },
  { icon: "◎", title: "Built for the whole team", text: "Bring developers, reviewers, and leads into one workspace with invite links and the right role for each person.", color: "violet", type: "people" },
  { icon: "✓", title: "Progress you can trust", text: "See active work, reviews, and blockers at a glance. Keep feedback and task activity connected to the work.", color: "mint", type: "progress" },
];

function FeatureVisual({ type }) {
  if (type === "flow") {
    return <div className="feature-flow" aria-hidden="true"><span>Assign</span><i /><span>Review</span><i /><span>Done ✓</span><b /></div>;
  }
  if (type === "people") {
    return <div className="feature-people" aria-hidden="true"><span>AL</span><span>MY</span><span>SK</span><i>One team. In sync.</i></div>;
  }
  return <div className="feature-progress" aria-hidden="true">{[38, 60, 46, 80, 66, 95, 83].map((height, index) => <span key={index} style={{ "--bar-height": `${height}%`, "--bar-delay": `${index * -0.35}s` }} />)}<i>Keep moving ↗</i></div>;
}

export default function LandingPage() {
  return (
    <main className="landing-page min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="landing-atmosphere" aria-hidden="true">
        <div className="landing-grid" />
        <div className="landing-aurora" />
        <div className="landing-glow landing-glow-one" />
        <div className="landing-glow landing-glow-two" />
        {[0, 1, 2, 3, 4].map((index) => <span className="landing-spark" key={index} style={{ "--particle": index }} />)}
      </div>

      <nav aria-label="Main navigation" className="landing-nav relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <span className="brand-mark flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black text-white">D</span>
          <span><span className="block text-lg font-bold tracking-tight">DevFlow</span><span className="hidden text-[10px] font-semibold uppercase tracking-[.18em] text-blue-200 sm:block">Ship with clarity</span></span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          <a href="#features" className="landing-nav-link hidden sm:inline-flex">Features</a>
          <Link to="/login" className="landing-nav-link">Sign in</Link>
          <Link to="/register" className="landing-nav-cta rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900">Get started <span className="hidden sm:inline" aria-hidden="true">↗</span></Link>
        </div>
      </nav>

      <section className="landing-hero relative z-10 mx-auto grid max-w-7xl items-center gap-16 px-5 pb-20 pt-12 sm:px-8 md:grid-cols-[.95fr_1.05fr] md:gap-8 lg:gap-12 lg:px-10 lg:pb-28 lg:pt-20">
        <div className="hero-copy">
          <div className="landing-pill inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-100"><span className="live-dot" aria-hidden="true" />A little structure. A lot of momentum.</div>
          <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[1.04] tracking-[-.055em] text-white sm:text-6xl md:text-5xl xl:text-6xl">Your team’s work,<br /><span className="landing-gradient-text">flowing forward.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">From the first idea to the final review. Bring your people, projects, and next big thing together in one focused workspace.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row md:flex-col xl:flex-row">
            <Link to="/register" className="landing-cta inline-flex items-center justify-center gap-3 rounded-2xl bg-blue-500 px-6 py-3.5 text-sm font-bold text-white">Start building together <span aria-hidden="true">↗</span></Link>
            <Link to="/login" className="landing-secondary inline-flex items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white">Sign in to workspace <span aria-hidden="true">→</span></Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-400"><span><span className="mr-2 text-emerald-400">✓</span>Projects, tasks & reviews</span><span><span className="mr-2 text-emerald-400">✓</span>A place for every role</span></div>
        </div>
        <Reveal className="mx-auto w-full max-w-xl" delay={160}><WorkflowDemo /></Reveal>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-7xl scroll-mt-10 px-5 pb-24 sm:px-8 lg:px-10">
        <div className="landing-divider" />
        <Reveal className="pt-20 text-center"><p className="text-xs font-bold uppercase tracking-[.23em] text-blue-300">Less chasing. More creating.</p><h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">Everything your team needs<br />to keep moving.</h2><p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-slate-400">A shared view of the work, a clear owner for every task, and room for your team to do their best.</p></Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal as="article" key={feature.title} delay={index * 110} className={`landing-feature-card feature-${feature.color}`}>
              <FeatureVisual type={feature.type} />
              <div className="p-6 pt-5"><span className="feature-icon" aria-hidden="true">{feature.icon}</span><h3 className="mt-4 text-lg font-bold">{feature.title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{feature.text}</p></div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-5 pb-20 text-center sm:px-8">
        <Reveal className="landing-final-cta rounded-[2rem] border border-blue-300/20 p-9 sm:p-16">
          <div className="cta-orbit" aria-hidden="true" />
          <div className="relative"><p className="text-xs font-bold uppercase tracking-[.23em] text-blue-200">Great work starts with a shared space</p><h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">Your next big thing.<br />Your team, in flow.</h2><p className="mx-auto mt-5 max-w-md text-sm leading-6 text-slate-300">Create a workspace, bring your people, and turn the next task into real progress.</p><Link to="/register" className="landing-cta mt-8 inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-slate-900">Create your workspace <span aria-hidden="true">↗</span></Link><p className="mt-5 text-sm text-slate-400">Already on the team? <Link to="/login" className="text-blue-200 underline underline-offset-4">Sign in</Link></p></div>
        </Reveal>
      </section>
      <footer className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 pb-24 pt-6 text-xs text-slate-500 sm:px-8 lg:px-10"><span className="font-semibold text-slate-300">DevFlow</span><span>Made for teams that build together.</span></footer>
    </main>
  );
}
