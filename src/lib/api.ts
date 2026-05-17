import { demoAnalytics, demoEvents, demoFeedPosts, demoJobs, demoNotifications, demoProfiles, demoThreads } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { calculateMentorMatches } from "@/features/matching/matching";
import { normalizeDirectoryFilters, paginationRange, profileMatchesFilters } from "@/features/directory/directory-query";
import type {
  AnalyticsSnapshot,
  DirectoryFilters,
  Event,
  FeedPost,
  Job,
  MatchResult,
  MessageThread,
  MentorshipRequest,
  NotificationItem,
  Profile,
} from "@/types/domain";

const delay = (ms = 150) => new Promise((resolve) => window.setTimeout(resolve, ms));

function parseList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

// ─── Profiles / Directory ────────────────────────────────────────────

export async function listProfiles(filters: DirectoryFilters = {}): Promise<{ data: Profile[]; count: number }> {
  const normalized = normalizeDirectoryFilters(filters);
  const { from, to } = paginationRange(normalized.page, normalized.pageSize);

  if (!supabase) {
    await delay();
    const filtered = demoProfiles.filter((profile) => profileMatchesFilters(profile, filters));
    return { data: filtered.slice(from, to + 1), count: filtered.length };
  }

  let query = (supabase as any)
    .from("profile_directory")
    .select("*", { count: "exact" })
    .eq("status", "ACTIVE")
    .range(from, to)
    .order("profile_completeness", { ascending: false });

  if (normalized.search) query = query.textSearch("search_document", normalized.search, { type: "websearch" });
  if (normalized.department) query = query.eq("department", normalized.department);
  if (normalized.graduationYear) query = query.eq("graduation_year", Number(normalized.graduationYear));
  if (normalized.company) query = query.ilike("company", `%${normalized.company}%`);
  if (normalized.industry) query = query.eq("industry", normalized.industry);
  if (normalized.city) query = query.ilike("city", `%${normalized.city}%`);
  if (normalized.role) query = query.eq("role", normalized.role);
  if (normalized.mentorship) query = query.eq("is_mentor", true);
  if (normalized.skill) query = query.contains("skills", [normalized.skill]);

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: (data ?? []).map(mapDirectoryRow), count: count ?? 0 };
}

export async function getProfile(id: string): Promise<Profile | null> {
  if (!supabase) {
    await delay();
    return demoProfiles.find((profile) => profile.id === id) ?? null;
  }
  const { data, error } = await (supabase as any).from("profile_directory").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapDirectoryRow(data) : null;
}

export async function getMyFullProfile(authUserId: string): Promise<Profile | null> {
  if (!supabase) return demoProfiles[0];
  const { data, error } = await (supabase as any).from("profile_directory").select("*").eq("auth_user_id", authUserId).maybeSingle();
  if (error) throw error;
  return data ? mapDirectoryRow(data) : null;
}

export async function getCollegeName(): Promise<string> {
  if (!supabase) return "Demo University";
  const { data } = await (supabase as any).from("profiles").select("company").in("role", ["ADMIN", "SUPER_ADMIN"]).not("company", "is", null).limit(1).maybeSingle();
  return data?.company ?? "Alumni Network";
}

// ─── Mentor Matching ─────────────────────────────────────────────────

export async function getRecommendedMentors(student: Profile): Promise<MatchResult[]> {
  if (!supabase) {
    await delay();
    return calculateMentorMatches(student, demoProfiles);
  }
  // Fetch all active alumni and faculty as potential mentors (not just is_mentor=true)
  const { data, error } = await (supabase as any)
    .from("profile_directory").select("*").eq("status", "ACTIVE").in("role", ["ALUMNI", "FACULTY"]).limit(80);
  if (error) throw error;
  return calculateMentorMatches(student, (data ?? []).map(mapDirectoryRow));
}

// ─── Jobs ────────────────────────────────────────────────────────────

