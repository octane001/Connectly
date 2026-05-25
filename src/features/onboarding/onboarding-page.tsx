import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, Network, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { DEPARTMENTS, INDUSTRIES } from "@/lib/constants";
import { useAuthStore } from "@/lib/auth-store";
import { completeOnboarding } from "@/lib/api";
import { onboardingSchema, type OnboardingInput } from "@/features/onboarding/schemas";
import {
  isAlumniProfile,
  isFacultyProfile,
  isStudentProfile,
  type Profile,
} from "@/types/domain";

export function OnboardingPage() {
  const { profile, updateProfile, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const { push } = useToast();

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: onboardingDefaults(profile) as any,
  });
  const role = form.watch("role");

  useEffect(() => {
    if (profile) form.reset(onboardingDefaults(profile) as any);
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
    mutation.mutate(buildOnboardingProfile(profile, input));
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
          <h1 className="mt-8 max-w-xl text-4xl font-semibold tracking-normal">Verify identity with the right profile type</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Students, alumni, and faculty now complete separate profile sections so directory search, mentorship, and admin review stay accurate.
          </p>
          <div className="mt-8 space-y-4">
            {[
              ["Role-specific records", "Your role controls the fields saved to the database."],
              ["Cleaner verification", "Admins review identity details without unrelated profile noise."],
              ["Better matching", "Mentorship and search use student goals, alumni industries, and faculty research areas separately."],
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
            <CardDescription>Only fields that belong to your selected role are required.</CardDescription>
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
              <Field label="City">
                <Input {...form.register("city" as any)} />
              </Field>
              <Field label="Skills" error={(form.formState.errors as any).skills?.message}>
                <Input placeholder="React, Python, SQL" {...form.register("skills")} />
              </Field>

              {role === "STUDENT" ? <StudentFields form={form} /> : null}
              {role === "ALUMNI" ? <AlumniFields form={form} /> : null}
              {role === "FACULTY" ? <FacultyFields form={form} /> : null}

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

function StudentFields({ form }: { form: UseFormReturn<OnboardingInput> }) {
  return (
    <>
      <Field label="Student ID" error={(form.formState.errors as any).studentId?.message}>
        <Input {...form.register("studentId" as any)} />
      </Field>
      <Field label="Current year" error={(form.formState.errors as any).currentYear?.message}>
        <Input type="number" min={1} max={8} {...form.register("currentYear" as any)} />
      </Field>
      <Field label="Degree" error={(form.formState.errors as any).degree?.message}>
        <Input placeholder="B.Tech" {...form.register("degree" as any)} />
      </Field>
      <Field label="Specialization" error={(form.formState.errors as any).specialization?.message}>
        <Input placeholder="Computer Science" {...form.register("specialization" as any)} />
      </Field>
      <Field label="CGPA">
        <Input type="number" step="0.01" min={0} max={10} {...form.register("cgpa" as any)} />
      </Field>
      <Field label="Interests" error={(form.formState.errors as any).interests?.message}>
        <Input placeholder="Machine Learning, Product Engineering" {...form.register("interests" as any)} />
      </Field>
      <div className="space-y-2 md:col-span-2">
        <Label>Career goals</Label>
        <Textarea {...form.register("careerGoals" as any)} />
        {(form.formState.errors as any).careerGoals ? (
          <p className="text-sm text-destructive">{(form.formState.errors as any).careerGoals.message}</p>
        ) : null}
      </div>
    </>
  );
}

function AlumniFields({ form }: { form: UseFormReturn<OnboardingInput> }) {
  return (
    <>
      <Field label="Graduation year" error={(form.formState.errors as any).graduationYear?.message}>
        <Input type="number" {...form.register("graduationYear" as any)} />
      </Field>
      <Field label="Degree" error={(form.formState.errors as any).degree?.message}>
        <Input placeholder="B.Tech" {...form.register("degree" as any)} />
      </Field>
      <Field label="Specialization" error={(form.formState.errors as any).specialization?.message}>
        <Input placeholder="Computer Science" {...form.register("specialization" as any)} />
      </Field>
      <Field label="Company" error={(form.formState.errors as any).company?.message}>
        <Input {...form.register("company" as any)} />
      </Field>
      <Field label="Designation" error={(form.formState.errors as any).designation?.message}>
        <Input {...form.register("designation" as any)} />
      </Field>
      <Field label="Industry" error={(form.formState.errors as any).industry?.message}>
        <Select {...form.register("industry" as any)}>
          {INDUSTRIES.map((industry) => <option key={industry}>{industry}</option>)}
        </Select>
      </Field>
      <Field label="Experience years">
        <Input type="number" min={0} {...form.register("experienceYears" as any)} />
      </Field>
      <Field label="Interests" error={(form.formState.errors as any).interests?.message}>
        <Input placeholder="Software Architecture, Career Guidance" {...form.register("interests" as any)} />
      </Field>
      <Field label="Mentorship categories">
        <Input placeholder="Career Guidance, Resume Review" {...form.register("mentorCategories" as any)} />
      </Field>
      <label className="flex items-center gap-2 rounded-md border p-3 text-sm md:col-span-2">
        <input type="checkbox" {...form.register("mentorshipAvailable" as any)} />
        Available for student mentorship
      </label>
    </>
  );
}

function FacultyFields({ form }: { form: UseFormReturn<OnboardingInput> }) {
  return (
    <>
      <Field label="Faculty ID" error={(form.formState.errors as any).facultyId?.message}>
        <Input {...form.register("facultyId" as any)} />
      </Field>
      <Field label="Academic title" error={(form.formState.errors as any).academicTitle?.message}>
        <Input placeholder="Professor" {...form.register("academicTitle" as any)} />
      </Field>
      <Field label="Designation" error={(form.formState.errors as any).designation?.message}>
        <Input placeholder="Placement Coordinator" {...form.register("designation" as any)} />
      </Field>
      <Field label="Office location">
        <Input {...form.register("officeLocation" as any)} />
      </Field>
      <Field label="Office hours">
        <Input placeholder="Mon-Fri, 2 PM - 4 PM" {...form.register("officeHours" as any)} />
      </Field>
      <Field label="Mentorship capacity">
        <Input type="number" min={0} {...form.register("mentorshipCapacity" as any)} />
      </Field>
      <Field label="Research interests" error={(form.formState.errors as any).researchInterests?.message}>
        <Input placeholder="Machine Learning, Education Technology" {...form.register("researchInterests" as any)} />
      </Field>
      <Field label="Interests (General)" error={(form.formState.errors as any).interests?.message}>
        <Input placeholder="Student Mentoring, Research Guidance" {...form.register("interests" as any)} />
      </Field>
      <div className="space-y-2 md:col-span-2">
        <Label>Publications</Label>
        <Textarea placeholder="Comma-separated publication titles" {...form.register("publications" as any)} />
      </div>
    </>
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

function onboardingDefaults(profile: Profile | null): Partial<OnboardingInput> {
  const base = {
    fullName: profile?.fullName ?? "",
    role: profile?.role === "ALUMNI" || profile?.role === "FACULTY" ? profile.role : "STUDENT",
    department: profile?.department ?? "Computer Science",
    bio: profile?.bio ?? "",
    city: profile?.city ?? "",
    skills: profile?.skills.join(", ") ?? "",
    phoneVisible: profile?.phoneVisible ?? false,
  };

  if (profile && isAlumniProfile(profile)) {
    return {
      ...base,
      role: "ALUMNI",
      graduationYear: profile.alumni.graduationYear ?? new Date().getFullYear() - 1,
      company: profile.alumni.company ?? "",
      designation: profile.alumni.designation ?? "",
      industry: profile.alumni.industry ?? "Software",
      experienceYears: profile.alumni.experienceYears ?? 0,
      mentorshipAvailable: profile.alumni.mentorshipAvailable,
      mentorCategories: profile.mentorCategories.join(", "),
      interests: profile.alumni.interests.join(", "),
      degree: profile.alumni.degree ?? "B.Tech",
      specialization: profile.alumni.specialization ?? profile.department,
    };
  }

  if (profile && isFacultyProfile(profile)) {
    return {
      ...base,
      role: "FACULTY",
      facultyId: profile.faculty.facultyId ?? "",
      academicTitle: profile.faculty.academicTitle ?? "",
      designation: profile.faculty.designation ?? "",
      researchInterests: profile.faculty.researchInterests.join(", "),
      publications: profile.faculty.publications.join(", "),
      interests: profile.faculty.interests.join(", "),
      officeHours: profile.faculty.officeHours ?? "",
      officeLocation: profile.faculty.officeLocation ?? "",
      mentorshipCapacity: profile.faculty.mentorshipCapacity,
    };
  }

  return {
    ...base,
    role: "STUDENT",
    studentId: profile && isStudentProfile(profile) ? profile.student.studentId ?? "" : "",
    currentYear: profile && isStudentProfile(profile) ? profile.student.currentYear ?? 1 : 1,
    degree: profile && isStudentProfile(profile) ? profile.student.degree ?? "B.Tech" : "B.Tech",
    specialization: profile && isStudentProfile(profile) ? profile.student.specialization ?? profile.department : profile?.department ?? "Computer Science",
    cgpa: profile && isStudentProfile(profile) ? profile.student.cgpa ?? undefined : undefined,
    interests: profile && isStudentProfile(profile) ? profile.student.interests.join(", ") : "",
    careerGoals: profile && isStudentProfile(profile) ? profile.student.careerGoals ?? "" : "",
  };
}

function buildOnboardingProfile(profile: Profile, input: OnboardingInput): Profile {
  const base = {
    ...profile,
    fullName: input.fullName,
    role: input.role,
    department: input.department,
    bio: input.bio ?? profile.bio,
    city: input.city ?? profile.city,
    skills: split(input.skills),
    phoneVisible: input.phoneVisible,
    status: "ACTIVE" as const,
    profileCompleteness: Math.max(profile.profileCompleteness, 84),
    updatedAt: new Date().toISOString(),
  };

  if (input.role === "ALUMNI") {
    return {
      ...base,
      role: "ALUMNI",
      displayTitle: input.designation,
      displayOrganization: input.company,
      displayIndustry: input.industry,
      mentorshipAvailable: input.mentorshipAvailable,
      mentorshipCapacity: input.mentorshipAvailable ? Math.max(profile.mentorshipCapacity, 4) : 0,
      mentorCategories: split(input.mentorCategories ?? ""),
      alumni: {
        graduationYear: input.graduationYear,
        company: input.company,
        designation: input.designation,
        industry: input.industry,
        experienceYears: input.experienceYears,
        mentorshipAvailable: input.mentorshipAvailable,
        interests: split(input.interests),
        degree: input.degree,
        specialization: input.specialization,
      },
    };
  }

  if (input.role === "FACULTY") {
    return {
      ...base,
      role: "FACULTY",
      displayTitle: input.academicTitle,
      mentorshipAvailable: input.mentorshipCapacity > 0,
      mentorshipCapacity: input.mentorshipCapacity,
      mentorCategories: input.mentorshipCapacity > 0 ? ["Research Guidance", "Project Advice"] : [],
      faculty: {
        facultyId: input.facultyId,
        academicTitle: input.academicTitle,
        designation: input.designation,
        researchInterests: split(input.researchInterests),
        publications: split(input.publications ?? ""),
        interests: split(input.interests),
        officeHours: input.officeHours ?? null,
        officeLocation: input.officeLocation ?? null,
        mentorshipCapacity: input.mentorshipCapacity,
      },
    };
  }

  return {
    ...base,
    role: "STUDENT",
    displayTitle: "Student",
    mentorshipAvailable: false,
    mentorshipCapacity: 0,
    mentorCategories: [],
    student: {
      studentId: input.studentId,
      currentYear: input.currentYear,
      degree: input.degree,
      specialization: input.specialization,
      cgpa: input.cgpa ?? null,
      interests: split(input.interests),
      careerGoals: input.careerGoals,
    },
  };
}

function split(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
