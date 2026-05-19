import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/lib/auth-store";
import { ProtectedRoute } from "@/routes/protected-route";
import { PublicLayout } from "@/routes/public-layout";
import { AppLayout } from "@/routes/app-layout";
import { ThemeProvider } from "@/components/theme-provider";

const AdminPage = lazy(() => import("@/features/admin/admin-page").then((module) => ({ default: module.AdminPage })));
const AuthPage = lazy(() => import("@/features/auth/auth-page").then((module) => ({ default: module.AuthPage })));
const DashboardPage = lazy(() => import("@/features/dashboard/dashboard-page").then((module) => ({ default: module.DashboardPage })));
const DirectoryPage = lazy(() => import("@/features/directory/directory-page").then((module) => ({ default: module.DirectoryPage })));
const EventsPage = lazy(() => import("@/features/events/events-page").then((module) => ({ default: module.EventsPage })));
const FeedPage = lazy(() => import("@/features/feed/feed-page").then((module) => ({ default: module.FeedPage })));
const JobsPage = lazy(() => import("@/features/jobs/jobs-page").then((module) => ({ default: module.JobsPage })));
const LandingPage = lazy(() => import("@/features/landing/landing-page").then((module) => ({ default: module.LandingPage })));
const MentorshipPage = lazy(() => import("@/features/mentorship/mentorship-page").then((module) => ({ default: module.MentorshipPage })));
const MessagesPage = lazy(() => import("@/features/messages/messages-page").then((module) => ({ default: module.MessagesPage })));
const NotificationsPage = lazy(() => import("@/features/notifications/notifications-page").then((module) => ({ default: module.NotificationsPage })));
const OnboardingPage = lazy(() => import("@/features/onboarding/onboarding-page").then((module) => ({ default: module.OnboardingPage })));
const ProfilePage = lazy(() => import("@/features/profile/profile-page").then((module) => ({ default: module.ProfilePage })));

export function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <ThemeProvider defaultTheme="system" storageKey="connectly-theme">
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
            </Route>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="directory" element={<DirectoryPage />} />
                <Route path="mentorship" element={<MentorshipPage />} />
                <Route path="jobs" element={<JobsPage />} />
                <Route path="events" element={<EventsPage />} />
                <Route path="feed" element={<FeedPage />} />
                <Route path="messages" element={<MessagesPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
            </Route>
            <Route element={<ProtectedRoute adminOnly />}>
              <Route path="/app/admin" element={<AppLayout />}>
                <Route index element={<AdminPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Toaster />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}
