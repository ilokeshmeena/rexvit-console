import React from "react";

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("RexVit render failure", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex h-screen items-center justify-center bg-background p-8 text-foreground">
          <section className="max-w-lg rounded-lg border border-border bg-panel p-5 shadow-panel">
            <h1 className="text-base font-semibold">
              RexVit Console failed to render
            </h1>
            <p className="mt-2 text-sm text-muted">
              {this.state.error.message}
            </p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
