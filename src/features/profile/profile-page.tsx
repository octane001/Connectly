import { useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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

export function ProfilePage() {
  const { profile, updateProfile } = useAuthStore();
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN";

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.fullName ?? "",
      bio: profile?.bio ?? "",
      company: profile?.company ?? "",
      designation: profile?.designation ?? "",
      city: profile?.city ?? "",
      department: profile?.department ?? "",
      industry: profile?.industry ?? "",
      skills: profile?.skills.join(", ") ?? "",
      interests: profile?.interests.join(", ") ?? "",
      phoneVisible: profile?.phoneVisible ?? false,
    },
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
      updateProfile({ ...profile!, avatarUrl: url });
      push({ kind: "success", title: "Avatar updated" });
    },
    onError: () => push({ kind: "error", title: "Upload failed" }),
  });

  if (!profile) return null;

  const submit = (input: ProfileInput) => {
    const updatedProfile = {
      ...profile,
      fullName: input.fullName,
      bio: input.bio,
      company: input.company,
      designation: input.designation,
      city: input.city,
      department: input.department || profile.department,
      industry: input.industry || profile.industry,
      skills: split(input.skills),
      interests: split(input.interests),
      phoneVisible: input.phoneVisible,
      updatedAt: new Date().toISOString(),
    };
    updatedProfile.profileCompleteness = calculateCompleteness(updatedProfile);
    mutation.mutate(updatedProfile);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Profile"
        title={isAdmin ? "Admin profile" : "Professional identity"}
        description={isAdmin
          ? "Manage your admin details. Your college name will be displayed to all platform members."
          : "Manage your professional details, skills, and privacy settings. A complete profile improves mentor matching and directory visibility."
        }
      />

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="h-fit">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar name={profile.fullName} src={profile.avatarUrl} className="h-16 w-16" />
                <button
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="h-5 w-5 text-white" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) avatarMutation.mutate(f); }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{profile.fullName}</h2>
                <p className="text-sm text-muted-foreground">{profile.designation ?? profile.role.replace("_", " ")}</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm text-muted-foreground">
              {profile.company ? (<p className="flex items-center gap-2"><Building2 className="h-4 w-4" />{profile.company}</p>) : null}
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
            {!isAdmin && profile.skills.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {profile.skills.map((skill) => (<Badge key={skill} variant="outline">{skill}</Badge>))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isAdmin ? "Edit admin profile" : "Edit profile"}</CardTitle>
            <CardDescription>
              {isAdmin
                ? "Set your college name here — it will appear in the header for all platform members."
                : "Keep your details up to date to get better mentor matches and job recommendations."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
              <div className="space-y-2"><Label>Full name</Label><Input {...form.register("fullName")} /></div>
              <div className="space-y-2"><Label>{isAdmin ? "Role / Title" : "Designation"}</Label><Input {...form.register("designation")} placeholder={isAdmin ? "e.g. Platform Administrator" : ""} /></div>
              <div className="space-y-2"><Label>{isAdmin ? "College / Institution name" : "Company / Institution"}</Label><Input {...form.register("company")} placeholder={isAdmin ? "e.g. XYZ College of Engineering" : ""} /></div>
              <div className="space-y-2"><Label>City</Label><Input {...form.register("city")} /></div>

              {!isAdmin ? (
                <>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select {...form.register("department")}>
                      <option value="">Select department</option>
                      {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select {...form.register("industry")}>
                      <option value="">Select industry</option>
                      {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                    </Select>
                  </div>
                </>
              ) : null}

              <div className="space-y-2 md:col-span-2"><Label>{isAdmin ? "About / Description" : "Bio"}</Label><Textarea {...form.register("bio")} placeholder={isAdmin ? "Brief description about the institution or admin role" : ""} /></div>

              {!isAdmin ? (
                <>
                  <div className="space-y-2"><Label>Skills</Label><Input {...form.register("skills")} /></div>
                  <div className="space-y-2"><Label>Interests</Label><Input {...form.register("interests")} /></div>
                  <label className="flex items-center gap-2 rounded-md border p-3 text-sm md:col-span-2">
                    <input type="checkbox" {...form.register("phoneVisible")} />
                    Enable phone / WhatsApp visibility when a request is accepted
                  </label>
                </>
              ) : null}

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

function split(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

/** Calculate profile completeness as a percentage based on how many fields are filled */
function calculateCompleteness(p: any): number {
  const isAdmin = p.role === "ADMIN" || p.role === "SUPER_ADMIN";

  if (isAdmin) {
    // Admin only needs: name, company (college name), designation, city, bio, avatar
    const checks = [
      { filled: !!p.fullName, weight: 20 },
      { filled: !!p.company, weight: 25 },
      { filled: !!p.designation, weight: 15 },
      { filled: !!p.city, weight: 15 },
      { filled: !!p.bio && p.bio.length >= 10, weight: 15 },
      { filled: !!p.avatarUrl, weight: 10 },
    ];
    return Math.min(100, checks.reduce((sum, c) => sum + (c.filled ? c.weight : 0), 0));
  }

  const checks = [
    { filled: !!p.fullName, weight: 10 },
    { filled: !!p.bio && p.bio.length >= 10, weight: 15 },
    { filled: !!p.company, weight: 10 },
    { filled: !!p.designation, weight: 10 },
    { filled: !!p.city, weight: 10 },
    { filled: !!p.department, weight: 5 },
    { filled: !!p.industry, weight: 5 },
    { filled: Array.isArray(p.skills) && p.skills.length > 0, weight: 15 },
    { filled: Array.isArray(p.interests) && p.interests.length > 0, weight: 10 },
    { filled: !!p.avatarUrl, weight: 10 },
  ];
  return Math.min(100, checks.reduce((sum, c) => sum + (c.filled ? c.weight : 0), 0));
}
