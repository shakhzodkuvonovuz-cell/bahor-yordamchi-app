import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel, RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import type { Message, ChatAttachment } from "@/types/chat";
import * as chatStore from "@/lib/chatStore";

interface UseRealtimeChatOptions {
  userId: string | undefined;
  threadId: string | null;
  enabled: boolean;
  onNewMessage: (message: Message) => void;
  onMessageUpdate: (messageId: string, content: string) => void;
  onNewAttachment: (messageId: string, attachment: ChatAttachment) => void;
  onThreadUpdate?: (threadId: string, updates: Partial<chatStore.ChatThread>) => void;
}

interface DbMessage {
  id: string;
  thread_id: string;
  user_id: string;
  role: string;
  content: string;
  created_at: string;
  model?: string;
  reaction?: string;
  meta?: Record<string, unknown>;
}

interface DbAttachment {
  id: string;
  thread_id: string;
  message_id: string;
  user_id: string;
  bucket: string;
  path: string;
  mime_type: string;
  size_bytes: number;
  original_name: string;
  created_at: string;
}

/**
 * Hook for real-time chat synchronization using Supabase Realtime.
 * 
 * Dedupe Strategy:
 * - Maintains seenMessageIds and seenAttachmentIds sets per active chat
 * - When we create DB rows locally (dual-write), the ID is added to seen sets
 * - When realtime events arrive, if ID already exists, we ignore
 * - On chat switch, sets are cleared and rebuilt from loaded state
 */
