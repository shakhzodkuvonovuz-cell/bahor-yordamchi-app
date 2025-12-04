import { supabase } from "@/integrations/supabase/client";

// Types for chat store
export interface ChatThread {
  id: string;
  user_id: string;
  title: string;
  mode: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  created_at: string;
}

export interface ChatAttachmentRecord {
  id: string;
  thread_id: string | null;
  message_id: string | null;
  user_id: string;
  bucket: string;
  path: string;
  mime_type: string | null;
  size_bytes: number | null;
  original_name: string | null;
  created_at: string;
}

// ============= Thread Operations =============

export async function listThreads(userId: string, mode?: string): Promise<ChatThread[]> {
  let query = supabase
    .from("chat_threads")
    .select("*")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });

  if (mode) {
    query = query.eq("mode", mode);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error listing threads:", error);
    throw error;
  }

  return (data || []) as ChatThread[];
}

export async function createThread(
  userId: string,
  options: { title?: string; mode: string }
): Promise<ChatThread> {
  const { data, error } = await supabase
    .from("chat_threads")
    .insert({
      user_id: userId,
      title: options.title || "Yangi chat",
      mode: options.mode,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating thread:", error);
    throw error;
  }

  return data as ChatThread;
}

export async function renameThread(threadId: string, title: string): Promise<void> {
  const { error } = await supabase
    .from("chat_threads")
    .update({ title })
    .eq("id", threadId);

  if (error) {
    console.error("Error renaming thread:", error);
    throw error;
  }
}

export async function deleteThread(threadId: string): Promise<void> {
  // Cascade delete will handle messages and attachments
  const { error } = await supabase
    .from("chat_threads")
    .delete()
    .eq("id", threadId);

  if (error) {
    console.error("Error deleting thread:", error);
    throw error;
  }
}

export async function archiveThread(threadId: string, isArchived: boolean): Promise<void> {
  const { error } = await supabase
    .from("chat_threads")
    .update({ is_archived: isArchived })
    .eq("id", threadId);

  if (error) {
    console.error("Error archiving thread:", error);
    throw error;
  }
}

export async function touchThread(threadId: string): Promise<void> {
  const { error } = await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  if (error) {
    console.error("Error touching thread:", error);
    throw error;
  }
}

// ============= Message Operations =============

export async function getMessages(
  threadId: string,
  options?: { limit?: number; offset?: number }
): Promise<ChatMessage[]> {
  const limit = options?.limit || 30;
  const offset = options?.offset || 0;

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error getting messages:", error);
    throw error;
  }

  return (data || []) as ChatMessage[];
}

export async function getMessageCount(threadId: string): Promise<number> {
  const { count, error } = await supabase
    .from("chat_messages")
    .select("*", { count: "exact", head: true })
    .eq("thread_id", threadId);

  if (error) {
    console.error("Error getting message count:", error);
    throw error;
  }

  return count || 0;
}

export async function addMessage(
  userId: string,
  options: {
    threadId: string;
    role: "user" | "assistant" | "system";
    content: string;
    model?: string;
    tokens_in?: number;
    tokens_out?: number;
  }
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: options.threadId,
      user_id: userId,
      role: options.role,
      content: options.content,
      model: options.model,
      tokens_in: options.tokens_in,
      tokens_out: options.tokens_out,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding message:", error);
    throw error;
  }

  // Touch the thread to update updated_at
  await touchThread(options.threadId).catch(console.error);

  return data as ChatMessage;
}

export async function updateMessage(
  messageId: string,
  content: string
): Promise<void> {
  const { error } = await supabase
    .from("chat_messages")
    .update({ content })
    .eq("id", messageId);

  if (error) {
    console.error("Error updating message:", error);
    throw error;
  }
}

export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("id", messageId);

  if (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
}

// ============= Attachment Operations =============

export async function attachFile(
  userId: string,
  options: {
    threadId: string;
    messageId?: string;
    bucket?: string;
    path: string;
    mimeType?: string;
    sizeBytes?: number;
    originalName?: string;
  }
): Promise<ChatAttachmentRecord> {
  const { data, error } = await supabase
    .from("chat_attachments")
    .insert({
      thread_id: options.threadId,
      message_id: options.messageId || null,
      user_id: userId,
      bucket: options.bucket || "chat-attachments",
      path: options.path,
      mime_type: options.mimeType,
      size_bytes: options.sizeBytes,
      original_name: options.originalName,
    })
    .select()
    .single();

  if (error) {
    console.error("Error attaching file:", error);
    throw error;
  }

  return data as ChatAttachmentRecord;
}

export async function getAttachments(threadId: string): Promise<ChatAttachmentRecord[]> {
  const { data, error } = await supabase
    .from("chat_attachments")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error getting attachments:", error);
    throw error;
  }

  return (data || []) as ChatAttachmentRecord[];
}

// ============= Migration Helper =============

export async function migrateFromLocalStorage(
  userId: string,
  localStorageData: Record<string, {
    sessions: Array<{
      id: string;
      mode: string;
      title: string;
      createdAt: string;
      updatedAt: string;
    }>;
    messagesById: Record<string, Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      timestamp: string | Date;
      attachments?: Array<{
        id: string;
        name: string;
        size: number;
        type: string;
        url?: string;
      }>;
    }>>;
  }>
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;

  for (const [mode, modeData] of Object.entries(localStorageData)) {
    for (const session of modeData.sessions) {
      try {
        // Create thread
        const { data: thread, error: threadError } = await supabase
          .from("chat_threads")
          .insert({
            user_id: userId,
            title: session.title,
            mode: session.mode || mode,
            created_at: session.createdAt,
            updated_at: session.updatedAt,
          })
          .select()
          .single();

        if (threadError) {
          console.error("Error creating thread during migration:", threadError);
          failed++;
          continue;
        }

        // Get messages for this session
        const messages = modeData.messagesById[session.id] || [];

        // Insert messages
        for (const msg of messages) {
          const timestamp = typeof msg.timestamp === "string" 
            ? msg.timestamp 
            : msg.timestamp.toISOString();

          const { error: msgError } = await supabase
            .from("chat_messages")
            .insert({
              thread_id: thread.id,
              user_id: userId,
              role: msg.role,
              content: msg.content,
              created_at: timestamp,
            });

          if (msgError) {
            console.error("Error inserting message during migration:", msgError);
          }
        }

        imported++;
      } catch (err) {
        console.error("Migration error for session:", session.id, err);
        failed++;
      }
    }
  }

  return { imported, failed };
}
