import {
  getProfileCareerGoals,
  getProfileIndustry,
  getProfileInterests,
  getProfileResearchInterests,
  isAlumniProfile,
  isFacultyProfile,
  isStudentProfile,
  type MatchResult,
  type Profile,
} from "@/types/domain";

function overlap(left: string[], right: string[]) {
  const rightSet = new Set(right.map((item) => item.toLowerCase()));
  return left.filter((item) => rightSet.has(item.toLowerCase()));
}

function containsAny(source: string | null | undefined, candidates: string[]) {
  const normalized = source?.toLowerCase() ?? "";
  return candidates.filter((candidate) => normalized.includes(candidate.toLowerCase()));
}

export function calculateMentorMatches(student: Profile, profiles: Profile[], limit = 6): MatchResult[] {
  if (!isStudentProfile(student)) return [];

  return profiles
    .filter((profile) => profile.id !== student.id)
    .filter((profile) => profile.status === "ACTIVE")
    .filter((profile) => profile.role === "ALUMNI" || profile.role === "FACULTY")
    .filter((profile) => profile.mentorshipAvailable)
    .map((profile) => scoreMentor(student, profile))
    .filter((match) => match.score >= 25) // Only show if there's at least some relevance
    .sort((a, b) => b.score - a.score || b.profile.profileCompleteness - a.profile.profileCompleteness)
    .slice(0, limit);
}

export function scoreMentor(student: Profile, mentor: Profile): MatchResult {
  const reasons: string[] = [];
  let score = 20;

  if (mentor.mentorshipAvailable && mentor.mentorshipCapacity > 0) {
    score += 12;
    reasons.push("Open to mentoring");
  }

  if (student.department === mentor.department) {
    score += 18;
    reasons.push("Same Department");
  }

  const commonSkills = overlap(student.skills, mentor.skills);
  if (commonSkills.length > 0) {
    score += Math.min(20, commonSkills.length * 5);
    reasons.push(`${commonSkills.length} Common Skills`);
  }

  const commonTech = overlap(student.technologyStack, mentor.technologyStack);
  if (commonTech.length > 0) {
    score += Math.min(12, commonTech.length * 4);
    reasons.push("Similar Tech Stack");
  }

  const studentInterests = getProfileInterests(student);
  const studentGoals = getProfileCareerGoals(student);
  const mentorFocusAreas = [
    ...mentor.mentorCategories,
    ...(isFacultyProfile(mentor) ? getProfileResearchInterests(mentor) : []),
    ...(isAlumniProfile(mentor) ? ([mentor.alumni.company, mentor.alumni.industry, mentor.alumni.designation].filter(Boolean) as string[]) : []),
  ];
  const interestMatches = [
    ...overlap(studentInterests, mentorFocusAreas),
    ...containsAny(studentGoals, mentorFocusAreas),
    ...containsAny(studentGoals, mentor.skills),
  ];
  if (interestMatches.length > 0) {
    score += Math.min(15, interestMatches.length * 5);
    reasons.push("Aligned Career Interests");
  }

  const preferredIndustry = getProfileIndustry(student);
  const mentorIndustry = getProfileIndustry(mentor);
  if (preferredIndustry && mentorIndustry && preferredIndustry === mentorIndustry) {
    score += 10;
    reasons.push("Preferred Industry");
  }

  if (student.city && mentor.city && student.city === mentor.city) {
    score += 6;
    reasons.push("Same City");
  }

  if (mentor.profileCompleteness >= 90) {
    score += 8;
    reasons.push("Complete Profile");
  } else if (mentor.profileCompleteness >= 75) {
    score += 4;
  }

  const normalizedScore = Math.max(0, Math.min(98, Math.round(score)));

  return {
    profile: mentor,
    score: normalizedScore,
    label: normalizedScore >= 90 ? "Best Mentor Match" : normalizedScore >= 75 ? "Strong Match" : "Good Match",
    reasons: reasons.slice(0, 5),
  };
}
