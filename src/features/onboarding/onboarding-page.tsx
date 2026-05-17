import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, Network, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { DEPARTMENTS } from "@/lib/constants";
import { useAuthStore } from "@/lib/auth-store";
import { completeOnboarding } from "@/lib/api";
import { onboardingSchema, type OnboardingInput } from "@/features/onboarding/schemas";
import type { Profile, UserRole } from "@/types/domain";

export function OnboardingPage() {
  const { profile, updateProfile, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const { push } = useToast();

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      fullName: profile?.fullName ?? "",
      role: profile?.role ?? "STUDENT",
      department: profile?.department ?? "Computer Science",
      studentId: profile?.studentId ?? "",
      graduationYear: profile?.graduationYear ?? new Date().getFullYear() + 1,
      skills: profile?.skills.join(", ") ?? "",
      interests: profile?.interests.join(", ") ?? "",
      careerGoals: profile?.careerGoals ?? "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        fullName: profile.fullName,
        role: profile.role,
        department: profile.department,
        studentId: profile.studentId ?? "",
        graduationYear: profile.graduationYear ?? new Date().getFullYear() + 1,
        skills: profile.skills.join(", "),
        interests: profile.interests.join(", "),
        careerGoals: profile.careerGoals ?? "",
      });
    }
  }, [form, profile]);

  const mutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: (updated) => {
      updateProfile(updated);
      push({ kind: "success", title: "Onboarding completed", description: "Your Connectly profile is ready." });
      navigate("/app");
    },
    onError: () => {
      push({ kind: "error", title: "Save failed", description: "Could not save your profile. Please try again." });
    },
  });

  if (isLoading) return null;
  if (!profile) return <Navigate to="/auth" replace />;
  if (profile.status === "ACTIVE") return <Navigate to="/app" replace />;

  const submit = (input: OnboardingInput) => {
    const updated: Profile = {
      ...profile,
      fullName: input.fullName,
      role: input.role as UserRole,
      department: input.department,
      studentId: input.studentId || profile.studentId,
      graduationYear: input.graduationYear,
      skills: split(input.skills),
      interests: split(input.interests),
      careerGoals: input.careerGoals,
      status: "ACTIVE",
      profileCompleteness: Math.max(profile.profileCompleteness, 84),
      updatedAt: new Date().toISOString(),
    };
    mutation.mutate(updated);
  };

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="page-shell grid min-h-screen items-center gap-8 py-10 lg:grid-cols-[0.9fr_1fr]">
        <section>
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Network className="h-4 w-4" />
            </span>
            Connectly onboarding
          </div>
          <h1 className="mt-8 max-w-xl text-4xl font-semibold tracking-normal">Verify identity and complete the essentials</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Imported alumni are merged by Google email. Unknown users provide student ID, department, and graduation year for
            admin verification before full access.
          </p>
          <div className="mt-8 space-y-4">
            {[
              ["Imported alumni merge", "Exact email matching activates pre-seeded invited alumni records."],
              ["Fallback verification", "Unmatched users stay pending until admin approval."],
              ["Progressive profiles", "Only essentials are required now; richer profile sections can be completed later."],
            ].map(([title, text]) => (
              <div key={title} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Essential profile</CardTitle>
            <CardDescription>Keep this accurate for directory search and mentor matching.</CardDescription>
          </CardHeader>
          <CardContent>
            {profile.status === "PENDING" ? (
              <div className="mb-5 rounded-md border bg-amber-50 p-3 text-sm text-amber-800">
                <div className="flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4" />
                  Admin verification pending
                </div>
                <p className="mt-1">You can update your details while the admin reviews your request.</p>
              </div>
            ) : (
              <div className="mb-5 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  Secure onboarding
                </div>
                <p className="mt-1">Private email remains backend-only and is never shown in the directory.</p>
              </div>
            )}

            <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
              <Field label="Full name" error={form.formState.errors.fullName?.message}>
                <Input {...form.register("fullName")} />
              </Field>
              <Field label="Role">
                <Select {...form.register("role")}>
                  <option value="STUDENT">Student</option>
                  <option value="ALUMNI">Alumni</option>
                  <option value="FACULTY">Faculty</option>
                </Select>
              </Field>
              <Field label="Department">
                <Select {...form.register("department")}>
                  {DEPARTMENTS.map((department) => (
                    <option key={department}>{department}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Graduation year" error={form.formState.errors.graduationYear?.message}>
                <Input type="number" {...form.register("graduationYear")} />
              </Field>
              <Field label="Student ID / Alumni ID">
                <Input {...form.register("studentId")} />
              </Field>
              <Field label="Skills" error={form.formState.errors.skills?.message}>
                <Input placeholder="React, Python, SQL" {...form.register("skills")} />
              </Field>
              <Field label="Interests" error={form.formState.errors.interests?.message}>
                <Input placeholder="Machine Learning, Product Engineering" {...form.register("interests")} />
              </Field>
              <div className="space-y-2 md:col-span-2">
                <Label>Career goals</Label>
                <Textarea {...form.register("careerGoals")} />
                {form.formState.errors.careerGoals ? (
                  <p className="text-sm text-destructive">{form.formState.errors.careerGoals.message}</p>
                ) : null}
              </div>
              <Button className="md:col-span-2" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Complete onboarding
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function split(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
