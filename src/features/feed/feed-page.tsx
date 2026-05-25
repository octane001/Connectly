import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Edit2, Heart, Loader2, MessageSquare, Plus, Send, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { PageHeader } from "@/components/page-header";
import { listFeedPosts, createFeedPost, updateFeedPost, deleteFeedPost, likePost, unlikePost, listMyLikes, listComments, createComment } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { canManageContent } from "@/lib/route-guards";
import { formatDate } from "@/lib/utils";

export function FeedPage() {
  const profile = useAuthStore((state) => state.profile)!;
  const feed = useQuery({ queryKey: ["feed"], queryFn: listFeedPosts });
  const myLikes = useQuery({ queryKey: ["my-likes"], queryFn: () => listMyLikes(profile.id) });
  const { push } = useToast();
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [formType, setFormType] = useState("ANNOUNCEMENT");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [editingPost, setEditingPost] = useState<{ id: string; type: string; title: string; content: string } | null>(null);

  const likedSet = new Set(myLikes.data ?? []);
  const canManage = canManageContent(profile);

  const toggleLike = useMutation({
    mutationFn: (postId: string) => likedSet.has(postId) ? unlikePost(postId, profile.id) : likePost(postId, profile.id),
    onSuccess: () => { myLikes.refetch(); feed.refetch(); },
  });

  const postMutation = useMutation({
    mutationFn: () => createFeedPost({ type: formType, title: formTitle, content: formContent, authorId: profile.id }),
    onSuccess: () => {
      push({ kind: "success", title: "Post published", description: "Your update is now visible in the feed." });
      setFormTitle(""); setFormContent("");
    },
    onError: () => push({ kind: "error", title: "Post failed", description: "Could not publish. Check your role permissions." }),
  });

  const editMutation = useMutation({
    mutationFn: () => updateFeedPost(editingPost!.id, { title: editingPost!.title, content: editingPost!.content, type: editingPost!.type }),
    onSuccess: () => {
      push({ kind: "success", title: "Post updated" });
      setEditingPost(null);
    },
    onError: () => push({ kind: "error", title: "Update failed" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => deleteFeedPost(postId),
    onSuccess: () => push({ kind: "success", title: "Post deleted", description: "The post has been removed." }),
    onError: () => push({ kind: "error", title: "Delete failed" }),
  });

  const commentMutation = useMutation({
    mutationFn: (postId: string) => createComment(postId, profile.id, commentText),
    onSuccess: () => setCommentText(""),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content feed"
        title="University updates without social media clutter"
        description="Announcements, achievements, placement updates, research highlights, and official news in a lightweight professional feed."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {(feed.data ?? []).length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No feed posts yet. {canManage ? "Create one using the form →" : "Check back later for updates."}</CardContent></Card>
          ) : null}

          {(feed.data ?? []).map((post) => {
            const isLiked = likedSet.has(post.id);
            return (
              <Card key={post.id}>
                <CardContent className="p-5">
                  {/* Edit mode */}
                  {editingPost?.id === post.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Edit post</h3>
                        <Button variant="ghost" size="icon" onClick={() => setEditingPost(null)}><X className="h-4 w-4" /></Button>
                      </div>
                      <Select value={editingPost.type} onChange={(e: any) => setEditingPost({ ...editingPost, type: e.target.value })}>
                        <option value="ANNOUNCEMENT">Announcement</option><option value="ACHIEVEMENT">Achievement</option>
                        <option value="PLACEMENT">Placement</option><option value="RESEARCH">Research</option><option value="NEWS">News</option>
                      </Select>
                      <Input value={editingPost.title} onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })} />
                      <Textarea value={editingPost.content} onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>
                          {editMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingPost(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{post.type}</Badge>
                            <span className="text-sm text-muted-foreground">{formatDate(post.createdAt)}</span>
                          </div>
                          <h3 className="mt-3 text-lg font-semibold">{post.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {post.authorName} · {post.authorRole.replace("_", " ")}
                          </p>
                        </div>
                        {/* Edit/Delete buttons for admin/faculty */}
                        {canManage ? (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPost({ id: post.id, type: post.type, title: post.title, content: post.content })} title="Edit post">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (window.confirm("Delete this post?")) deleteMutation.mutate(post.id); }} title="Delete post">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      <p className="mt-4 text-sm leading-6 text-muted-foreground">{post.content}</p>
                      <div className="mt-5 flex items-center gap-2">
                        <Button
                          variant={isLiked ? "default" : "ghost"}
                          size="sm"
                          onClick={() => toggleLike.mutate(post.id)}
                          className={isLiked ? "bg-foreground text-background hover:bg-foreground/90" : ""}
                        >
                          <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                          {post.likes}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setExpandedComments(expandedComments === post.id ? null : post.id)}>
                          <MessageSquare className="h-4 w-4" />
                          {post.comments}
                        </Button>
                      </div>
                      {expandedComments === post.id ? <CommentsSection postId={post.id} commentText={commentText} setCommentText={setCommentText} onSubmit={() => commentMutation.mutate(post.id)} isPending={commentMutation.isPending} /> : null}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Create update</CardTitle>
            <CardDescription>Admins and faculty can publish official updates.</CardDescription>
          </CardHeader>
          <CardContent>
            {canManage ? (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (formTitle && formContent) postMutation.mutate(); }}>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formType} onChange={(e: any) => setFormType(e.target.value)}>
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="ACHIEVEMENT">Achievement</option>
                    <option value="PLACEMENT">Placement</option>
                    <option value="RESEARCH">Research</option>
                    <option value="NEWS">News</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input placeholder="Placement mentorship sprint begins" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea placeholder="Write a concise official update." value={formContent} onChange={(e) => setFormContent(e.target.value)} />
                </div>
                <Button className="w-full" disabled={postMutation.isPending}>
                  {postMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Publish update
                </Button>
              </form>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Students and alumni can like and comment on official updates.</p>
                <Button variant="outline" className="w-full">
                  <Send className="h-4 w-4" />
                  Suggest an update
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CommentsSection({ postId, commentText, setCommentText, onSubmit, isPending }: {
  postId: string; commentText: string; setCommentText: (v: string) => void; onSubmit: () => void; isPending: boolean;
}) {
  const comments = useQuery({ queryKey: ["comments", postId], queryFn: () => listComments(postId) });

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      {(comments.data ?? []).map((c) => (
        <div key={c.id} className="rounded-md bg-muted/40 p-3 text-sm">
          <span className="font-medium">{c.authorName}</span>
          <p className="mt-1 text-muted-foreground">{c.body}</p>
        </div>
      ))}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (commentText.trim()) onSubmit(); }}>
        <Input placeholder="Write a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
        <Button size="sm" type="submit" disabled={isPending || !commentText.trim()}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
