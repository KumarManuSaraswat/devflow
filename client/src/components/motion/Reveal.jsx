import useReveal from "./useReveal";

export default function Reveal({ as: Element = "div", children, className = "", delay = 0, style, ...props }) {
  const ref = useReveal();
  return (
    <Element ref={ref} className={`reveal ${className}`} style={{ "--reveal-delay": `${delay}ms`, ...style }} {...props}>
      {children}
    </Element>
  );
}
