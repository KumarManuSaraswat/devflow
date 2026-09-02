import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const AppLoadingScreen = () => {
  return (
    <main className="min-h-screen bg-page">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 lg:block">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200" />

            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
            </div>
          </div>

          <div className="mt-12 h-10 animate-pulse rounded-lg bg-slate-100" />

          <div className="mt-3 h-10 animate-pulse rounded-lg bg-slate-100" />
        </aside>

        <section className="flex-1">
          <header className="border-b border-slate-200 bg-white px-4 py-4 lg:hidden">
            <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-200" />
          </header>

          <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-5">
              <div className="space-y-3">
                <div className="h-4 w-40 animate-pulse rounded bg-brand-100" />
                <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
                <div className="h-5 w-96 max-w-full animate-pulse rounded bg-slate-100" />
              </div>

              <div className="hidden h-11 w-32 animate-pulse rounded-lg bg-slate-200 sm:block" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

const SkeletonCard = () => {
  return (
    <div className="min-h-52 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
      </div>

      <div className="mt-5 h-5 w-40 animate-pulse rounded bg-slate-200" />

      <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-slate-100" />

      <div className="mt-8 h-4 w-28 animate-pulse rounded bg-brand-100" />
    </div>
  );
};

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;