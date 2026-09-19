import { useEffect, useRef, useState } from "react";
import { useMotionPreferences } from "../../context/useMotionPreferences";

const stages = [
  { label: "Assign", status: "Assigned", color: "#93c5fd", title: "A clear next step.", detail: "Add the right people and set the priority.", activity: "Maya assigned the task to Alex", progress: 18 },
  { label: "Build", status: "In progress", color: "#c4b5fd", title: "Good ideas, in motion.", detail: "Keep everyone in sync as the work takes shape.", activity: "Alex started working on the task", progress: 48 },
  { label: "Review", status: "In review", color: "#fcd34d", title: "A fresh pair of eyes.", detail: "Share a pull request and get focused feedback.", activity: "Sam is reviewing the contribution", progress: 76 },
  { label: "Ship", status: "Completed", color: "#6ee7b7", title: "One more thing, shipped.", detail: "Close the loop and make room for what’s next.", activity: "The team completed the task", progress: 100 },
];

export default function WorkflowDemo() {
  const [step, setStep] = useState(0);
  const [engaged, setEngaged] = useState(false);
  const ref = useRef(null);
  const { disabled } = useMotionPreferences();
  const stage = stages[step];

  useEffect(() => {
    if (disabled || engaged) return;
    let timer;
    let visible = false;
    const syncPlayback = () => {
      window.clearInterval(timer);
      if (visible && !document.hidden) {
        timer = window.setInterval(() => setStep((current) => (current + 1) % stages.length), 3600);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    }, { threshold: 0.15 });
    observer.observe(ref.current);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [disabled, engaged]);

  const tilt = (event) => {
    if (disabled || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.setProperty("--tilt-x", `${-y * 5}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${x * 6}deg`);
  };

  return (
    <div
      ref={ref}
      className="workflow-demo"
      style={{ "--step": step, "--stage-color": stage.color }}
      onPointerMove={tilt}
      onPointerEnter={() => setEngaged(true)}
      onPointerLeave={(event) => {
        event.currentTarget.style.setProperty("--tilt-x", "0deg");
        event.currentTarget.style.setProperty("--tilt-y", "0deg");
        if (!event.currentTarget.contains(document.activeElement)) setEngaged(false);
      }}
      onFocus={() => setEngaged(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setEngaged(false);
      }}
      aria-label="Interactive example of the DevFlow task workflow"
    >
      <div className="demo-orbit demo-orbit-one" aria-hidden="true" />
      <div className="demo-orbit demo-orbit-two" aria-hidden="true" />
      <div className="landing-float-card landing-float-card-one" aria-hidden="true"><span className="text-emerald-300">✓</span> Everyone in sync</div>
      <div className="landing-float-card landing-float-card-two" aria-hidden="true"><span className="text-blue-300">↗</span> From idea to done</div>

      <div className="demo-levitate">
        <div className="landing-dashboard">
          <div className="demo-toolbar">
            <div className="flex gap-1.5" aria-hidden="true"><i /><i /><i /></div>
            <span>devflow / product team</span>
            <span className="demo-label">Interactive demo</span>
          </div>
          <div className="demo-body">
            <div className="flex items-center justify-between gap-3">
              <div><p className="demo-eyebrow">THE NEXT BIG THING</p><h2 className="mt-1 text-xl font-bold text-white">Product launch</h2></div>
              <div className="demo-avatars" aria-label="Example teammates"><span>AL</span><span>MY</span><span>SK</span></div>
            </div>

            <div className="demo-steps" role="group" aria-label="Explore workflow stages">
              <span className="demo-step-highlight" aria-hidden="true" />
              {stages.map((item, index) => (
                <button key={item.label} type="button" aria-pressed={step === index} onClick={() => setStep(index)}>
                  <span aria-hidden="true">{index < step ? "✓" : `0${index + 1}`}</span>{item.label}
                </button>
              ))}
            </div>

            <div className="demo-task">
              <div className="flex items-center justify-between gap-2">
                <span className="demo-task-id">DEV–024</span>
                <span className="demo-status"><span className="demo-status-dot" />{stage.status}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">Make onboarding feel effortless</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">A thoughtful first impression, built together.</p>
              <div className="demo-checklist" aria-hidden="true">
                {["Define the experience", "Build & connect", "Review & deliver"].map((label, index) => (
                  <div key={label} className={step > index ? "is-done" : ""}>
                    <span>{step > index ? "✓" : ""}</span><span>{label}</span>
                  </div>
                ))}
              </div>
              <div className="demo-progress-meta"><span>Task progress</span><span>{stage.progress}%</span></div>
              <div className="demo-progress-track" aria-hidden="true"><span style={{ transform: `scaleX(${stage.progress / 100})` }} /></div>
              <div className="demo-task-footer"><span><i /> Alex · Developer</span><span>High priority</span></div>
            </div>

            <div key={step} className="demo-activity" aria-live="off"><span className="demo-activity-icon" aria-hidden="true">{step === 3 ? "✓" : "↗"}</span><span>{stage.activity}</span><span className="ml-auto text-slate-500">now</span></div>
          </div>
        </div>
      </div>
      <div className="demo-caption">
        <div key={step} className="demo-caption-copy"><p>{stage.title}</p><span>{stage.detail}</span></div>
        <span className="demo-caption-hint">Select a stage to explore</span>
      </div>
    </div>
  );
}
