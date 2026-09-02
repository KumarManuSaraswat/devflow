import { Component } from "react";
import { Link } from "react-router-dom";
import Button from "./Button";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("DevFlow UI error:", error, errorInfo);

    // Later, this is where you can send errors to Sentry,
    // LogRocket, or another monitoring service.
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white text-center shadow-xl">
            <div className="bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-10 text-white">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl font-black ring-1 ring-white/30">
                D
              </div>

              <h1 className="mt-5 text-2xl font-bold">
                Something went wrong
              </h1>

              <p className="mt-2 text-sm leading-6 text-brand-100">
                DevFlow ran into an unexpected interface issue.
                Your data has not been changed.
              </p>
            </div>

            <div className="p-6 sm:p-8">
              <p className="text-sm leading-6 text-slate-500">
                Try loading the page again. If the issue continues,
                return to your workspaces and try again.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <details className="mt-5 rounded-lg bg-slate-50 p-3 text-left">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                    Developer error details
                  </summary>

                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs text-red-700">
                    {this.state.error.message}
                  </pre>
                </details>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                <Link to="/teams">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    Go to My Teams
                  </Button>
                </Link>

                <Button
                  className="w-full sm:w-auto"
                  onClick={this.handleRetry}
                >
                  Try again
                </Button>
              </div>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;