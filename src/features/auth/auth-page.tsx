import { Navigate, useLocation } from "react-router-dom";
import { Chrome, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/lib/auth-store";
import { hasSupabaseConfig } from "@/lib/supabase";

export function AuthPage() {
  const location = useLocation();
  const { profile, signInWithGoogle, continueAsDemo } = useAuthStore();
  const { push } = useToast();

  if (profile?.status === "ACTIVE") {
    return <Navigate to={(location.state as { from?: string } | null)?.from ?? "/app"} replace />;
  }

  const signIn = async () => {
    await signInWithGoogle();
    if (!hasSupabaseConfig) {
      push({
        kind: "info",
        title: "Preview session started",
        description: "You are exploring Connectly in preview mode.",
      });
    }
  };

  return (
    <main className="page-shell grid min-h-[calc(100vh-4rem)] items-center gap-8 py-10 lg:grid-cols-[0.95fr_1fr]">
      <section>
        <Badge variant="outline">Secure Google OAuth only</Badge>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-normal">Sign in to your university alumni network</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Connectly connects you with alumni, mentors, and career opportunities through your verified university account.
          New users are reviewed before receiving full access.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {[
            ["Privacy first", "Contact requests and message threads protect private email addresses."],
            ["Role-based access", "Admins, faculty, alumni, and students each have tailored permissions and features."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-lg border bg-card p-4">
              <ShieldCheck className="mb-3 h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Connectly</CardTitle>
          <CardDescription>Use your institutional Google account to continue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" size="lg" onClick={signIn}>
            <Chrome className="h-4 w-4" />
            Continue with Google
          </Button>
          <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            {hasSupabaseConfig
              ? "Secure sign-in powered by Google OAuth."
              : "Preview mode is active. Sign in with Google will be available once the platform is deployed."}
          </div>
          <div className="grid gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quick preview as</p>
            <div className="grid grid-cols-2 gap-2">
              {(["STUDENT", "ALUMNI", "FACULTY", "ADMIN"] as const).map((role) => (
                <Button key={role} variant="outline" onClick={() => continueAsDemo(role)}>
                  <Users className="h-4 w-4" />
                  {role.replace("_", " ")}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
