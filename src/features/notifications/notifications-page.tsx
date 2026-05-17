import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/ui/use-toast";
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatDate } from "@/lib/utils";

export function NotificationsPage() {
  const profile = useAuthStore((s) => s.profile)!;
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: () => listNotifications(profile.id) });
  const { push } = useToast();

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(profile.id),
    onSuccess: () => push({ kind: "success", title: "All marked read", description: "All notifications have been marked as read." }),
  });

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Requests and platform updates"
        description="Notification records for approvals, mentorship requests, messages, events, and admin actions."
        action={
          <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        }
      />
      <div className="space-y-3">
        {(notifications.data ?? []).length === 0 ? (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No notifications yet.</CardContent></Card>
        ) : null}
        {(notifications.data ?? []).map((notification) => (
          <Card
            key={notification.id}
            className={notification.read ? "opacity-75" : "cursor-pointer"}
            onClick={() => { if (!notification.read) markOne.mutate(notification.id); }}
          >
            <CardContent className="flex items-start gap-4 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                <Bell className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{notification.title}</h3>
                  {!notification.read ? <Badge variant="success">New</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDate(notification.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
