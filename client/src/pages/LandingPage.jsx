import { Link } from "react-router-dom";

const features = [
  {
    icon: "↗",
    title: "One clear workflow",
    text: "Take work from a well-scoped task to review and release without losing the thread.",
    color: "bg-blue-500",
  },
  {
    icon: "◌",
    title: "Built for the whole team",
    text: "Give developers, reviewers, and leads the right level of access in one shared space.",
    color: "bg-violet-500",
  },
  {
    icon: "✓",
    title: "Progress you can trust",
    text: "See active work, reviews, blockers, and completed tasks at a glance.",
    color: "bg-emerald-500",
  },
];

const LandingPage = () => {
  return (
    <main className="landing-page min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="landing-glow landing-glow-one" />
      <div className="landing-glow landing-glow-two" />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <span className="brand-mark flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black text-white">D</span>
          <span>
            <span className="block text-lg font-bold tracking-tight">DevFlow</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[.18em] text-blue-200">Ship with clarity</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-white/10 hover:text-white">Sign in</Link>
          <Link to="/register" className="landing-nav-cta rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900">Get started</Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[.95fr_1.05fr] lg:px-10 lg:pb-28 lg:pt-20">
        <div className="landing-reveal">
          <div className="landing-pill inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-400/10 px-3 py-1.5 text-xs font-bold text-blue-100">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_3px_rgba(52,211,153,.5)]" />
            The calm way to ship great work
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[.96] tracking-[-.055em] text-white sm:text-6xl xl:text-7xl">
            Your team’s work, <span className="landing-gradient-text">flowing forward.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
            DevFlow turns scattered tasks into a focused delivery rhythm. Plan together, assign with confidence, and celebrate every shipped milestone.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/register" className="landing-cta inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-6 py-3.5 text-sm font-bold text-white">Start building free <span aria-hidden="true">→</span></Link>
            <Link to="/login" className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/10">Sign in to workspace</Link>
          </div>
          <div className="mt-10 flex items-center gap-5 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Set up in minutes</span>
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Built for every role</span>
          </div>
        </div>

        <div className="landing-dashboard-wrap landing-reveal landing-reveal-delay relative mx-auto w-full max-w-xl">
          <div className="landing-float-card landing-float-card-one"><span className="text-emerald-300">✓</span> 12 tasks shipped</div>
          <div className="landing-float-card landing-float-card-two"><span className="text-amber-300">◌</span> 3 in review</div>
          <div className="landing-dashboard rounded-3xl border border-white/15 bg-slate-900/75 p-4 shadow-2xl shadow-blue-950/50 backdrop-blur-xl sm:p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /></div>
              <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">Core product</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[['Active', '08', 'text-blue-300'], ['Review', '03', 'text-amber-300'], ['Done', '24', 'text-emerald-300']].map(([label, count, color]) => <div key={label} className="rounded-2xl border border-white/8 bg-white/5 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-1 text-2xl font-black ${color}`}>{count}</p></div>)}
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/50 p-3">
              <div className="flex items-center justify-between"><p className="text-xs font-bold text-white">This week’s momentum</p><p className="text-xs font-bold text-emerald-300">+18%</p></div>
              <div className="mt-4 flex h-20 items-end gap-2">{[38,54,43,72,58,87,74,100,82].map((height, index) => <span key={index} className="landing-chart-bar flex-1 rounded-t-full bg-gradient-to-t from-blue-600 to-cyan-300" style={{ height: `${height}%`, animationDelay: `${index * 90}ms` }} />)}</div>
            </div>
            <div className="mt-4 space-y-2">
              {['Polish onboarding flow', 'Review API error states', 'Publish sprint notes'].map((task, index) => <div key={task} className="landing-task-row flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5" style={{ animationDelay: `${index * 140}ms` }}><span className={`h-2 w-2 rounded-full ${index === 1 ? 'bg-amber-300' : 'bg-blue-400'}`} /><span className="flex-1 text-xs font-medium text-slate-200">{task}</span><span className="h-6 w-6 rounded-full border-2 border-slate-900 bg-gradient-to-br from-violet-300 to-blue-500" /></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-24 sm:px-8 lg:px-10">
        <div className="landing-divider" />
        <div className="pt-20 text-center"><p className="text-sm font-bold uppercase tracking-[.2em] text-blue-300">Everything in rhythm</p><h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">A focused home for every step of delivery.</h2></div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {features.map((feature, index) => <article key={feature.title} className="landing-feature-card rounded-3xl border border-white/10 bg-white/[.055] p-6 backdrop-blur-sm" style={{ animationDelay: `${index * 100}ms` }}><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${feature.color} text-xl font-black text-white shadow-lg`}>{feature.icon}</div><h3 className="mt-6 text-lg font-bold">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{feature.text}</p></article>)}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-5 pb-24 text-center sm:px-8"><div className="landing-final-cta rounded-[2rem] border border-blue-300/20 bg-gradient-to-br from-blue-600/35 via-violet-600/25 to-slate-900 p-9 sm:p-14"><p className="text-sm font-bold uppercase tracking-[.2em] text-blue-200">Ready when you are</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Turn the next task into real progress.</h2><Link to="/register" className="landing-cta mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-slate-900">Create your workspace <span>→</span></Link></div></section>
    </main>
  );
};

export default LandingPage;