export async function listJobs(search = ""): Promise<Job[]> {
  if (!supabase) {
    await delay();
    return demoJobs.filter((job) => [job.title, job.organization, job.skills.join(" ")].join(" ").toLowerCase().includes(search.toLowerCase()));
  }
  let query = (supabase as any).from("job_cards").select("*").eq("status", "PUBLISHED").order("created_at", { ascending: false }).limit(40);
  if (search) query = query.or(`title.ilike.%${search}%,organization.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapJobRow);
}

export async function createJob(input: { title: string; organization: string; location: string; type: string; deadline: string; skills: string; description: string; postedBy: string; posterRole?: string }) {
  if (!supabase) {
    await delay();
    return { id: crypto.randomUUID(), title: input.title, organization: input.organization, location: input.location, type: input.type, deadline: input.deadline, skills: parseList(input.skills), description: input.description, postedBy: input.postedBy, status: "PUBLISHED", createdAt: new Date().toISOString() } as Job;
  }
  // Admin/SuperAdmin jobs are auto-published, others need approval
  const autoPublish = input.posterRole === "ADMIN" || input.posterRole === "SUPER_ADMIN";
  const { error } = await (supabase as any).from("jobs").insert({
    posted_by: input.postedBy, title: input.title, organization: input.organization, location: input.location,
    type: input.type, deadline: input.deadline, skills: parseList(input.skills), description: input.description,
    status: autoPublish ? "PUBLISHED" : "PENDING",
  });
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["jobs"] });
  queryClient.invalidateQueries({ queryKey: ["pending-jobs"] });

  // Broadcast notification to all users when admin publishes a job
  if (autoPublish) {
    try {
      const { data: allProfiles } = await (supabase as any).from("profiles").select("id").eq("status", "ACTIVE");
      if (allProfiles && allProfiles.length > 0) {
        const notifications = allProfiles
          .filter((p: any) => p.id !== input.postedBy)
          .map((p: any) => ({ profile_id: p.id, title: `New job: ${input.title}`, body: `${input.title} at ${input.organization} (${input.type.replace("_", " ")})` }));
        if (notifications.length > 0) await (supabase as any).from("notifications").insert(notifications);
      }
    } catch { /* best-effort */ }
  }
}

export async function applyToJob(jobId: string, profileId: string, note = "") {
  if (!supabase) { await delay(); return; }
  const { error } = await (supabase as any).from("job_applications").insert({ job_id: jobId, applicant_id: profileId, note });
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["my-applications"] });
}

export async function listMyApplications(profileId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await (supabase as any).from("job_applications").select("job_id").eq("applicant_id", profileId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.job_id);
}

export async function listPendingJobs(): Promise<Job[]> {
  if (!supabase) return [];
  // Query jobs table directly (not the view) to ensure admin RLS applies
  const { data, error } = await (supabase as any).from("jobs").select("*, profiles(full_name)").eq("status", "PENDING").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id, title: row.title, organization: row.organization, location: row.location,
    type: row.type, deadline: row.deadline, skills: row.skills ?? [], description: row.description,
    postedBy: row.profiles?.full_name ?? "Alumni", status: row.status, createdAt: row.created_at,
  }));
}

export async function moderateJob(jobId: string, status: "PUBLISHED" | "ARCHIVED") {
  if (!supabase) return;
  const { error } = await (supabase as any).from("jobs").update({ status }).eq("id", jobId);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["jobs"] });
  queryClient.invalidateQueries({ queryKey: ["pending-jobs"] });
}

// ─── Events ──────────────────────────────────────────────────────────

export async function listEvents(): Promise<Event[]> {
  if (!supabase) { await delay(); return demoEvents; }
  const { data, error } = await (supabase as any).from("event_cards").select("*").gte("starts_at", new Date().toISOString()).order("starts_at").limit(40);
  if (error) throw error;
  return (data ?? []).map(mapEventRow);
}

export async function createEvent(input: { title: string; type: string; startsAt: string; location: string; description: string; capacity?: number; createdBy: string }) {
  if (!supabase) {
    await delay();
    return { id: crypto.randomUUID(), title: input.title, type: input.type, startsAt: input.startsAt, endsAt: null, location: input.location, description: input.description, capacity: input.capacity ?? null, registrations: 0, createdBy: input.createdBy } as Event;
  }
  const { error } = await (supabase as any).from("events").insert({
    created_by: input.createdBy, title: input.title, type: input.type, starts_at: input.startsAt, location: input.location, description: input.description, capacity: input.capacity,
  });
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["events"] });

  // Broadcast notification to all users about the new event
  try {
    const { data: allProfiles } = await (supabase as any).from("profiles").select("id").eq("status", "ACTIVE");
    if (allProfiles && allProfiles.length > 0) {
      const notifications = allProfiles
        .filter((p: any) => p.id !== input.createdBy)
        .map((p: any) => ({ profile_id: p.id, title: `New event: ${input.title}`, body: `${input.title} on ${new Date(input.startsAt).toLocaleDateString()} at ${input.location}` }));
      if (notifications.length > 0) await (supabase as any).from("notifications").insert(notifications);
    }
  } catch { /* best-effort */ }
}

export async function registerForEvent(eventId: string, profileId: string) {
  if (!supabase) { await delay(); return; }
  const { error } = await (supabase as any).from("event_registrations").insert({ event_id: eventId, profile_id: profileId });
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["events"] });
  queryClient.invalidateQueries({ queryKey: ["my-event-registrations"] });
}

export async function unregisterFromEvent(eventId: string, profileId: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("event_registrations").delete().eq("event_id", eventId).eq("profile_id", profileId);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["events"] });
  queryClient.invalidateQueries({ queryKey: ["my-event-registrations"] });
}

export async function listMyEventRegistrations(profileId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await (supabase as any).from("event_registrations").select("event_id").eq("profile_id", profileId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.event_id);
}

// ─── Feed ────────────────────────────────────────────────────────────

export async function listFeedPosts(): Promise<FeedPost[]> {
  if (!supabase) { await delay(); return demoFeedPosts; }
  // Try with explicit FK join first, fallback to plain query
  const { data, error } = await (supabase as any)
    .from("feed_posts")
    .select("*, author:profiles!feed_posts_author_id_fkey(full_name, role)")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    // Fallback: query without join if FK name doesn't match
    const { data: plain, error: plainError } = await (supabase as any)
      .from("feed_posts").select("*").order("created_at", { ascending: false }).limit(30);
    if (plainError) throw plainError;
    return (plain ?? []).map((row: any) => ({
      id: row.id, authorName: "Connectly", authorRole: "ADMIN",
      type: row.type, title: row.title, content: row.content,
      likes: row.likes_count ?? 0, comments: row.comments_count ?? 0, createdAt: row.created_at,
    }));
  }
  return (data ?? []).map((row: any) => ({
    id: row.id, authorName: row.author?.full_name ?? "Connectly", authorRole: row.author?.role ?? "ADMIN",
    type: row.type, title: row.title, content: row.content,
    likes: row.likes_count ?? 0, comments: row.comments_count ?? 0, createdAt: row.created_at,
  }));
}

export async function createFeedPost(input: { type: string; title: string; content: string; authorId: string }) {
  if (!supabase) { await delay(); return; }
  const { error } = await (supabase as any).from("feed_posts").insert({ author_id: input.authorId, type: input.type, title: input.title, content: input.content });
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["feed"] });

  // Broadcast notification to all active users
  try {
    const { data: allProfiles } = await (supabase as any).from("profiles").select("id").eq("status", "ACTIVE");
    if (allProfiles && allProfiles.length > 0) {
      const notifications = allProfiles
        .filter((p: any) => p.id !== input.authorId) // Don't notify the author
        .map((p: any) => ({ profile_id: p.id, title: `New ${input.type.toLowerCase()}: ${input.title}`, body: input.content.substring(0, 200) }));
      if (notifications.length > 0) {
        await (supabase as any).from("notifications").insert(notifications);
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    }
  } catch { /* notification broadcast is best-effort */ }
}

export async function updateFeedPost(postId: string, input: { title: string; content: string; type: string }) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("feed_posts").update({ title: input.title, content: input.content, type: input.type }).eq("id", postId);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["feed"] });
}

export async function deleteFeedPost(postId: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("feed_posts").delete().eq("id", postId);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["feed"] });
}

export async function likePost(postId: string, profileId: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("post_likes").insert({ post_id: postId, profile_id: profileId });
  if (error && !error.message?.includes("duplicate")) throw error;
  queryClient.invalidateQueries({ queryKey: ["feed"] });
}

export async function unlikePost(postId: string, profileId: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("post_likes").delete().eq("post_id", postId).eq("profile_id", profileId);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["feed"] });
}

export async function listMyLikes(profileId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await (supabase as any).from("post_likes").select("post_id").eq("profile_id", profileId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.post_id);
}

export async function listComments(postId: string): Promise<{ id: string; authorName: string; body: string; createdAt: string }[]> {
  if (!supabase) return [];
  const { data, error } = await (supabase as any).from("comments").select("*, profiles(full_name)").eq("post_id", postId).order("created_at");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ id: r.id, authorName: r.profiles?.full_name ?? "User", body: r.body, createdAt: r.created_at }));
}

export async function createComment(postId: string, authorId: string, body: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("comments").insert({ post_id: postId, author_id: authorId, body });
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["feed"] });
  queryClient.invalidateQueries({ queryKey: ["comments", postId] });
}

// ─── Notifications ───────────────────────────────────────────────────

export async function listNotifications(profileId?: string): Promise<NotificationItem[]> {
  if (!supabase) { await delay(); return demoNotifications; }
  let query = (supabase as any).from("notifications").select("*").order("created_at", { ascending: false }).limit(30);
  if (profileId) query = query.eq("profile_id", profileId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ id: row.id, title: row.title, body: row.body, read: row.read_at !== null, createdAt: row.created_at }));
}

export async function markNotificationRead(notificationId: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
}

export async function markAllNotificationsRead(profileId: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("notifications").update({ read_at: new Date().toISOString() }).eq("profile_id", profileId).is("read_at", null);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
}

export async function createNotification(profileId: string, title: string, body: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("notifications").insert({ profile_id: profileId, title, body });
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
}

// ─── Messages ────────────────────────────────────────────────────────

export async function listMessageThreads(profileId?: string): Promise<MessageThread[]> {
  if (!supabase) { await delay(); return demoThreads; }
  const pid = profileId ?? "";
  const { data, error } = await (supabase as any).from("message_threads")
    .select("*, requester:profiles!message_threads_requester_id_fkey(full_name), recipient:profiles!message_threads_recipient_id_fkey(full_name)")
    .or(`requester_id.eq.${pid},recipient_id.eq.${pid}`)
    .order("updated_at", { ascending: false }).limit(20);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id, title: row.title,
    participantNames: [row.requester?.full_name, row.recipient?.full_name].filter(Boolean),
    lastMessage: row.last_message ?? "No messages yet", updatedAt: row.updated_at,
  }));
}

export async function listMessages(threadId: string): Promise<{ id: string; senderId: string; senderName: string; body: string; createdAt: string }[]> {
  if (!supabase) return [{ id: "m1", senderId: "alumni-1", senderName: "Nisha Rao", body: "Please share your resume and the roles you are targeting.", createdAt: new Date().toISOString() }];
  const { data, error } = await (supabase as any).from("messages").select("*, profiles(full_name)").eq("thread_id", threadId).order("created_at");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ id: r.id, senderId: r.sender_id, senderName: r.profiles?.full_name ?? "User", body: r.body, createdAt: r.created_at }));
}

export async function sendMessage(threadId: string, senderId: string, body: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("messages").insert({ thread_id: threadId, sender_id: senderId, body });
  if (error) throw error;
  await (supabase as any).from("message_threads").update({ last_message: body }).eq("id", threadId);
  queryClient.invalidateQueries({ queryKey: ["threads"] });
  queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
}

export async function startConversation(requesterId: string, recipientId: string, recipientName: string, requesterName: string): Promise<string> {
  if (!supabase) return "demo-thread";
  // Check if thread already exists between these two users
  const { data: existing } = await (supabase as any).from("message_threads")
    .select("id")
    .or(`and(requester_id.eq.${requesterId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${requesterId})`)
    .maybeSingle();
  if (existing) return existing.id;
  // Create new thread
  const { data, error } = await (supabase as any).from("message_threads").insert({
    requester_id: requesterId,
    recipient_id: recipientId,
    title: `${requesterName} ↔ ${recipientName}`,
    last_message: "Thread started",
  }).select("id").single();
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["threads"] });
  return data.id;
}

// ─── Mentorship Requests ─────────────────────────────────────────────

export async function submitMentorshipRequest(input: { requesterId: string; mentorId: string; category: string; message: string }): Promise<MentorshipRequest> {
  if (!supabase) {
    await delay();
    return { id: crypto.randomUUID(), requesterId: input.requesterId, mentorId: input.mentorId, category: input.category, message: input.message, status: "PENDING", createdAt: new Date().toISOString() };
  }
  const { data, error } = await (supabase as any).from("mentorship_requests").insert({
    requester_id: input.requesterId, mentor_id: input.mentorId, category: input.category, message: input.message,
  }).select("*").single();
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });

  // Create notification for the mentor
  try {
    const requesterProfile = await (supabase as any).from("profiles").select("full_name").eq("id", input.requesterId).single();
    const requesterName = requesterProfile.data?.full_name ?? "Someone";
    await createNotification(input.mentorId, `Mentorship request from ${requesterName}`, `${requesterName} wants your guidance in ${input.category}. Review the request in your Mentorship page.`);
  } catch { /* notification creation is best-effort */ }

  return { id: data.id, requesterId: data.requester_id, mentorId: data.mentor_id, category: data.category, message: data.message, status: data.status, createdAt: data.created_at };
}

export async function listMentorshipRequests(profileId: string): Promise<MentorshipRequest[]> {
  if (!supabase) return [];
  const { data, error } = await (supabase as any).from("mentorship_requests")
    .select("*, requester:profiles!mentorship_requests_requester_id_fkey(full_name), mentor:profiles!mentorship_requests_mentor_id_fkey(full_name)")
    .or(`requester_id.eq.${profileId},mentor_id.eq.${profileId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id, requesterId: r.requester_id, mentorId: r.mentor_id, category: r.category,
    message: r.message, status: r.status, createdAt: r.created_at,
    requesterName: r.requester?.full_name, mentorName: r.mentor?.full_name,
  }));
}