export function useRealtimeChat({
  userId,
  threadId,
  enabled,
  onNewMessage,
  onMessageUpdate,
  onNewAttachment,
  onThreadUpdate,
}: UseRealtimeChatOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const seenAttachmentIdsRef = useRef<Set<string>>(new Set());

  // Mark a message as seen (called when we create locally)
  const markMessageSeen = useCallback((messageId: string) => {
    seenMessageIdsRef.current.add(messageId);
  }, []);

  // Mark an attachment as seen (called when we create locally)
  const markAttachmentSeen = useCallback((attachmentId: string) => {
    seenAttachmentIdsRef.current.add(attachmentId);
  }, []);

  // Initialize seen sets from existing messages
  const initializeSeenIds = useCallback((messages: Message[]) => {
    seenMessageIdsRef.current.clear();
    seenAttachmentIdsRef.current.clear();
    
    for (const msg of messages) {
      seenMessageIdsRef.current.add(msg.id);
      if (msg.attachments) {
        for (const att of msg.attachments) {
          seenAttachmentIdsRef.current.add(att.id);
        }
      }
    }
  }, []);

  // Handle incoming message from realtime
  const handleMessageInsert = useCallback(async (
    payload: RealtimePostgresInsertPayload<DbMessage>
  ) => {
    const newMsg = payload.new;
    
    // Dedupe: skip if already seen
    if (seenMessageIdsRef.current.has(newMsg.id)) {
      console.log("[Realtime] Skipping duplicate message:", newMsg.id);
      return;
    }

    // Skip if not for current thread
    if (newMsg.thread_id !== threadId) {
      return;
    }

    console.log("[Realtime] New message received:", newMsg.id);
    seenMessageIdsRef.current.add(newMsg.id);

    // Convert to UI Message format
    const uiMessage: Message = {
      id: newMsg.id,
      role: newMsg.role as "user" | "assistant",
      content: newMsg.content,
      timestamp: new Date(newMsg.created_at),
      reaction: newMsg.reaction as "like" | "dislike" | undefined,
      meta: newMsg.meta as Message["meta"],
    };

    onNewMessage(uiMessage);
  }, [threadId, onNewMessage]);

  // Handle message updates
  const handleMessageUpdate = useCallback((
    payload: { new: DbMessage; old: { id: string } }
  ) => {
    const updated = payload.new;
    
    // Skip if not for current thread
    if (updated.thread_id !== threadId) {
      return;
    }

    console.log("[Realtime] Message updated:", updated.id);
    onMessageUpdate(updated.id, updated.content);
  }, [threadId, onMessageUpdate]);

  // Handle incoming attachment from realtime (insert or update)
  const handleAttachmentChange = useCallback(async (
    payload: RealtimePostgresInsertPayload<DbAttachment>
  ) => {
    const newAtt = payload.new;
    
    // Skip if not for current thread
    if (newAtt.thread_id !== threadId) {
      return;
    }

    // Dedupe: skip if already seen
    if (seenAttachmentIdsRef.current.has(newAtt.id)) {
      console.log("[Realtime] Skipping duplicate attachment:", newAtt.id);
      return;
    }

    // Skip if not linked to a message yet
    // (we'll get it via UPDATE when it gets linked, or via page refresh)
    if (!newAtt.message_id) {
      console.log("[Realtime] Attachment without message_id, waiting for link:", newAtt.id);
      return;
    }

    console.log("[Realtime] New/Updated attachment received:", newAtt.id);
    seenAttachmentIdsRef.current.add(newAtt.id);

    // Generate signed URL
    const { data: signedData } = await supabase.storage
      .from(newAtt.bucket || "chat-attachments")
      .createSignedUrl(newAtt.path, 3600);

    const uiAttachment: ChatAttachment = {
      id: newAtt.id,
      name: newAtt.original_name || newAtt.path.split("/").pop() || "file",
      size: newAtt.size_bytes || 0,
      type: newAtt.mime_type || "application/octet-stream",
      url: signedData?.signedUrl,
      previewUrl: signedData?.signedUrl,
      dbId: newAtt.id,
      storagePath: newAtt.path,
    };

    onNewAttachment(newAtt.message_id, uiAttachment);
  }, [threadId, onNewAttachment]);

  // Setup realtime subscription
  useEffect(() => {
    if (!enabled || !userId || !threadId) {
      // Cleanup existing channel
      if (channelRef.current) {
        console.log("[Realtime] Cleaning up channel (disabled or no thread)");
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Cleanup previous channel before creating new one
    if (channelRef.current) {
      console.log("[Realtime] Switching threads, cleaning up old channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log("[Realtime] Setting up subscription for thread:", threadId);

    // Create a unique channel name for this thread
    const channelName = `chat-sync-${threadId}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      // Listen for new messages in current thread
      .on<DbMessage>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        handleMessageInsert
      )
      // Listen for message updates (e.g., reactions)
      .on<DbMessage>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        handleMessageUpdate as any
      )
      // Listen for new attachments in current thread
      .on<DbAttachment>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_attachments",
          filter: `thread_id=eq.${threadId}`,
        },
        handleAttachmentChange
      )
      // Listen for attachment updates (when message_id gets set)
      .on<DbAttachment>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_attachments",
          filter: `thread_id=eq.${threadId}`,
        },
        handleAttachmentChange as any
      )
      .subscribe((status) => {
        console.log("[Realtime] Subscription status:", status);
      });

    channelRef.current = channel;

    // Cleanup on unmount or when deps change
    return () => {
      if (channelRef.current) {
        console.log("[Realtime] Cleanup on effect cleanup");
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [
    enabled,
    userId,
    threadId,
    handleMessageInsert,
    handleMessageUpdate,
    handleAttachmentChange,
  ]);

  return {
    markMessageSeen,
    markAttachmentSeen,
    initializeSeenIds,
  };
}

/**
 * Hook for real-time thread list updates.
 * Listens for new threads and thread updates (title, updated_at).
 */
export function useRealtimeThreads({
  userId,
  mode,
  enabled,
  onThreadInsert,
  onThreadUpdate,
}: {
  userId: string | undefined;
  mode: string | undefined;
  enabled: boolean;
  onThreadInsert: (thread: chatStore.ChatThread) => void;
  onThreadUpdate: (threadId: string, updates: Partial<chatStore.ChatThread>) => void;
}) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const seenThreadIdsRef = useRef<Set<string>>(new Set());

  const markThreadSeen = useCallback((threadId: string) => {
    seenThreadIdsRef.current.add(threadId);
  }, []);

  const initializeSeenThreads = useCallback((threads: chatStore.ChatThread[]) => {
    seenThreadIdsRef.current.clear();
    for (const t of threads) {
      seenThreadIdsRef.current.add(t.id);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !userId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `threads-sync-${userId}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on<chatStore.ChatThread>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_threads",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newThread = payload.new as chatStore.ChatThread;
          
          // Filter by mode if specified
          if (mode && newThread.mode !== mode) {
            return;
          }

          // Dedupe
          if (seenThreadIdsRef.current.has(newThread.id)) {
            console.log("[Realtime] Skipping duplicate thread:", newThread.id);
            return;
          }

          console.log("[Realtime] New thread received:", newThread.id);
          seenThreadIdsRef.current.add(newThread.id);
          onThreadInsert(newThread);
        }
      )
      .on<chatStore.ChatThread>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_threads",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as chatStore.ChatThread;
          
          // Filter by mode if specified
          if (mode && updated.mode !== mode) {
            return;
          }

          console.log("[Realtime] Thread updated:", updated.id);
          onThreadUpdate(updated.id, {
            title: updated.title,
            updated_at: updated.updated_at,
            last_message_preview: updated.last_message_preview,
            message_count: updated.message_count,
            summary: updated.summary,
          });
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Threads subscription status:", status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, userId, mode, onThreadInsert, onThreadUpdate]);

  return {
    markThreadSeen,
    initializeSeenThreads,
  };
}