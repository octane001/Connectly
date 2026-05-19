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

export interface BaseProfile {
  id: string;
  authUserId?: string | null;
  fullName: string;
  email?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  status: AccountStatus;
  department: string;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  skills: string[];
  technologyStack: string[];
  achievements: string[];
  projects: string[];
  socialLinks?: Record<string, string>;
  displayTitle?: string | null;
  displayOrganization?: string | null;
  displayIndustry?: string | null;
  mentorshipAvailable: boolean;
  mentorCategories: string[];
  mentorshipCapacity: number;
  profileCompleteness: number;
  phoneVisible: boolean;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile extends BaseProfile {
  role: "STUDENT";
  student: {
    studentId?: string | null;
    currentYear?: number | null;
    degree?: string | null;
    specialization?: string | null;
    cgpa?: number | null;
    interests: string[];
    careerGoals?: string | null;
  };
}

export interface AlumniProfile extends BaseProfile {
  role: "ALUMNI";
  alumni: {
    graduationYear?: number | null;
    company?: string | null;
    designation?: string | null;
    industry?: string | null;
    experienceYears?: number | null;
    mentorshipAvailable: boolean;
  };
}

export interface FacultyProfile extends BaseProfile {
  role: "FACULTY";
  faculty: {
    facultyId?: string | null;
    academicTitle?: string | null;
    designation?: string | null;
    researchInterests: string[];
    publications: string[];
    officeLocation?: string | null;
    mentorshipCapacity: number;
  };
}

export interface AdminProfile extends BaseProfile {
  role: "ADMIN" | "SUPER_ADMIN";
  admin: {
    adminLevel: string;
    permissions: string[];
    internalRole?: string | null;
    institutionName?: string | null;
  };
}

export type Profile = StudentProfile | AlumniProfile | FacultyProfile | AdminProfile;

export function isStudentProfile(profile: Profile | null | undefined): profile is StudentProfile {
  return profile?.role === "STUDENT";
}

export function isAlumniProfile(profile: Profile | null | undefined): profile is AlumniProfile {
  return profile?.role === "ALUMNI";
}

export function isFacultyProfile(profile: Profile | null | undefined): profile is FacultyProfile {
  return profile?.role === "FACULTY";
}

export function isAdminProfile(profile: Profile | null | undefined): profile is AdminProfile {
  return profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN";
}

export function getProfileDisplayTitle(profile: Profile) {
  if (isAlumniProfile(profile)) return profile.alumni.designation ?? profile.displayTitle ?? "Alumni";
  if (isFacultyProfile(profile)) return profile.faculty.academicTitle ?? profile.faculty.designation ?? profile.displayTitle ?? "Faculty";
  if (isAdminProfile(profile)) return profile.admin.internalRole ?? profile.displayTitle ?? "Administrator";
  return profile.displayTitle ?? "Student";
}

export function getProfileDisplayOrganization(profile: Profile) {
  if (isAlumniProfile(profile)) return profile.alumni.company ?? profile.displayOrganization ?? null;
  if (isAdminProfile(profile)) return profile.admin.institutionName ?? profile.displayOrganization ?? null;
  return profile.displayOrganization ?? null;
}

export function getProfileIndustry(profile: Profile) {
  return isAlumniProfile(profile) ? profile.alumni.industry ?? profile.displayIndustry ?? null : profile.displayIndustry ?? null;
}

export function getProfileGraduationYear(profile: Profile) {
  return isAlumniProfile(profile) ? profile.alumni.graduationYear ?? null : null;
}

export function getProfileStudentId(profile: Profile) {
  return isStudentProfile(profile) ? profile.student.studentId ?? null : null;
}

export function getProfileInterests(profile: Profile) {
  return isStudentProfile(profile) ? profile.student.interests : [];
}

export function getProfileCareerGoals(profile: Profile) {
  return isStudentProfile(profile) ? profile.student.careerGoals ?? null : null;
}

export function getProfileResearchInterests(profile: Profile) {
  return isFacultyProfile(profile) ? profile.faculty.researchInterests : [];
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
  research?: string;
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
  requesterName?: string;
  mentorName?: string;
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

export interface AlumniImportRow {
  full_name: string;
  email: string;
  department: string;
  graduation_year: number;
  company?: string;
  designation?: string;
  city?: string;
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
