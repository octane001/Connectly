import { demoFeedPosts } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { delay } from "@/lib/utils";
import { broadcastNotification } from "./notification-service";
import type { FeedPost } from "@/types/domain";

export function mapFeedRow(row: any): FeedPost {
  return {
    id: row.id, authorName: row.author?.full_name ?? "Connectly", authorRole: row.author?.role ?? "ADMIN",
    type: row.type, title: row.title, content: row.content, likes: row.likes_count ?? 0,
    comments: row.comments_count ?? 0, createdAt: row.created_at,
  };
}

export async function listFeedPosts(): Promise<FeedPost[]> {
  if (!supabase) { await delay(); return demoFeedPosts; }
  const { data, error } = await (supabase as any)
    .from("feed_posts")
    .select("*, author:profiles!feed_posts_author_id_fkey(full_name, role)")
    .order("created_at", { ascending: false })
    .limit(30);
  
  if (error) {
    const { data: plain, error: plainError } = await (supabase as any)
      .from("feed_posts").select("*").order("created_at", { ascending: false }).limit(30);
    if (plainError) throw plainError;
    return (plain ?? []).map((row: any) => ({
      id: row.id, authorName: "Connectly", authorRole: "ADMIN",
      type: row.type, title: row.title, content: row.content,
      likes: row.likes_count ?? 0, comments: row.comments_count ?? 0, createdAt: row.created_at,
    }));
  }
  return (data ?? []).map(mapFeedRow);
}

export async function createFeedPost(input: { type: string; title: string; content: string; authorId: string }) {
  if (!supabase) { await delay(); return; }
  const { error } = await (supabase as any).from("feed_posts").insert({ author_id: input.authorId, type: input.type, title: input.title, content: input.content });
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["feed"] });

  await broadcastNotification(
    `New ${input.type.toLowerCase()}: ${input.title}`,
    input.content.substring(0, 200),
    input.authorId
  );
}

export async function updateFeedPost(postId: string, input: { title: string; content: string; type: string }) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("feed_posts").update({ title: input.title, content: input.content, type: input.type }).eq("id", postId);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["feed"] });
}

export async function deleteFeedPost(postId: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("feed_posts").delete().eq("id", postId);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["feed"] });
}

export async function likePost(postId: string, profileId: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("post_likes").insert({ post_id: postId, profile_id: profileId });
  if (error && !error.message?.includes("duplicate")) throw error;
  queryClient.invalidateQueries({ queryKey: ["feed"] });
}

export async function unlikePost(postId: string, profileId: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("post_likes").delete().eq("post_id", postId).eq("profile_id", profileId);
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["feed"] });
}

export async function listMyLikes(profileId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await (supabase as any).from("post_likes").select("post_id").eq("profile_id", profileId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.post_id);
}

export async function listComments(postId: string): Promise<{ id: string; authorName: string; body: string; createdAt: string }[]> {
  if (!supabase) return [];
  const { data, error } = await (supabase as any).from("comments").select("*, profiles(full_name)").eq("post_id", postId).order("created_at");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ id: r.id, authorName: r.profiles?.full_name ?? "User", body: r.body, createdAt: r.created_at }));
}

export async function createComment(postId: string, authorId: string, body: string) {
  if (!supabase) return;
  const { error } = await (supabase as any).from("comments").insert({ post_id: postId, author_id: authorId, body });
  if (error) throw error;
  queryClient.invalidateQueries({ queryKey: ["feed"] });
  queryClient.invalidateQueries({ queryKey: ["comments", postId] });
}