export async function updateMentorshipRequest(id: string, status: "ACCEPTED" | "DECLINED") {
  if (!supabase) return;
  const { error } = await (supabase as any).from("mentorship_requests").update({ status }).eq("id", id);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["mentorship-requests"] });
}

// ─── Admin ───────────────────────────────────────────────────────────

export async function getAnalytics(): Promise<AnalyticsSnapshot> {
  if (!supabase) { await delay(); return demoAnalytics; }
  const [{ count: users }, { count: mentors }, { count: approvals }, { count: jobs }] = await Promise.all([
    (supabase as any).from("profiles").select("*", { count: "exact", head: true }),
    (supabase as any).from("profiles").select("*", { count: "exact", head: true }).eq("is_mentor", true),
    (supabase as any).from("profiles").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
    (supabase as any).from("jobs").select("*", { count: "exact", head: true }).eq("status", "PUBLISHED"),
  ]);
  return { ...demoAnalytics, totalUsers: users ?? 0, activeMentors: mentors ?? 0, pendingApprovals: approvals ?? 0, openJobs: jobs ?? 0 };
}

export async function listPendingUsers(): Promise<Profile[]> {
  if (!supabase) return [];
  const { data, error } = await (supabase as any).from("profiles").select("*").in("status", ["PENDING", "INVITED"]).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => mapProfileRow(r));
}

