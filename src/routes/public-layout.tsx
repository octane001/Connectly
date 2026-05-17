import { Link, Outlet } from "react-router-dom";
import { Network } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="page-shell flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Network className="h-4 w-4" />
            </span>
            Connectly
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="/#mentorship">Mentorship</a>
            <a href="/#jobs">Jobs</a>
            <a href="/#engagement">Engagement</a>
          </nav>
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
