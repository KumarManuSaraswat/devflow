const PageLoader = ({ text = "Loading DevFlow..." }) => {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        </div>

        <p className="mt-4 text-sm font-medium text-slate-500">
          {text}
        </p>
      </div>
    </main>
  );
};

export default PageLoader;