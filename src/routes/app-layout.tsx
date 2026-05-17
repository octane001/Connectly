import { useState, useRef, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Bell,
  Briefcase,
  CalendarDays,
  CheckCheck,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Network,
  Newspaper,
  Search,
  Settings,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth-store";
import { listNotifications, markNotificationRead, markAllNotificationsRead, getCollegeName } from "@/lib/api";
import { canAccessAdmin } from "@/lib/route-guards";
import { cn, formatDate } from "@/lib/utils";

const navItems = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/directory", label: "Directory", icon: Search },
  { to: "/app/mentorship", label: "Mentorship", icon: Sparkles },
  { to: "/app/jobs", label: "Jobs", icon: Briefcase },
  { to: "/app/events", label: "Events", icon: CalendarDays },
  { to: "/app/feed", label: "Feed", icon: Newspaper },
  { to: "/app/messages", label: "Messages", icon: MessageSquare },
  { to: "/app/profile", label: "Profile", icon: User },
];

export function AppLayout() {
  const { profile, signOut, isDemoMode } = useAuthStore();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const notifications = useQuery({
    queryKey: ["notifications", profile?.id],
    queryFn: () => listNotifications(profile?.id),
    refetchInterval: 15_000,
    enabled: !!profile,
  });

  const collegeName = useQuery({
    queryKey: ["college-name"],
    queryFn: getCollegeName,
    staleTime: 5 * 60_000, // Cache for 5 min
  });

  const unreadCount = (notifications.data ?? []).filter((n) => !n.read).length;

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
  });

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(profile!.id),
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const logout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r bg-background lg:block">
        <div className="flex h-16 items-center border-b px-6">
          <Link to="/app" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Network className="h-4 w-4" />
            </span>
            Connectly
          </Link>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  isActive && "bg-muted text-foreground",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
          {canAccessAdmin(profile) ? (
            <NavLink
              to="/app/admin"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  isActive && "bg-muted text-foreground",
                )
              }
            >
              <Settings className="h-4 w-4" />
              Admin
            </NavLink>
          ) : null}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="min-w-0 lg:hidden">
              <Link to="/app" className="flex items-center gap-2 font-semibold">
                <Network className="h-5 w-5" />
                Connectly
              </Link>
            </div>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
              <Users className="h-4 w-4" />
              {collegeName.data ?? "Alumni Management & Networking Platform"}
              {isDemoMode ? <Badge variant="outline">Demo mode</Badge> : null}
            </div>
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              {profile ? (
                <div className="relative" ref={bellRef}>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Notifications"
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    ) : null}
                  </Button>

                  {/* Notification Dropdown Panel */}
                  {showNotifications ? (
                    <div className="absolute right-0 top-full mt-2 w-96 max-h-[480px] overflow-y-auto rounded-lg border bg-background shadow-lg">
                      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
                        <h3 className="text-sm font-semibold">Notifications</h3>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => markAll.mutate()}
                              disabled={markAll.isPending}
                            >
                              <CheckCheck className="mr-1 h-3 w-3" />
                              Mark all read
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {(notifications.data ?? []).length === 0 ? (
                        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                          <Bell className="mx-auto mb-2 h-6 w-6 opacity-40" />
                          No notifications yet
                        </div>
                      ) : (
                        <div className="divide-y">
                          {(notifications.data ?? []).slice(0, 15).map((n) => (
                            <div
                              key={n.id}
                              className={cn(
                                "flex cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                                !n.read && "bg-primary/5",
                              )}
                              onClick={() => {
                                if (!n.read) markOne.mutate(n.id);
                              }}
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className={cn("truncate text-sm", !n.read && "font-semibold")}>{n.title}</p>
                                  {!n.read ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                                <p className="mt-1 text-[11px] text-muted-foreground/60">{formatDate(n.createdAt)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="sticky bottom-0 border-t bg-background p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => {
                            setShowNotifications(false);
                            navigate("/app/notifications");
                          }}
                        >
                          View all notifications
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {profile ? (
                <>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-medium">{profile.fullName}</p>
                    <p className="text-xs text-muted-foreground">{profile.role.replace("_", " ")}</p>
                  </div>
                  <Avatar name={profile.fullName} src={profile.avatarUrl} />
                </>
              ) : null}
              <Button variant="ghost" size="icon" onClick={logout} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t px-3 py-2 lg:hidden">
            {[...navItems.slice(0, 6), ...(canAccessAdmin(profile) ? [{ to: "/app/admin", label: "Admin", icon: Settings }] : [])].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground",
                    isActive && "bg-muted text-foreground",
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
