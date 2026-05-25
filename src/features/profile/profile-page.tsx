import { useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm, type UseFormReturn } from "react-hook-form";
import { Building2, Camera, Loader2, MapPin, Save, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { PageHeader } from "@/components/page-header";
import { DEPARTMENTS, INDUSTRIES } from "@/lib/constants";
import { saveProfile, uploadAvatar } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { profileSchema, type ProfileInput } from "@/features/onboarding/schemas";
import {
  getProfileDisplayOrganization,
  getProfileDisplayTitle,
  isAdminProfile,
  isAlumniProfile,
  isFacultyProfile,
  isStudentProfile,
  type Profile,
} from "@/types/domain";

export function ProfilePage() {
  const { profile, updateProfile } = useAuthStore();
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileDefaults(profile) as any,
  });

  const mutation = useMutation({
    mutationFn: saveProfile,
    onSuccess: (updated) => {
      updateProfile(updated);
      push({ kind: "success", title: "Profile saved", description: "Your profile has been updated successfully." });
    },
    onError: () => push({ kind: "error", title: "Save failed", description: "Could not save profile. Please try again." }),
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(profile!.authUserId!, profile!.id, file),
    onSuccess: (url) => {
      updateProfile({ ...profile!, avatarUrl: url } as Profile);
      push({ kind: "success", title: "Avatar updated" });
    },
    onError: () => push({ kind: "error", title: "Upload failed" }),
  });

  if (!profile) return null;

  const submit = (input: ProfileInput) => {
    const updatedProfile = buildProfile(profile, input);
    updatedProfile.profileCompleteness = calculateCompleteness(updatedProfile);
    mutation.mutate(updatedProfile);
  };

  const organization = getProfileDisplayOrganization(profile);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Profile"
        title={isAdminProfile(profile) ? "Admin profile" : "Role-based profile"}
        description={isAdminProfile(profile)
          ? "Manage admin identity and internal platform settings."
          : "Keep your role-specific details current for directory search, mentorship, and opportunities."
        }
      />

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="h-fit">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="group relative">
                <Avatar name={profile.fullName} src={profile.avatarUrl} className="h-16 w-16" />
                <button
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => fileRef.current?.click()}
                  type="button"
                >
                  <Camera className="h-5 w-5 text-white" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) avatarMutation.mutate(f); }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{profile.fullName}</h2>
                <p className="text-sm text-muted-foreground">{getProfileDisplayTitle(profile)}</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm text-muted-foreground">
              {organization ? (<p className="flex items-center gap-2"><Building2 className="h-4 w-4" />{organization}</p>) : null}
              {profile.city ? (<p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{profile.city}</p>) : null}
              <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Email hidden from public directory</p>
            </div>
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Completeness</span>
                <span>{profile.profileCompleteness}%</span>
              </div>
              <Progress value={profile.profileCompleteness} />
            </div>
            {!isAdminProfile(profile) && profile.skills.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {profile.skills.map((skill) => (<Badge key={skill} variant="outline">{skill}</Badge>))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit {profile.role.replace("_", " ").toLowerCase()} profile</CardTitle>
            <CardDescription>Only fields owned by your role are shown here.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
              <input type="hidden" {...form.register("role")} />
              <CommonFields form={form} profile={profile} />
              {isStudentProfile(profile) ? <StudentFields form={form} /> : null}
              {isAlumniProfile(profile) ? <AlumniFields form={form} /> : null}
              {isFacultyProfile(profile) ? <FacultyFields form={form} /> : null}
              {isAdminProfile(profile) ? <AdminFields form={form} /> : null}

              <Button className="md:col-span-2" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save profile
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CommonFields({ form, profile }: { form: UseFormReturn<ProfileInput>; profile: Profile }) {
  return (
    <>
      <div className="space-y-2"><Label>Full name</Label><Input {...form.register("fullName")} /></div>
      <div className="space-y-2"><Label>City</Label><Input {...form.register("city" as any)} /></div>
      <div className="space-y-2">
        <Label>Department</Label>
        {isAdminProfile(profile) ? (
          <Input {...form.register("department" as any)} />
        ) : (
          <Select {...form.register("department")}>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        )}
      </div>
      <div className="space-y-2"><Label>Skills</Label><Input {...form.register("skills" as any)} /></div>
      <div className="space-y-2 md:col-span-2"><Label>Bio</Label><Textarea {...form.register("bio" as any)} /></div>
      {!isAdminProfile(profile) ? (
        <label className="flex items-center gap-2 rounded-md border p-3 text-sm md:col-span-2">
          <input type="checkbox" {...form.register("phoneVisible" as any)} />
          Enable phone / WhatsApp visibility when a request is accepted
        </label>
      ) : null}
    </>
  );
}

function StudentFields({ form }: { form: UseFormReturn<ProfileInput> }) {
  return (
    <>
      <div className="space-y-2"><Label>Student ID</Label><Input {...form.register("studentId" as any)} /></div>
      <div className="space-y-2"><Label>Current year</Label><Input type="number" min={1} max={8} {...form.register("currentYear" as any)} /></div>
      <div className="space-y-2"><Label>Degree</Label><Input {...form.register("degree" as any)} /></div>
      <div className="space-y-2"><Label>Specialization</Label><Input {...form.register("specialization" as any)} /></div>
      <div className="space-y-2"><Label>CGPA</Label><Input type="number" step="0.01" min={0} max={10} {...form.register("cgpa" as any)} /></div>
      <div className="space-y-2"><Label>Interests</Label><Input {...form.register("interests" as any)} /></div>
      <div className="space-y-2 md:col-span-2"><Label>Career goals</Label><Textarea {...form.register("careerGoals" as any)} /></div>
    </>
  );
}

function AlumniFields({ form }: { form: UseFormReturn<ProfileInput> }) {
  return (
    <>
      <div className="space-y-2"><Label>Graduation year</Label><Input type="number" {...form.register("graduationYear" as any)} /></div>
      <div className="space-y-2"><Label>Degree</Label><Input {...form.register("degree" as any)} /></div>
      <div className="space-y-2"><Label>Specialization</Label><Input {...form.register("specialization" as any)} /></div>
      <div className="space-y-2"><Label>Company</Label><Input {...form.register("company" as any)} /></div>
      <div className="space-y-2"><Label>Designation</Label><Input {...form.register("designation" as any)} /></div>
      <div className="space-y-2">
        <Label>Industry</Label>
        <Select {...form.register("industry" as any)}>
          {INDUSTRIES.map((industry) => <option key={industry}>{industry}</option>)}
        </Select>
      </div>
      <div className="space-y-2"><Label>Experience years</Label><Input type="number" min={0} {...form.register("experienceYears" as any)} /></div>
      <div className="space-y-2"><Label>Interests</Label><Input {...form.register("interests" as any)} /></div>
      <div className="space-y-2"><Label>Mentorship categories</Label><Input {...form.register("mentorCategories" as any)} /></div>
      <label className="flex items-center gap-2 rounded-md border p-3 text-sm md:col-span-2">
        <input type="checkbox" {...form.register("mentorshipAvailable" as any)} />
        Available for student mentorship
      </label>
    </>
  );
}

function FacultyFields({ form }: { form: UseFormReturn<ProfileInput> }) {
  return (
    <>
      <div className="space-y-2"><Label>Faculty ID</Label><Input {...form.register("facultyId" as any)} /></div>
      <div className="space-y-2"><Label>Academic title</Label><Input {...form.register("academicTitle" as any)} /></div>
      <div className="space-y-2"><Label>Designation</Label><Input {...form.register("designation" as any)} /></div>
      <div className="space-y-2"><Label>Office location</Label><Input {...form.register("officeLocation" as any)} /></div>
      <div className="space-y-2"><Label>Office hours</Label><Input {...form.register("officeHours" as any)} /></div>
      <div className="space-y-2"><Label>Mentorship capacity</Label><Input type="number" min={0} {...form.register("mentorshipCapacity" as any)} /></div>
      <div className="space-y-2"><Label>Research interests</Label><Input {...form.register("researchInterests" as any)} /></div>
      <div className="space-y-2"><Label>Interests (General)</Label><Input {...form.register("interests" as any)} /></div>
      <div className="space-y-2 md:col-span-2"><Label>Publications</Label><Textarea {...form.register("publications" as any)} /></div>
    </>
  );
}

function AdminFields({ form }: { form: UseFormReturn<ProfileInput> }) {
  return (
    <>
      <div className="space-y-2"><Label>Institution name</Label><Input {...form.register("institutionName" as any)} /></div>
      <div className="space-y-2"><Label>Internal role</Label><Input {...form.register("internalRole" as any)} /></div>
      <div className="space-y-2"><Label>Admin level</Label><Input {...form.register("adminLevel" as any)} /></div>
      <div className="space-y-2"><Label>Permissions</Label><Input placeholder="APPROVE_USERS, MODERATE_JOBS" {...form.register("permissions" as any)} /></div>
    </>
  );
}

function profileDefaults(profile: Profile | null): Partial<ProfileInput> {
  if (!profile) return {};
  const base = {
    fullName: profile.fullName,
    role: profile.role,
    department: profile.department,
    bio: profile.bio ?? "",
    city: profile.city ?? "",
    skills: profile.skills.join(", "),
    phoneVisible: profile.phoneVisible,
  };

  if (isAlumniProfile(profile)) {
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

  if (isFacultyProfile(profile)) {
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

  if (isAdminProfile(profile)) {
    return {
      ...base,
      role: profile.role,
      institutionName: profile.admin.institutionName ?? "",
      adminLevel: profile.admin.adminLevel,
      permissions: profile.admin.permissions.join(", "),
      internalRole: profile.admin.internalRole ?? "",
      skills: profile.skills.join(", "),
    };
  }

  return {
    ...base,
    role: "STUDENT",
    studentId: profile.student.studentId ?? "",
    currentYear: profile.student.currentYear ?? 1,
    degree: profile.student.degree ?? "B.Tech",
    specialization: profile.student.specialization ?? profile.department,
    cgpa: profile.student.cgpa ?? undefined,
    interests: profile.student.interests.join(", "),
    careerGoals: profile.student.careerGoals ?? "",
  };
}

function buildProfile(profile: Profile, input: ProfileInput): Profile {
  const base = {
    ...profile,
    fullName: input.fullName,
    department: input.department,
    bio: input.bio ?? profile.bio,
    city: input.city ?? profile.city,
    skills: split(input.skills ?? ""),
    phoneVisible: input.phoneVisible,
    updatedAt: new Date().toISOString(),
  };

  if (input.role === "ALUMNI" && isAlumniProfile(profile)) {
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

  if (input.role === "FACULTY" && isFacultyProfile(profile)) {
    return {
      ...base,
      role: "FACULTY",
      displayTitle: input.academicTitle,
      mentorshipAvailable: input.mentorshipCapacity > 0,
      mentorshipCapacity: input.mentorshipCapacity,
      mentorCategories: input.mentorshipCapacity > 0 ? profile.mentorCategories : [],
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

  if (input.role === "ADMIN" && isAdminProfile(profile)) {
    return {
      ...base,
      role: input.role,
      displayTitle: input.internalRole,
      displayOrganization: input.institutionName,
      displayIndustry: "Education",
      mentorshipAvailable: false,
      mentorshipCapacity: 0,
      mentorCategories: [],
      admin: {
        adminLevel: input.adminLevel,
        permissions: split(input.permissions ?? ""),
        internalRole: input.internalRole ?? null,
        institutionName: input.institutionName ?? null,
      },
    };
  }

  if (input.role === "STUDENT" && isStudentProfile(profile)) {
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

  return profile;
}

function split(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function calculateCompleteness(profile: Profile): number {
  const common = [
    { filled: !!profile.fullName, weight: 10 },
    { filled: !!profile.department, weight: 8 },
    { filled: !!profile.bio && profile.bio.length >= 10, weight: 12 },
    { filled: !!profile.city, weight: 8 },
    { filled: profile.skills.length > 0, weight: 12 },
    { filled: !!profile.avatarUrl, weight: 10 },
  ];

  const roleChecks = isStudentProfile(profile)
    ? [
        { filled: !!profile.student.studentId, weight: 10 },
        { filled: !!profile.student.degree, weight: 8 },
        { filled: !!profile.student.specialization, weight: 8 },
        { filled: profile.student.interests.length > 0, weight: 8 },
        { filled: !!profile.student.careerGoals, weight: 14 },
      ]
    : isAlumniProfile(profile)
    ? [
        { filled: !!profile.alumni.graduationYear, weight: 10 },
        { filled: !!profile.alumni.company, weight: 12 },
        { filled: !!profile.alumni.designation, weight: 10 },
        { filled: !!profile.alumni.industry, weight: 8 },
        { filled: profile.mentorCategories.length > 0 || profile.alumni.mentorshipAvailable, weight: 10 },
      ]
    : isFacultyProfile(profile)
    ? [
        { filled: !!profile.faculty.facultyId, weight: 10 },
        { filled: !!profile.faculty.academicTitle, weight: 10 },
        { filled: profile.faculty.researchInterests.length > 0, weight: 14 },
        { filled: !!profile.faculty.officeLocation, weight: 6 },
        { filled: profile.faculty.mentorshipCapacity > 0, weight: 10 },
      ]
    : [
        { filled: !!profile.admin.institutionName, weight: 15 },
        { filled: !!profile.admin.internalRole, weight: 15 },
        { filled: !!profile.admin.adminLevel, weight: 10 },
        { filled: profile.admin.permissions.length > 0, weight: 10 },
      ];

  return Math.min(100, [...common, ...roleChecks].reduce((sum, item) => sum + (item.filled ? item.weight : 0), 0));
}
