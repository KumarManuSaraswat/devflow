const Card = ({ children, className = "" }) => {
  return (
    <div
      className={[
        "rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-sm",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
};

export default Card;
