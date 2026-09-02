import { Link } from "react-router-dom";

const AuthLayout = ({
  eyebrow,
  title,
  description,
  children,
  footer,
  quote,
}) => {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-brand-700 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-500/40 blur-3xl" />
          <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-indigo-950/50 blur-3xl" />

          <div className="relative">
            <Link
              to="/login"
              className="inline-flex items-center gap-3"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl font-black ring-1 ring-white/20">
                D
              </span>

              <span>
                <span className="block text-xl font-bold">
                  DevFlow
                </span>
                <span className="block text-xs text-brand-100">
                  Team delivery workspace
                </span>
              </span>
            </Link>
          </div>

          <div className="relative max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-200">
              Build together
            </p>

            <h2 className="mt-5 text-4xl font-bold leading-tight xl:text-5xl">
              Turn team ideas into shipped work.
            </h2>

            <p className="mt-6 max-w-lg text-base leading-7 text-brand-100">
              Plan projects, assign tasks, review contributions,
              and keep every team member aligned in one focused
              workspace.
            </p>

            {quote && (
              <blockquote className="mt-10 border-l-2 border-brand-300 pl-4 text-sm italic leading-6 text-brand-100">
                “{quote}”
              </blockquote>
            )}
          </div>

          <p className="relative text-xs text-brand-200">
            Secure collaboration for modern development teams.
          </p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Link
                to="/login"
                className="inline-flex items-center gap-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-black text-white">
                  D
                </span>

                <span className="text-xl font-bold text-slate-950">
                  DevFlow
                </span>
              </Link>
            </div>

            <div className="mb-8">
              <p className="text-sm font-semibold text-brand-600">
                {eyebrow}
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                {title}
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>

            {children}

            {footer && (
              <div className="mt-7 text-center text-sm text-slate-500">
                {footer}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default AuthLayout;