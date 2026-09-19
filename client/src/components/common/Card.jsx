import useReveal from "../motion/useReveal";

const Card = ({ children, className = "" }) => {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className={[
        "surface-card reveal rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
};

export default Card;
