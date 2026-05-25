import type { AccountStatus, UserRole } from "@/types/domain";

export const USER_ROLES: UserRole[] = ["STUDENT", "ALUMNI", "FACULTY", "ADMIN"];
export const ACCOUNT_STATUSES: AccountStatus[] = ["INVITED", "PENDING", "ACTIVE", "SUSPENDED", "BANNED"];

export const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electronics",
  "Mechanical",
  "Civil",
  "Electrical",
  "Business Administration",
  "Data Science",
];

export const MENTORSHIP_CATEGORIES = [
  "Career Guidance",
  "Resume Review",
  "Mock Interview",
  "Project Advice",
  "Higher Studies",
  "Startup Advice",
  "Research Guidance",
];

export const INDUSTRIES = [
  "Software",
  "FinTech",
  "EdTech",
  "Healthcare",
  "Manufacturing",
  "Consulting",
  "Research",
  "Government",
];
