import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="page-shell flex min-h-screen items-center justify-center py-10">
        <Card className="max-w-lg">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <h1 className="text-lg font-semibold">Something went wrong</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Connectly could not render this view. Refresh the page and try again.
                </p>
                <Button className="mt-4" onClick={() => window.location.reload()}>
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
