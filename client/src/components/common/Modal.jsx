const Modal = ({
  children,
  title,
  onClose,
  maxWidth = "max-w-lg",
}) => {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          className={`w-full ${maxWidth} max-h-[calc(100dvh-2rem)] overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2
              id="modal-title"
              className="text-lg font-bold text-slate-900"
            >
              {title}
            </h2>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              ×
            </button>
          </div>

          <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto p-5 sm:max-h-[calc(100dvh-8rem)] sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;