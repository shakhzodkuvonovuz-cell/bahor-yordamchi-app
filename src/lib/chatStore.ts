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
  summary?: string | null;
  summary_updated_at?: string | null;
  last_message_preview?: string | null;
  message_count?: number | null;
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
  reaction?: "like" | "dislike" | null;
  meta?: {
    variant?: "shorter" | "longer" | "simplify" | "detailed" | "regen" | "continue";
    parentAssistantId?: string;
    promptHints?: string;
  } | null;
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
    .select("id, user_id, title, mode, is_archived, created_at, updated_at, summary, summary_updated_at, last_message_preview, message_count")
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

export async function getThread(threadId: string): Promise<ChatThread | null> {
  const { data, error } = await supabase
    .from("chat_threads")
    .select("id, user_id, title, mode, is_archived, created_at, updated_at, summary, summary_updated_at, last_message_preview, message_count")
    .eq("id", threadId)
    .maybeSingle();

  if (error) {
    console.error("Error getting thread:", error);
    throw error;
  }

  return data as ChatThread | null;
}

export async function updateThreadSummary(
  threadId: string,
  summary: string,
  summaryUpdatedAt: string
): Promise<void> {
  const { error } = await supabase
    .from("chat_threads")
    .update({ 
      summary, 
      summary_updated_at: summaryUpdatedAt 
    })
    .eq("id", threadId);

  if (error) {
    console.error("Error updating thread summary:", error);
    throw error;
  }
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

// Extended message type with attachments for UI
export interface ChatMessageWithAttachments extends ChatMessage {
  attachments?: {
    id: string;
    name: string;
    size: number;
    type: string;
    url?: string;
    path: string;
    bucket: string;
  }[];
}

// Get messages with their attachments and generate signed URLs
export async function getMessagesWithAttachments(
  threadId: string,
  options?: { limit?: number; offset?: number }
): Promise<ChatMessageWithAttachments[]> {
  const limit = options?.limit || 30;
  const offset = options?.offset || 0;

  // Fetch messages
  const { data: messages, error: msgError } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (msgError) {
    console.error("Error getting messages:", msgError);
    throw msgError;
  }

  if (!messages || messages.length === 0) {
    return [];
  }

  // Get message IDs
  const messageIds = messages.map(m => m.id);

  // Fetch ALL attachments for this thread (both linked and unlinked)
  // This ensures we don't miss attachments that weren't properly linked
  const { data: attachments, error: attError } = await supabase
    .from("chat_attachments")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (attError) {
    console.error("Error getting attachments:", attError);
    // Continue without attachments
  }

  // Generate signed URLs and map attachments to messages
  const attachmentMap = new Map<string, ChatMessageWithAttachments["attachments"]>();
  const orphanAttachments: ChatMessageWithAttachments["attachments"] = [];
  
  if (attachments && attachments.length > 0) {
    console.log('[chatStore] Processing', attachments.length, 'attachments');
    for (const att of attachments) {
      // Generate signed URL
      const bucket = att.bucket || "chat-attachments";
      const { data: signedData, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(att.path, 3600); // 1 hour
      
      if (signError) {
        console.error('[chatStore] Signed URL error for', att.path, signError);
      }
      
      const attachmentItem = {
        id: att.id,
        name: att.original_name || att.path.split("/").pop() || "file",
        size: att.size_bytes || 0,
        type: att.mime_type || "application/octet-stream",
        url: signedData?.signedUrl,
        path: att.path,
        bucket,
      };
      
      console.log('[chatStore] Attachment:', att.id, 'bucket:', bucket, 'url:', signedData?.signedUrl?.slice(0, 80));
      
      if (att.message_id && messageIds.includes(att.message_id)) {
        // Attachment is linked to a message in current view
        if (!attachmentMap.has(att.message_id)) {
          attachmentMap.set(att.message_id, []);
        }
        attachmentMap.get(att.message_id)!.push(attachmentItem);
      } else if (!att.message_id) {
        // Orphan attachment - try to associate with closest message by time
        orphanAttachments.push(attachmentItem);
      }
    }
  }
  
  // Associate orphan attachments with the closest user message by timestamp
  // This handles cases where attachment linking failed
  if (orphanAttachments.length > 0 && messages.length > 0) {
    const userMessages = messages.filter(m => m.role === 'user');
    for (const orphan of orphanAttachments) {
      // Find attachment creation time from DB data
      const attRecord = attachments?.find(a => a.id === orphan.id);
      if (!attRecord) continue;
      
      const attTime = new Date(attRecord.created_at).getTime();
      
      // Find closest user message that was created within 1 minute after the attachment
      let bestMatch: string | null = null;
      let bestDiff = Infinity;
      
      for (const msg of userMessages) {
        const msgTime = new Date(msg.created_at).getTime();
        const diff = msgTime - attTime;
        // Message should be after attachment (user uploads then sends), within 5 minutes
        if (diff >= 0 && diff < 300000 && diff < bestDiff) {
          bestDiff = diff;
          bestMatch = msg.id;
        }
      }
      
      if (bestMatch) {
        if (!attachmentMap.has(bestMatch)) {
          attachmentMap.set(bestMatch, []);
        }
        attachmentMap.get(bestMatch)!.push(orphan);
      }
    }
  }

  // Merge attachments into messages
  return messages.map(msg => ({
    ...(msg as ChatMessage),
    attachments: attachmentMap.get(msg.id) || undefined,
  }));
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

// ============= Reaction Operations =============

export async function setMessageReaction(
  messageId: string,
  reaction: "like" | "dislike" | null
): Promise<void> {
  const { error } = await supabase
    .from("chat_messages")
    .update({ reaction })
    .eq("id", messageId);

  if (error) {
    console.error("Error setting reaction:", error);
    throw error;
  }
}

export async function addVariantMessage(
  userId: string,
  options: {
    threadId: string;
    role: "assistant";
    content: string;
    model?: string;
    meta?: {
      variant?: "shorter" | "longer" | "simplify" | "detailed" | "regen" | "continue";
      parentAssistantId?: string;
      promptHints?: string;
    };
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
      meta: options.meta,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding variant message:", error);
    throw error;
  }

  await touchThread(options.threadId).catch(console.error);

  return data as ChatMessage;
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

export async function linkAttachmentsToMessage(
  attachmentIds: string[],
  messageId: string
): Promise<void> {
  if (attachmentIds.length === 0) return;
  
  const { error } = await supabase
    .from("chat_attachments")
    .update({ message_id: messageId })
    .in("id", attachmentIds);

  if (error) {
    console.error("Error linking attachments to message:", error);
    throw error;
  }
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

// ============= Summary Generation =============

// Debounce tracker to avoid spam
const summaryDebounceMap = new Map<string, number>();

export async function maybeGenerateSummary(
  threadId: string,
  accessToken: string | null | undefined
): Promise<{ triggered: boolean; summary?: string }> {
  // Skip if no access token
  if (!accessToken) {
    console.log("[Summary] Skipped - no access token");
    return { triggered: false };
  }

  // Check debounce (30 seconds client-side minimum)
  const lastAttempt = summaryDebounceMap.get(threadId);
  const now = Date.now();
  if (lastAttempt && now - lastAttempt < 30000) {
    return { triggered: false };
  }

  try {
    // Get thread to check message_count
    const thread = await getThread(threadId);
    if (!thread) {
      return { triggered: false };
    }

    const messageCount = thread.message_count || 0;
    
    // Only trigger if:
    // 1. No summary exists and at least 3 messages
    // 2. OR message_count is multiple of 10
    const shouldGenerate = 
      (!thread.summary && messageCount >= 3) ||
      (messageCount > 0 && messageCount % 10 === 0);

    if (!shouldGenerate) {
      return { triggered: false };
    }

    // Update debounce tracker
    summaryDebounceMap.set(threadId, now);

    // Call edge function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-thread`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ threadId }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn("[Summary] Generation failed:", response.status, errorData);
      return { triggered: true };
    }

    const result = await response.json();
    return { 
      triggered: true, 
      summary: result.summary 
    };
  } catch (error) {
    console.warn("[Summary] Generation error:", error);
    return { triggered: false };
  }
}

// Get recent messages with thread summary for AI context
export async function getMessagesWithContext(
  threadId: string,
  options?: { recentLimit?: number }
): Promise<{ summary: string | null; messages: ChatMessage[] }> {
  const recentLimit = options?.recentLimit || 10;

  // Get thread summary
  const thread = await getThread(threadId);
  const summary = thread?.summary || null;

  // Get recent messages
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(recentLimit);

  if (error) {
    console.error("Error getting messages with context:", error);
    throw error;
  }

  // Reverse to chronological order
  const messages = ((data || []) as ChatMessage[]).reverse();

  return { summary, messages };
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