export async function approveUser(profileId: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("profiles").update({ status: "ACTIVE" }).eq("id", profileId);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["pending-users"] });
  queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
}

export async function rejectUser(profileId: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("profiles").update({ status: "SUSPENDED" }).eq("id", profileId);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["pending-users"] });
  queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
}

export interface AlumniImportRow {
  full_name: string;
  email: string;
  department: string;
  graduation_year: number;
  company?: string;
  designation?: string;
  city?: string;
}

export async function bulkImportAlumni(rows: AlumniImportRow[]): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  if (!supabase) return { inserted: rows.length, skipped: 0, errors: [] };
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.full_name || !row.email || !row.department || !row.graduation_year) {
      errors.push(`Skipped: missing required field for ${row.email || row.full_name || "unknown"}`);
      skipped++;
      continue;
    }
    const { error } = await (supabase as any).from("profiles").insert({
      full_name: row.full_name.trim(),
      email: row.email.trim().toLowerCase(),
      department: row.department.trim(),
      graduation_year: Number(row.graduation_year),
      company: row.company?.trim() || null,
      designation: row.designation?.trim() || null,
      city: row.city?.trim() || null,
      role: "ALUMNI",
      status: "INVITED",
      profile_completeness: 40,
    });
    if (error) {
      if (error.message?.includes("duplicate") || error.code === "23505") {
        errors.push(`Skipped duplicate: ${row.email}`);
        skipped++;
      } else {
        errors.push(`Error for ${row.email}: ${error.message}`);
        skipped++;
      }
    } else {
      inserted++;
    }
  }
  queryClient.invalidateQueries({ queryKey: ["pending-users"] });
  queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
  return { inserted, skipped, errors };
}

