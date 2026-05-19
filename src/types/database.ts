export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<{
        id: string;
        auth_user_id: string | null;
        full_name: string;
        email: string | null;
        avatar_url: string | null;
        role: string;
        status: string;
        department: string | null;
        bio: string | null;
        city: string | null;
        country: string | null;
        technology_stack: string[];
        achievements: string[];
        projects: string[];
        social_links: Json;
        profile_completeness: number;
        created_at: string;
        updated_at: string;
      }>;
      student_profiles: TableDef<{
        profile_id: string;
        student_id: string | null;
        current_year: number | null;
        degree: string | null;
        specialization: string | null;
        cgpa: number | null;
        interests: string[];
        career_goals: string | null;
        created_at: string;
        updated_at: string;
      }>;
      alumni_profiles: TableDef<{
        profile_id: string;
        graduation_year: number | null;
        company: string | null;
        designation: string | null;
        industry: string | null;
        experience_years: number | null;
        mentorship_available: boolean;
        created_at: string;
        updated_at: string;
      }>;
      faculty_profiles: TableDef<{
        profile_id: string;
        faculty_id: string | null;
        academic_title: string | null;
        designation: string | null;
        research_interests: string[];
        publications: string[];
        office_location: string | null;
        mentorship_capacity: number;
        created_at: string;
        updated_at: string;
      }>;
      admin_profiles: TableDef<{
        profile_id: string;
        admin_level: string;
        permissions: string[];
        internal_role: string | null;
        institution_name: string | null;
        created_at: string;
        updated_at: string;
      }>;
      privacy_settings: TableDef<{
        profile_id: string;
        show_phone: boolean;
        show_city: boolean;
        allow_contact_requests: boolean;
        allow_mentorship_requests: boolean;
        created_at: string;
        updated_at: string;
      }>;
      skills: TableDef<{ id: string; name: string; category: string }>;
      user_skills: TableDef<{ profile_id: string; skill_id: string; level: string | null }>;
      jobs: TableDef<{
        id: string;
        posted_by: string | null;
        title: string;
        organization: string;
        location: string;
        type: string;
        deadline: string;
        skills: string[];
        description: string;
        status: string;
        created_at: string;
        updated_at: string;
      }>;
      job_applications: TableDef<{
        id: string;
        job_id: string;
        applicant_id: string;
        note: string | null;
        status: string;
        created_at: string;
      }>;
      events: TableDef<{
        id: string;
        created_by: string | null;
        title: string;
        type: string;
        description: string;
        banner_url: string | null;
        starts_at: string;
        ends_at: string | null;
        location: string;
        capacity: number | null;
        created_at: string;
        updated_at: string;
      }>;
      event_registrations: TableDef<{
        id: string;
        event_id: string;
        profile_id: string;
        status: string;
        created_at: string;
      }>;
      mentorship_requests: TableDef<{
        id: string;
        requester_id: string;
        mentor_id: string;
        category: string;
        message: string;
        status: string;
        created_at: string;
        updated_at: string;
      }>;
      message_threads: TableDef<{
        id: string;
        mentorship_request_id: string | null;
        contact_request_id: string | null;
        requester_id: string;
        recipient_id: string;
        title: string;
        last_message: string | null;
        created_at: string;
        updated_at: string;
      }>;
      notifications: TableDef<{
        id: string;
        profile_id: string;
        title: string;
        body: string;
        action_url: string | null;
        read_at: string | null;
        created_at: string;
      }>;
      feed_posts: TableDef<{
        id: string;
        author_id: string | null;
        type: string;
        title: string;
        content: string;
        likes_count: number;
        comments_count: number;
        created_at: string;
        updated_at: string;
      }>;
      comments: TableDef<{
        id: string;
        post_id: string;
        author_id: string;
        body: string;
        created_at: string;
      }>;
      post_likes: TableDef<{ post_id: string; profile_id: string; created_at: string }>;
      alumni_imports: TableDef<{
        id: string;
        email: string;
        full_name: string;
        department: string | null;
        graduation_year: number | null;
        company: string | null;
        designation: string | null;
        status: string;
        matched_profile_id: string | null;
        imported_by: string | null;
        imported_at: string;
      }>;
    };
    Views: {
      profile_directory: {
        Row: Database["public"]["Tables"]["profiles"]["Row"] & {
          phone_visible: boolean;
          graduation_year: number | null;
          student_id: string | null;
          company: string | null;
          designation: string | null;
          industry: string | null;
          career_goals: string | null;
          interests: string[];
          academic_title: string | null;
          publications: string[];
          research_interests: string[];
          is_mentor: boolean;
          mentor_categories: string[];
          mentorship_capacity: number;
          mentorship_available: boolean;
          preference_categories: string[];
          skills: string[];
          search_document: unknown;
          current_year: number | null;
          degree: string | null;
          specialization: string | null;
          cgpa: number | null;
          experience_years: number | null;
          faculty_id: string | null;
          office_location: string | null;
          admin_level: string | null;
          permissions: string[] | null;
          internal_role: string | null;
        };
      };
      event_cards: {
        Row: Database["public"]["Tables"]["events"]["Row"] & {
          created_by_name: string;
          registrations_count: number;
        };
      };
      job_cards: {
        Row: Database["public"]["Tables"]["jobs"]["Row"] & {
          posted_by_name: string;
          applications_count: number;
        };
      };
    };
    Functions: {
      replace_profile_skills: {
        Args: { target_profile_id: string; skill_names: string[] };
        Returns: void;
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
