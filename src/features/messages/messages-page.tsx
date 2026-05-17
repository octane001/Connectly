import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Lock, Loader2, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { listMessageThreads, listMessages, sendMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useRealtimeMessages } from "@/lib/use-realtime-messages";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function MessagesPage() {
  const profile = useAuthStore((s) => s.profile)!;
  const threads = useQuery({ queryKey: ["threads"], queryFn: () => listMessageThreads(profile.id) });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const selected = threads.data?.find((t) => t.id === selectedId) ?? threads.data?.[0] ?? null;
  const activeThreadId = selected?.id;

  // ── Supabase Realtime: instant message delivery ──
  useRealtimeMessages(activeThreadId);

  const messages = useQuery({
    queryKey: ["messages", activeThreadId],
    queryFn: () => listMessages(activeThreadId!),
    enabled: !!activeThreadId,
    refetchInterval: 5_000, // 5s polling fallback in case Realtime hiccups
  });

  // Auto-scroll to newest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.data]);

  const send = useMutation({
    mutationFn: () => sendMessage(activeThreadId!, profile.id, messageText),
    onSuccess: () => setMessageText(""),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Messages"
        title="Private request-based conversations"
        description="Chat privately with mentors, mentees, and connections. Your email stays hidden — only messages are shared."
      />

      <div className="grid min-h-[560px] gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Threads</CardTitle>
            <CardDescription>Accepted mentorship and contact requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(threads.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No message threads yet. Accept a mentorship or contact request to start one.</p>
            ) : null}
            {(threads.data ?? []).map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedId(thread.id)}
                className={cn(
                  "w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50",
                  activeThreadId === thread.id && "border-primary bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={thread.participantNames.join(" ")} className="h-10 w-10" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{thread.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{thread.lastMessage}</p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{selected?.title ?? "No thread selected"}</CardTitle>
                <CardDescription>{selected ? `Updated ${formatDate(selected.updatedAt)}` : "Choose a request thread."}</CardDescription>
              </div>
              <Badge variant="outline">
                <Lock className="mr-1 h-3 w-3" />
                Email hidden
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-6 p-5">
            <div ref={scrollRef} className="space-y-4 overflow-y-auto max-h-[400px]">
              {(messages.data ?? []).length === 0 && selected ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Send the first message!</p>
              ) : null}
              {!selected ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Select a thread to view messages.</p>
              ) : null}
              {(messages.data ?? []).map((msg) => (
                <div key={msg.id} className={cn("max-w-[80%] rounded-lg p-4 text-sm", msg.senderId === profile.id ? "ml-auto bg-primary text-primary-foreground" : "border bg-muted/40")}>
                  <p className="text-xs font-medium opacity-70 mb-1">{msg.senderName}</p>
                  <p>{msg.body}</p>
                </div>
              ))}
            </div>
            {activeThreadId ? (
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (messageText.trim()) send.mutate(); }}>
                <Input placeholder="Write a message" value={messageText} onChange={(e) => setMessageText(e.target.value)} />
                <Button size="icon" type="submit" disabled={send.isPending || !messageText.trim()} aria-label="Send message">
                  {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