// ─── Profile Save ────────────────────────────────────────────────────

export async function saveProfile(profile: Profile): Promise<Profile> {
  if (!supabase) { await delay(); return profile; }
  const { error } = await (supabase as any).from("profiles").update({
    full_name: profile.fullName, bio: profile.bio, company: profile.company, designation: profile.designation,
    city: profile.city, country: profile.country, department: profile.department, industry: profile.industry,
    career_goals: profile.careerGoals,
    interests: profile.interests, technology_stack: profile.technologyStack,
    achievements: profile.achievements, projects: profile.projects,
    social_links: profile.socialLinks ?? {}, academic_title: profile.academicTitle,
    publications: profile.publications ?? [], research_interests: profile.researchInterests ?? [],
    is_mentor: profile.isMentor, mentor_categories: profile.mentorCategories,
    mentorship_capacity: profile.mentorshipCapacity,
    graduation_year: profile.graduationYear, student_id: profile.studentId,
    profile_completeness: profile.profileCompleteness,
    updated_at: new Date().toISOString(),
  }).eq("id", profile.id);
  if (error) throw error;

  // Sync skills via the RPC function from migration 0002
  try {
    await (supabase as any).rpc("replace_profile_skills", { target_profile_id: profile.id, skill_names: profile.skills });
  } catch { /* ignore if RPC not available */ }

  queryClient.invalidateQueries({ queryKey: ["profiles"] });
  return profile;
}

