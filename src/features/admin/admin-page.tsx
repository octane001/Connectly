import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BadgeCheck, Ban, Briefcase, ChevronLeft, ChevronRight, Download, FileSpreadsheet, GraduationCap, Loader2, Search, Shield, Sparkles, Upload, UserCog, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/ui/use-toast";
import { 
  getAnalytics, 
  listPendingUsers, 
  listPendingJobs, 
  approveUser, 
  rejectUser, 
  moderateJob, 
  bulkImportAlumni, 
  listAllUsers,
  updateUserRole,
  transitionGraduatedStudents,
  type AlumniImportRow 
} from "@/lib/api";
import type { UserRole } from "@/types/domain";

export function AdminPage() {
  const analytics = useQuery({ queryKey: ["admin-analytics"], queryFn: getAnalytics });
  const pending = useQuery({ queryKey: ["pending-users"], queryFn: listPendingUsers });
  const pendingJobs = useQuery({ queryKey: ["pending-jobs"], queryFn: listPendingJobs });
  const { push } = useToast();
  const data = analytics.data;

  const approve = useMutation({
    mutationFn: (id: string) => approveUser(id),
    onSuccess: () => push({ kind: "success", title: "User approved", description: "User now has full access." }),
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectUser(id),
    onSuccess: () => push({ kind: "info", title: "User suspended", description: "Account has been suspended." }),
  });

  const jobMod = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "PUBLISHED" | "ARCHIVED" }) => moderateJob(id, status),
    onSuccess: () => push({ kind: "success", title: "Job updated", description: "Job status has been changed." }),
  });

  const transitionStudents = useMutation({
    mutationFn: () => transitionGraduatedStudents(),
    onSuccess: (count) => push({ 
      kind: "success", 
      title: "Transition complete", 
      description: `${count} students have been promoted to Alumni based on their graduation year.` 
    }),
    onError: (err: any) => push({ kind: "error", title: "Transition failed", description: err.message }),
  });

  const stats = [
    { label: "Total users", value: data?.totalUsers ?? 0, icon: Users },
    { label: "Active mentors", value: data?.activeMentors ?? 0, icon: Sparkles },
    { label: "Pending approvals", value: data?.pendingApprovals ?? 0, icon: Shield },
    { label: "Open jobs", value: data?.openJobs ?? 0, icon: Briefcase },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin console"
        title="Manage approvals, engagement, and moderation"
        description="Role-aware workflows for user verification, alumni imports, job moderation, event management, mentorship analytics, and engagement tracking."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-2xl font-semibold">{stat.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Engagement trend</CardTitle>
            <CardDescription>Monthly users, mentorship activity, and job engagement.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthlyEngagement ?? []}>
                <defs>
                  <linearGradient id="users" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="#0f172a" fillOpacity={1} fill="url(#users)" />
                <Area type="monotone" dataKey="mentorship" stroke="#059669" fill="transparent" />
                <Area type="monotone" dataKey="jobs" stroke="#2563eb" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval queue</CardTitle>
            <CardDescription>Users awaiting review ({pending.data?.length ?? 0} pending).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(pending.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No pending approvals.</p>
            ) : null}
            {(pending.data ?? []).map((user) => (
              <div key={user.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={user.fullName} className="h-10 w-10" />
                    <div>
                      <p className="font-medium">{user.fullName}</p>
                      <p className="text-sm text-muted-foreground">{user.role} · {user.department}</p>
                    </div>
                  </div>
                  <Badge variant={user.status === "PENDING" ? "warning" : "outline"}>{user.status}</Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" disabled={approve.isPending} onClick={() => approve.mutate(user.id)}>
                    <BadgeCheck className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" disabled={reject.isPending} onClick={() => reject.mutate(user.id)}>
                    <Ban className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <UserManagement />

      {/* Bulk Alumni Upload */}
      <BulkAlumniUpload />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Job Moderation */}
        <Card>
          <CardHeader>
            <CardTitle>Job moderation</CardTitle>
            <CardDescription>Review and approve or archive submitted job postings ({pendingJobs.data?.length ?? 0} pending).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(pendingJobs.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No jobs awaiting moderation.</p>
            ) : null}
            {(pendingJobs.data ?? []).map((job) => (
              <div key={job.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-sm text-muted-foreground">{job.organization} · {job.location}</p>
                  </div>
                  <Badge variant="warning">{job.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{job.description.slice(0, 120)}...</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => jobMod.mutate({ id: job.id, status: "PUBLISHED" })}>
                    <BadgeCheck className="h-4 w-4" /> Publish
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => jobMod.mutate({ id: job.id, status: "ARCHIVED" })}>
                    <Ban className="h-4 w-4" /> Archive
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* System Actions */}
        <Card>
          <CardHeader>
            <CardTitle>System actions</CardTitle>
            <CardDescription>Automated workflows for maintenance and data integrity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Graduate Students</p>
                <p className="text-xs text-muted-foreground">Transition students to Alumni role if their graduation year has passed.</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => transitionStudents.mutate()}
                disabled={transitionStudents.isPending}
              >
                {transitionStudents.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GraduationCap className="mr-2 h-4 w-4" />}
                Run Transition
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── User Management Component ───────────────────────────────────── */

const PAGE_SIZE = 12;

function UserManagement() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);
  const { push } = useToast();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["user-list", search, roleFilter, page],
    queryFn: () => listAllUsers({ search, role: roleFilter, page, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const users = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => updateUserRole(id, role),
    onMutate: ({ id }) => setPendingRoleId(id),
    onSuccess: (_data, vars) => {
      push({ kind: "success", title: "Role updated", description: `Role changed to ${vars.role.replace("_", " ")} successfully.` });
      setPendingRoleId(null);
    },
    onError: (err: any) => {
      push({ kind: "error", title: "Update failed", description: err.message });
      setPendingRoleId(null);
    },
  });

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };
  const handleRoleFilter = (val: string) => { setRoleFilter(val as UserRole | "ALL"); setPage(1); };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" /> User Role Management
            </CardTitle>
            <CardDescription className="mt-1">
              All platform users are listed. Use the role dropdown on any user card to change their role instantly.
            </CardDescription>
          </div>
          <span className="shrink-0 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {totalCount} user{totalCount !== 1 ? "s" : ""}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="user-management-search"
              className="focus-ring h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Select
            value={roleFilter}
            onChange={(e) => handleRoleFilter(e.target.value)}
            className="w-full sm:w-44"
          >
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Student</option>
            <option value="ALUMNI">Alumni</option>
            <option value="FACULTY">Faculty</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && users.length === 0 && (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No users found</p>
            {(search || roleFilter !== "ALL") && (
              <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search or role filter.</p>
            )}
          </div>
        )}

        {/* User cards grid */}
        {users.length > 0 && (
          <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}>
            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* User info */}
                <div className="flex items-start gap-3">
                  <Avatar name={user.fullName} src={user.avatarUrl ?? undefined} className="h-11 w-11 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{user.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email ?? "No email"}</p>
                    <p className="text-xs text-muted-foreground">{user.department}</p>
                  </div>
                </div>

                {/* Current role badge + status */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-full border border-foreground/20 bg-foreground/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground">
                    {user.role.replace("_", " ")}
                  </span>
                  <span className={`ml-auto h-2 w-2 rounded-full border border-foreground/30 ${user.status === "ACTIVE" ? "bg-foreground" : "bg-transparent"}`} title={user.status} />
                  <span className="text-[10px] text-muted-foreground">{user.status}</span>
                </div>

                {/* Role change dropdown */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Change Role</p>
                  {pendingRoleId === user.id ? (
                    <div className="flex h-10 items-center gap-2 rounded-md border bg-muted px-3 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Updating…
                    </div>
                  ) : (
                    <Select
                      value={user.role}
                      onChange={(e) => changeRole.mutate({ id: user.id, role: e.target.value as UserRole })}
                      disabled={pendingRoleId !== null}
                    >
                      <option value="STUDENT">🎓 Student</option>
                      <option value="ALUMNI">🏢 Alumni</option>
                      <option value="FACULTY">🔬 Faculty</option>
                      <option value="ADMIN">🛡️ Admin</option>
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {totalCount} total users
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isFetching}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isFetching}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Bulk Alumni Upload Component ─────────────────────────────────── */

function BulkAlumniUpload() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<AlumniImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const { push } = useToast();
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number; errors: string[] } | null>(null);
  const [importedEmails, setImportedEmails] = useState<string[]>([]);

  const inviteMessage = `🎓 *Connectly — Alumni Network*\n\nDear Alumni,\n\nYour profile has been added to our official alumni platform *Connectly*.\n\n✅ Login with your Google account to claim your profile\n📋 Connect with batchmates, find mentors, explore job opportunities\n🔗 *${window.location.origin}*\n\nBest regards,\nCollege Administration`;

  const importMutation = useMutation({
    mutationFn: () => bulkImportAlumni(preview),
    onSuccess: (result) => {
      push({
        kind: "success",
        title: `Import complete`,
        description: `${result.inserted} added, ${result.skipped} skipped.`,
      });
      if (result.errors.length > 0) {
        console.warn("Import errors:", result.errors);
      }
      setImportResult(result);
      setImportedEmails(preview.map(r => r.email));
      setPreview([]);
      setFileName("");
    },
    onError: () => push({ kind: "error", title: "Import failed" }),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        push({ kind: "error", title: "Empty file", description: "No valid rows found. Check the CSV format." });
        return;
      }
      setPreview(rows);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csv = "full_name,email,department,graduation_year,company,designation,city\nRahul Sharma,rahul.sharma@example.com,Computer Science,2022,TCS,Software Engineer,Mumbai\nPriya Patel,priya.patel@example.com,Electronics,2021,Infosys,System Analyst,Bangalore";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alumni_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Bulk Alumni Upload</CardTitle>
        <CardDescription>
          Upload a CSV file with alumni data. Each alumni will be created with INVITED status and ALUMNI role. They can later login with Google to claim their profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Instructions */}
          <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <p className="font-medium">CSV Format — Required columns:</p>
            <code className="mt-2 block rounded bg-muted p-2 text-xs">
              full_name, email, department, graduation_year, company, designation, city
            </code>
            <p className="mt-2 text-muted-foreground">
              <strong>full_name</strong>, <strong>email</strong>, <strong>department</strong>, <strong>graduation_year</strong> are required. Others are optional.
              Duplicate emails are automatically skipped.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4" /> Download Template
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> {fileName || "Choose CSV File"}
            </Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>

          {/* Preview */}
          {preview.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{preview.length} alumni found in file</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setPreview([]); setFileName(""); }}>Cancel</Button>
                  <Button size="sm" onClick={() => importMutation.mutate()} disabled={importMutation.isPending}>
                    {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Import {preview.length} Alumni
                  </Button>
                </div>
              </div>
              <div className="max-h-72 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left font-medium">#</th>
                      <th className="p-2 text-left font-medium">Name</th>
                      <th className="p-2 text-left font-medium">Email</th>
                      <th className="p-2 text-left font-medium">Department</th>
                      <th className="p-2 text-left font-medium">Year</th>
                      <th className="p-2 text-left font-medium">Company</th>
                      <th className="p-2 text-left font-medium">City</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2">{row.full_name}</td>
                        <td className="p-2 text-muted-foreground">{row.email}</td>
                        <td className="p-2">{row.department}</td>
                        <td className="p-2">{row.graduation_year}</td>
                        <td className="p-2">{row.company || "—"}</td>
                        <td className="p-2">{row.city || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Invite Section — shown after successful import */}
          {importResult && importResult.inserted > 0 ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-200">✅ {importResult.inserted} alumni imported successfully!</h4>
                  <p className="mt-1 text-sm text-green-700 dark:text-green-300">Now share the invitation so they can login and claim their profiles.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setImportResult(null)}>Dismiss</Button>
              </div>

              <div className="mt-4 rounded-md border bg-white p-4 text-sm whitespace-pre-line dark:bg-gray-900">
                {inviteMessage.replace(/\\n/g, "\n")}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteMessage.replace(/\\n/g, "\n").replace(/\*/g, ""));
                    push({ kind: "success", title: "Copied!", description: "Invitation message copied to clipboard." });
                  }}
                >
                  📋 Copy to Clipboard
                </Button>
                <Button
                  onClick={() => {
                    const text = encodeURIComponent(inviteMessage.replace(/\\n/g, "\n"));
                    window.open(`https://wa.me/?text=${text}`, "_blank");
                  }}
                >
                  💬 Share on WhatsApp
                </Button>
                <Button
                  onClick={() => {
                    const emails = importedEmails.join(",");
                    const subject = encodeURIComponent("You're invited to Connectly - Alumni Network");
                    const body = encodeURIComponent(inviteMessage.replace(/\\n/g, "\n").replace(/\*/g, ""));
                    window.open("https://mail.google.com/mail/?view=cm&fs=1&to=" + emails + "&su=" + subject + "&body=" + body, "_blank");
                    push({ kind: "success", title: "Gmail opened", description: importedEmails.length + " recipients added. Hit Send!" });
                  }}
                >
                  ✉️ Send Email to All ({importedEmails.length})
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── CSV Parser ──────────────────────────────────────────────────── */

function parseCSV(text: string): AlumniImportRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows: AlumniImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;

    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = values[idx]?.trim() ?? ""; });

    if (obj.full_name && obj.email && obj.department && obj.graduation_year) {
      rows.push({
        full_name: obj.full_name,
        email: obj.email,
        department: obj.department,
        graduation_year: parseInt(obj.graduation_year, 10),
        company: obj.company || undefined,
        designation: obj.designation || undefined,
        city: obj.city || undefined,
      });
    }
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current); current = ""; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}
