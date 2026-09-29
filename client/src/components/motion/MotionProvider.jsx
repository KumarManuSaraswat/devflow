import { useState, useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { MotionContext } from "../../context/useMotionPreferences";
import { motionPreferenceKey, readMotionPaused } from "../../utils/motionPreferences";

const android = Capacitor.getPlatform() === "android";
const mediaQuery = "(prefers-reduced-motion: reduce)";
const subscribe = (onChange) => {
  const media = window.matchMedia(mediaQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const getSnapshot = () => window.matchMedia(mediaQuery).matches;

export default function MotionProvider({ children }) {
  const reducedMotion = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const [paused, setPaused] = useState(() => {
    try {
      return readMotionPaused(localStorage, android);
    } catch {
      return android;
    }
  });
  const disabled = paused || reducedMotion;

  const toggleMotion = () => {
    const nextPaused = !paused;
    setPaused(nextPaused);
    try {
      localStorage.setItem(motionPreferenceKey(android), String(nextPaused));
    } catch {
      // The control still works when browser storage is unavailable.
    }
  };

  return (
    <MotionContext.Provider value={{ disabled }}>
      <div className="motion-root" data-motion={disabled ? "paused" : "running"}>
        {children}
        <button
          type="button"
          className="motion-control"
          onClick={toggleMotion}
          disabled={reducedMotion}
          aria-label={reducedMotion ? "Reduced motion enabled by your device" : paused ? "Enable animations" : "Pause animations"}
          aria-pressed={disabled}
          title={reducedMotion ? "Following your device’s reduced-motion preference" : android ? "Smooth mode reduces decorative effects for faster scrolling. You can turn animations back on." : "Control decorative animations across DevFlow"}
        >
          <span className="motion-control-icon" aria-hidden="true">{disabled ? "▷" : "Ⅱ"}</span>
          <span>{reducedMotion ? "Reduced motion" : paused ? android ? "Smooth mode" : "Motion paused" : "Pause motion"}</span>
        </button>
      </div>
    </MotionContext.Provider>
  );
}
