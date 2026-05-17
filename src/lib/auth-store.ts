import { create } from "zustand";
import { demoProfiles } from "@/lib/demo-data";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { getMyFullProfile } from "@/lib/api";
import type { Profile } from "@/types/domain";

interface AuthState {
  profile: Profile | null;
  isLoading: boolean;
  isDemoMode: boolean;
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  continueAsDemo: (role?: Profile["role"]) => void;
  updateProfile: (profile: Profile) => void;
  signOut: () => Promise<void>;
}

const demoByRole = (role: Profile["role"] = "STUDENT") => demoProfiles.find((profile) => profile.role === role) ?? demoProfiles[0];

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  isLoading: true,
  isDemoMode: !hasSupabaseConfig,
  initialize: async () => {
    if (!supabase) {
      set({ profile: demoByRole("STUDENT"), isLoading: false, isDemoMode: true });
      return;
    }

    const { data } = await supabase.auth.getSession();
    const authUserId = data.session?.user.id;

    if (!authUserId) {
      set({ profile: null, isLoading: false, isDemoMode: false });
      return;
    }

    // Fetch from profile_directory view to get full profile with skills
    const fullProfile = await getMyFullProfile(authUserId);

    if (!fullProfile) {
      set({ profile: null, isLoading: false, isDemoMode: false });
      return;
    }

    set({ profile: fullProfile, isLoading: false, isDemoMode: false });
  },
  signInWithGoogle: async () => {
    if (!supabase) {
      get().continueAsDemo("STUDENT");
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/onboarding`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  },
  continueAsDemo: (role = "STUDENT") => {
    set({ profile: demoByRole(role), isLoading: false, isDemoMode: true });
  },
  updateProfile: (profile) => set({ profile }),
  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ profile: null, isLoading: false });
  },
}));