export async function completeOnboarding(profile: Profile): Promise<Profile> {
  return saveProfile(profile);
}

// ─── Contact Requests ────────────────────────────────────────────────

export async function sendContactRequest(requesterId: string, recipientId: string, reason: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("contact_requests").insert({ requester_id: requesterId, recipient_id: recipientId, reason });
  if (error) throw error;
}

// ─── Avatar Upload ───────────────────────────────────────────────────

export async function uploadAvatar(authUserId: string, profileId: string, file: File): Promise<string> {
  if (!supabase) return "";
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${authUserId}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  // Add cache-buster so browser loads the new image
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
  await (supabase as any).from("profiles").update({ avatar_url: avatarUrl }).eq("id", profileId);
  queryClient.invalidateQueries({ queryKey: ["profiles"] });
  return avatarUrl;
}

// ─── Mappers ─────────────────────────────────────────────────────────

function mapDirectoryRow(row: any): Profile {
  return {
    id: row.id, authUserId: row.auth_user_id, fullName: row.full_name, email: row.email,
    avatarUrl: row.avatar_url, role: row.role, status: row.status, department: row.department ?? "Unassigned",
    graduationYear: row.graduation_year, studentId: row.student_id, bio: row.bio, company: row.company,
    designation: row.designation, industry: row.industry, city: row.city, country: row.country,
    skills: row.skills ?? [], interests: row.interests ?? [], careerGoals: row.career_goals,
    technologyStack: row.technology_stack ?? [], achievements: row.achievements ?? [],
    projects: row.projects ?? [], socialLinks: row.social_links ?? {},
    academicTitle: row.academic_title, publications: row.publications ?? [],
    researchInterests: row.research_interests ?? [], isMentor: row.is_mentor,
    mentorCategories: row.mentor_categories ?? [], mentorshipCapacity: row.mentorship_capacity ?? 0,
    profileCompleteness: row.profile_completeness ?? 0, phoneVisible: row.phone_visible ?? false,
    phone: row.phone, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapProfileRow(row: any): Profile {
  return {
    id: row.id, authUserId: row.auth_user_id, fullName: row.full_name, email: row.email,
    avatarUrl: row.avatar_url, role: row.role, status: row.status, department: row.department ?? "Unassigned",
    graduationYear: row.graduation_year, studentId: row.student_id, bio: row.bio, company: row.company,
    designation: row.designation, industry: row.industry, city: row.city, country: row.country,
    skills: row.skills ?? [], interests: row.interests ?? [], careerGoals: row.career_goals,
    technologyStack: row.technology_stack ?? [], achievements: row.achievements ?? [],
    projects: row.projects ?? [], socialLinks: row.social_links ?? {},
    academicTitle: row.academic_title, publications: row.publications ?? [],
    researchInterests: row.research_interests ?? [], isMentor: row.is_mentor,
    mentorCategories: row.mentor_categories ?? [], mentorshipCapacity: row.mentorship_capacity ?? 0,
    profileCompleteness: row.profile_completeness ?? 0, phoneVisible: row.phone_visible ?? false,
    phone: row.phone ?? null, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapJobRow(row: any): Job {
  return {
    id: row.id, title: row.title, organization: row.organization, location: row.location,
    type: row.type, deadline: row.deadline, skills: row.skills ?? [], description: row.description,
    postedBy: row.posted_by_name ?? "Alumni", status: row.status, createdAt: row.created_at,
  };
}

function mapEventRow(row: any): Event {
  return {
    id: row.id, title: row.title, type: row.type, startsAt: row.starts_at, endsAt: row.ends_at,
    location: row.location, description: row.description, bannerUrl: row.banner_url,
    capacity: row.capacity, registrations: row.registrations_count ?? 0,
    createdBy: row.created_by_name ?? "Admin",
  };
}

function mapFeedRow(row: any): FeedPost {
  return {
    id: row.id, authorName: row.profiles?.full_name ?? "Connectly", authorRole: row.profiles?.role ?? "ADMIN",
    type: row.type, title: row.title, content: row.content, likes: row.likes_count ?? 0,
    comments: row.comments_count ?? 0, createdAt: row.created_at,
  };
}
