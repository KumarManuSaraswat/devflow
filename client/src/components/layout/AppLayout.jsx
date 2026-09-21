import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import Button from "../common/Button";
import PageTransition from "../motion/PageTransition";

const AppLayout = () => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const linkClass = ({ isActive }) =>
    [
      "sidebar-link flex items-center rounded-lg px-3 py-2.5 text-sm font-medium",
      isActive
        ? "bg-brand-50 text-brand-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    ].join(" ");

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    closeMobileMenu();
    await logout();
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen
      ? "hidden"
      : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="app-shell">
      <aside className="app-sidebar fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200/80 p-5 lg:block">
        <NavLink
          to="/teams"
          className="flex items-center gap-3 px-2 py-3"
        >
          <div className="brand-mark flex h-9 w-9 items-center justify-center rounded-xl text-lg font-black text-white">
            D
          </div>

          <div>
            <p className="text-lg font-bold text-slate-900">
              DevFlow
            </p>

            <p className="text-xs text-slate-500">
              Team delivery workspace
            </p>
          </div>
        </NavLink>

        <nav className="mt-8 space-y-1">
          <NavLink to="/teams" className={linkClass}>
            <span className="mr-3 text-base">⌂</span>
            My Teams
          </NavLink>
          <NavLink to="/assistant" className={linkClass}>
            <span className="mr-3 text-base" aria-hidden="true">✦</span>Ask DevFlow
          </NavLink>
        </nav>

        <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-slate-200/80 bg-white/75 p-3 shadow-sm backdrop-blur">
          <p className="truncate text-sm font-semibold text-slate-800">
            {user?.name}
          </p>

          <p className="truncate text-xs text-slate-500">
            {user?.email}
          </p>

          <Button
            variant="ghost"
            className="mt-2 w-full justify-start px-2 py-2 text-xs"
            onClick={handleLogout}
          >
            Log out
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <NavLink
            to="/teams"
            className="flex items-center gap-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-base font-black text-white">
              D
            </span>

            <span className="text-lg font-bold text-slate-900">
              DevFlow
            </span>
          </NavLink>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={isMobileMenuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-xl text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-brand-100"
          >
            ☰
          </button>
        </div>
      </header>

      <div
        className={[
          "fixed inset-0 z-40 bg-slate-950/40 transition-opacity duration-200 lg:hidden",
          isMobileMenuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white p-5 shadow-2xl transition-transform duration-300 ease-out lg:hidden",
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(" ")}
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-between">
          <NavLink
            to="/teams"
            onClick={closeMobileMenu}
            className="flex items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-black text-white">
              D
            </span>

            <span>
              <span className="block text-lg font-bold text-slate-900">
                DevFlow
              </span>

              <span className="block text-xs text-slate-500">
                Team delivery workspace
              </span>
            </span>
          </NavLink>

          <button
            type="button"
            onClick={closeMobileMenu}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-brand-100"
          >
            ×
          </button>
        </div>

        <nav className="mt-8 space-y-1">
          <NavLink
            to="/teams"
            className={linkClass}
            onClick={closeMobileMenu}
          >
            <span className="mr-3 text-base">⌂</span>
            My Teams
          </NavLink>
          <NavLink to="/assistant" className={linkClass} onClick={closeMobileMenu}>
            <span className="mr-3 text-base" aria-hidden="true">✦</span>Ask DevFlow
          </NavLink>
        </nav>

        <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">
                {user?.name}
              </p>

              <p className="truncate text-xs text-slate-500">
                {user?.email}
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={handleLogout}
          >
            Log out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <main className="mx-auto max-w-7xl px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:py-8 lg:pb-20">
          <PageTransition />
        </main>
        {pathname !== "/assistant" && <NavLink to="/assistant" aria-label="Open DevFlow planning assistant"
          className="motion-button fixed bottom-18 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/50 bg-gradient-to-br from-brand-600 to-violet-600 text-xl text-white shadow-lg shadow-brand-500/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">✦</NavLink>}
      </div>
    </div>
  );
};

export default AppLayout;
