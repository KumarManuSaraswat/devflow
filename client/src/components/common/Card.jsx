const Card = ({ children, className = "" }) => {
  return (
    <div
      className={[
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
};

export default Card;