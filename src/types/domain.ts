export type UserRole = "ALUMNI" | "STUDENT" | "FACULTY" | "ADMIN" | "SUPER_ADMIN";
export type AccountStatus = "INVITED" | "PENDING" | "ACTIVE" | "SUSPENDED" | "BANNED";
export type RequestStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
export type JobType = "INTERNSHIP" | "REFERRAL" | "RESEARCH" | "FREELANCE" | "STARTUP" | "FULL_TIME";
export type EventType = "REUNION" | "WEBINAR" | "MENTORSHIP_SESSION" | "WORKSHOP" | "NETWORKING";
export type FeedPostType = "ANNOUNCEMENT" | "ACHIEVEMENT" | "PLACEMENT" | "RESEARCH" | "NEWS";

export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface Profile {
  id: string;
  authUserId?: string | null;
  fullName: string;
  email?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  status: AccountStatus;
  department: string;
  graduationYear?: number | null;
  studentId?: string | null;
  bio?: string | null;
  company?: string | null;
  designation?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  skills: string[];
  interests: string[];
  careerGoals?: string | null;
  technologyStack: string[];
  achievements: string[];
  projects: string[];
  socialLinks?: Record<string, string>;
  academicTitle?: string | null;
  publications?: string[];
  researchInterests?: string[];
  isMentor: boolean;
  mentorCategories: string[];
  mentorshipCapacity: number;
  profileCompleteness: number;
  phoneVisible: boolean;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DirectoryFilters {
  search?: string;
  department?: string;
  graduationYear?: string;
  company?: string;
  industry?: string;
  city?: string;
  role?: UserRole | "ALL";
  mentorship?: "ALL" | "OPEN";
  skill?: string;
  page?: number;
  pageSize?: number;
}

export interface MatchResult {
  profile: Profile;
  score: number;
  label: string;
  reasons: string[];
}

export interface MentorshipRequest {
  id: string;
  requesterId: string;
  mentorId: string;
  category: string;
  message: string;
  status: RequestStatus;
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  organization: string;
  location: string;
  type: JobType;
  deadline: string;
  skills: string[];
  description: string;
  postedBy: string;
  postedById?: string | null;
  status: "PENDING" | "PUBLISHED" | "ARCHIVED";
  applicationsCount?: number;
  hasApplied?: boolean;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  type: EventType;
  startsAt: string;
  endsAt?: string | null;
  location: string;
  description: string;
  bannerUrl?: string | null;
  capacity?: number | null;
  registrations: number;
  createdBy: string;
  createdById?: string | null;
  hasRsvped?: boolean;
}

export interface FeedPost {
  id: string;
  authorName: string;
  authorRole: UserRole;
  type: FeedPostType;
  title: string;
  content: string;
  likes: number;
  comments: number;
  likedByViewer?: boolean;
  createdAt: string;
}

export interface FeedComment {
  id: string;
  postId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface MessageThread {
  id: string;
  title: string;
  participantNames: string[];
  lastMessage: string;
  updatedAt: string;
}

export interface AnalyticsSnapshot {
  totalUsers: number;
  activeMentors: number;
  pendingApprovals: number;
  openJobs: number;
  eventRegistrations: number;
  monthlyEngagement: Array<{ month: string; users: number; mentorship: number; jobs: number }>;
}

export interface AlumniImport {
  id: string;
  email: string;
  fullName: string;
  department?: string | null;
  graduationYear?: number | null;
  company?: string | null;
  designation?: string | null;
  status: AccountStatus;
  importedAt: string;
}

export interface AdminQueue {
  pendingProfiles: Profile[];
  invitedAlumni: AlumniImport[];
  pendingJobs: Job[];
}
