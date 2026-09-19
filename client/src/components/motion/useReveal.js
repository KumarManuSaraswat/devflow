import { useEffect, useRef } from "react";
import { useMotionPreferences } from "../../context/useMotionPreferences";

// Keep content visible by default; animate once, only when it enters the viewport.
export default function useReveal() {
  const ref = useRef(null);
  const { disabled } = useMotionPreferences();

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled || !("IntersectionObserver" in window)) return;

    element.dataset.reveal = "pending";
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.dataset.reveal = "visible";
        observer.disconnect();
      }
    }, { threshold: 0.08 });
    observer.observe(element);

    // Keyboard users must never focus an invisible child.
    const revealOnFocus = () => {
      element.dataset.reveal = "visible";
      observer.disconnect();
    };
    element.addEventListener("focusin", revealOnFocus);
    return () => {
      observer.disconnect();
      element.removeEventListener("focusin", revealOnFocus);
      delete element.dataset.reveal;
    };
  }, [disabled]);

  return ref;
}
