import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CircleMessage, CircleMessageAttachment, SpaceMessage, SpaceMessageAttachment } from "@/components/circles/CircleChatMessage";

interface UseCircleChatOptions {
  spaceId: string;
  userId: string | undefined;
}

interface ProfileData {
  name: string;
  avatar: string | null;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "failed";
  error?: string;
}

function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_RETRIES = 2;

export function useCircleChat({ spaceId, userId }: UseCircleChatOptions) {
  const [messages, setMessages] = useState<SpaceMessage[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  // Refs for stable subscriptions
  const profileMapRef = useRef<Record<string, ProfileData>>({});
  const pendingClientIdsRef = useRef<Set<string>>(new Set());
  const readReceiptsRef = useRef<Record<string, number>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const readsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const hasFetchedRef = useRef(false);
  const markReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMarkedMessageRef = useRef<string | null>(null);
  const messagesMapRef = useRef<Record<string, SpaceMessage>>({});

  // Fetch profiles - memoized with ref
  const fetchProfiles = useCallback(async (userIds: string[]): Promise<Record<string, ProfileData>> => {
    if (userIds.length === 0) return profileMapRef.current;

    const newIds = userIds.filter((id) => !profileMapRef.current[id]);
    if (newIds.length === 0) return profileMapRef.current;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, avatar_url")
      .in("user_id", newIds);

    (profiles || []).forEach((p) => {
      profileMapRef.current[p.user_id] = {
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "User",
        avatar: p.avatar_url,
      };
    });

    return profileMapRef.current;
  }, []);

  // Get signed URLs for attachments
  const getSignedUrls = useCallback(async (attachments: SpaceMessageAttachment[]): Promise<SpaceMessageAttachment[]> => {
    if (!attachments || attachments.length === 0) return [];
    
    const enrichedAttachments = await Promise.all(
      attachments.map(async (att) => {
        if (att.signedUrl) return att;
        
        try {
          const { data } = await supabase.storage
            .from("space-chat-files")
            .createSignedUrl(att.path, 60 * 10);
          
          return { ...att, signedUrl: data?.signedUrl || undefined };
        } catch {
          return att;
        }
      })
    );
    
    return enrichedAttachments;
  }, []);

  // Enrich single message with profile data
  const enrichMessage = useCallback(async (msg: any, profiles: Record<string, ProfileData>): Promise<SpaceMessage> => {
    const rawAttachments = Array.isArray(msg.attachments)
      ? (msg.attachments as unknown as SpaceMessageAttachment[])
      : null;
    
    // Get signed URLs for attachments
    const attachments = rawAttachments ? await getSignedUrls(rawAttachments) : null;

    const enriched: SpaceMessage = {
      ...msg,
      attachments,
      senderName: profiles[msg.sender_id]?.name || "User",
      senderAvatar: profiles[msg.sender_id]?.avatar || undefined,
      readCount: readReceiptsRef.current[msg.id] || 0,
      status: pendingClientIdsRef.current.has(msg.client_id) ? "sending" : "sent",
    };
    
    // Store in map for reply lookups
    messagesMapRef.current[msg.id] = enriched;
    
    return enriched;
  }, [getSignedUrls]);

  // Fetch initial messages - runs only once
  const fetchMessages = useCallback(async () => {
    if (!spaceId || !userId || hasFetchedRef.current) return;

    try {
      const { data, error } = await supabase
        .from("space_messages")
        .select("*")
        .eq("space_id", spaceId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const reversed = (data || []).reverse();
      const userIds = [...new Set(reversed.map((m) => m.sender_id))];
      const profiles = await fetchProfiles(userIds);

      // First pass: enrich all messages
      const enrichedMessages: SpaceMessage[] = [];
      for (const m of reversed) {
        const enriched = await enrichMessage(m, profiles);
        enrichedMessages.push(enriched);
      }

      // Second pass: resolve reply_to_id references
      const replyIds = reversed.filter((m) => m.reply_to_id).map((m) => m.reply_to_id!);
      if (replyIds.length > 0) {
        const { data: replyData } = await supabase
          .from("space_messages")
          .select("*")
          .in("id", replyIds);

        if (replyData) {
          const replyUserIds = [...new Set(replyData.map((r) => r.sender_id))];
          await fetchProfiles(replyUserIds);

          for (const r of replyData) {
            if (!messagesMapRef.current[r.id]) {
              await enrichMessage(r, profileMapRef.current);
            }
          }
        }
      }

      // Add replyToMessage references
      const finalMessages = enrichedMessages.map((m) => ({
        ...m,
        replyToMessage: m.reply_to_id ? messagesMapRef.current[m.reply_to_id] || null : null,
      }));

      // Fetch read receipts for own messages
      const ownMessageIds = reversed.filter((m) => m.sender_id === userId).map((m) => m.id);
      if (ownMessageIds.length > 0) {
        const { data: readsData } = await supabase
          .from("space_message_reads")
          .select("message_id, user_id")
          .in("message_id", ownMessageIds);

        (readsData || []).forEach((r) => {
          if (r.user_id !== userId) {
            readReceiptsRef.current[r.message_id] = (readReceiptsRef.current[r.message_id] || 0) + 1;
          }
        });

        // Update read counts in final messages
        finalMessages.forEach((m, idx) => {
          if (readReceiptsRef.current[m.id]) {
            finalMessages[idx] = { ...m, readCount: readReceiptsRef.current[m.id] };
          }
        });
      }

      setMessages(finalMessages);
      hasFetchedRef.current = true;
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setIsInitialLoading(false);
    }
  }, [spaceId, userId, fetchProfiles, enrichMessage]);

  // Upload single file with retries
  // Path format: {spaceId}/{messageId}/{timestamp}-{sanitizedFilename}
  // This matches the storage RLS policies which extract spaceId from the first path segment
  const uploadFileWithRetry = useCallback(async (
    file: File,
    fileId: string,
    messageId: string,
    onProgress: (fileId: string, progress: number) => void
  ): Promise<SpaceMessageAttachment | null> => {
    if (!userId) throw new Error("Not authenticated");
    
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${file.name} (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
    }

    const sanitized = sanitizeFilename(file.name);
    // Path format: {spaceId}/{messageId}/{timestamp}-{filename}
    // RLS extracts spaceId from segment 1 using regexp_match
    const path = `${spaceId}/${messageId}/${Date.now()}-${sanitized}`;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Get the file as blob with correct type
        const blob = new Blob([await file.arrayBuffer()], { type: file.type || "application/octet-stream" });
        
        const { error: uploadError } = await supabase.storage
          .from("space-chat-files")
          .upload(path, blob, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        onProgress(fileId, 100);
        return {
          path,
          mime: file.type || "application/octet-stream",
          name: file.name,
          size: file.size,
        };
      } catch (err) {
        lastError = err as Error;
        if (attempt < MAX_RETRIES) {
          // Wait before retry
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          onProgress(fileId, 30 * (attempt + 1));
        }
      }
    }

    throw lastError || new Error("Upload failed");
  }, [spaceId, userId]);

  // Send message with optimistic UI
  const sendMessage = useCallback(
    async (content: string, replyToId?: string, attachments?: SpaceMessageAttachment[], replyToMessage?: SpaceMessage) => {
      if (!spaceId || !userId) return;

      const clientId = generateClientId();
      pendingClientIdsRef.current.add(clientId);

      const msgType = attachments && attachments.length > 0
        ? (attachments[0].mime.startsWith("image/") ? "image" : "file")
        : "text";

      // Optimistic message
      const optimisticMsg: SpaceMessage = {
        id: `temp-${clientId}`,
        sender_id: userId,
        content,
        type: msgType,
        created_at: new Date().toISOString(),
        reply_to_id: replyToId || null,
        attachments: attachments || null,
        client_id: clientId,
        deleted_at: null,
        senderName: profileMapRef.current[userId]?.name || "You",
        senderAvatar: profileMapRef.current[userId]?.avatar || undefined,
        status: "sending",
        replyToMessage: replyToMessage || (replyToId ? messagesMapRef.current[replyToId] : null),
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setIsSending(true);

      try {
        const insertPayload = {
          space_id: spaceId,
          sender_id: userId,
          content: content || null,
          type: msgType,
          reply_to_id: replyToId || null,
          attachments: attachments as any || null,
          client_id: clientId,
        };
        
        const { error } = await supabase.from("space_messages").insert(insertPayload);

        if (error) throw error;
        // Realtime will handle replacing the optimistic message
      } catch (err) {
        console.error("Error sending message:", err);
        // Mark as failed
        setMessages((prev) =>
          prev.map((m) =>
            m.id === `temp-${clientId}` ? { ...m, status: "failed" as const } : m
          )
        );
        pendingClientIdsRef.current.delete(clientId);
      } finally {
        setIsSending(false);
      }
    },
    [spaceId, userId]
  );

  // Send with attachments - uploads files first, then sends combined message
  const sendWithAttachments = useCallback(
    async (content: string, files: File[], replyToId?: string, replyToMessage?: SpaceMessage) => {
      if (!spaceId || !userId || files.length === 0) return;

      setIsUploading(true);

      const tempMessageId = crypto.randomUUID();
      const clientId = generateClientId();
      
      pendingClientIdsRef.current.add(clientId);
      
      // Optimistic message with loading state
      const optimisticMsg: SpaceMessage = {
        id: `temp-${clientId}`,
        sender_id: userId,
        content: content || null,
        type: "file",
        created_at: new Date().toISOString(),
        reply_to_id: replyToId || null,
        attachments: null,
        client_id: clientId,
        deleted_at: null,
        senderName: profileMapRef.current[userId]?.name || "You",
        senderAvatar: profileMapRef.current[userId]?.avatar || undefined,
        status: "sending",
        replyToMessage: replyToMessage || (replyToId ? messagesMapRef.current[replyToId] : null),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      const successfulAttachments: SpaceMessageAttachment[] = [];

      try {
        for (const file of files) {
          try {
            const attachment = await uploadFileWithRetry(
              file, 
              `file-${Date.now()}`, 
              tempMessageId, 
              () => {}
            );
            if (attachment) {
              successfulAttachments.push(attachment);
            }
          } catch (err: any) {
            console.error("Upload failed for file:", file.name, err);
          }
        }

        if (successfulAttachments.length > 0) {
          const attachmentsWithUrls = await getSignedUrls(successfulAttachments);
          
          // Update optimistic message with attachments
          setMessages((prev) =>
            prev.map((m) =>
              m.id === `temp-${clientId}`
                ? { ...m, attachments: attachmentsWithUrls, type: attachmentsWithUrls[0].mime.startsWith("image/") ? "image" : "file" }
                : m
            )
          );

          // Insert into DB
          const msgType = successfulAttachments[0].mime.startsWith("image/") ? "image" : "file";
          const { error } = await supabase.from("space_messages").insert({
            space_id: spaceId,
            sender_id: userId,
            content: content || null,
            type: msgType,
            reply_to_id: replyToId || null,
            attachments: successfulAttachments as any,
            client_id: clientId,
          });

          if (error) throw error;
        } else {
          // All files failed
          setMessages((prev) =>
            prev.map((m) =>
              m.id === `temp-${clientId}` ? { ...m, status: "failed" as const } : m
            )
          );
          pendingClientIdsRef.current.delete(clientId);
        }
      } catch (err) {
        console.error("Error uploading files:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === `temp-${clientId}` ? { ...m, status: "failed" as const } : m
          )
        );
        pendingClientIdsRef.current.delete(clientId);
      } finally {
        setIsUploading(false);
      }
    },
    [spaceId, userId, uploadFileWithRetry, getSignedUrls]
  );

  // Legacy uploadAndSend for backwards compatibility
  const uploadAndSend = useCallback(
    async (files: FileList, content: string, replyToId?: string, replyToMessage?: SpaceMessage) => {
      return sendWithAttachments(content, Array.from(files), replyToId, replyToMessage);
    },
    [sendWithAttachments]
  );

  // Retry failed message
  const retryMessage = useCallback(
    async (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (!message || message.status !== "failed") return;

      // Remove the failed message
      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      // Resend
      if (message.attachments && message.attachments.length > 0) {
        // For attachment messages, we can't retry upload, just show error
        console.warn("Cannot retry attachment uploads");
      } else {
        await sendMessage(message.content || "", message.reply_to_id || undefined, undefined, message.replyToMessage || undefined);
      }
    },
    [messages, sendMessage]
  );

  // Delete message (soft delete)
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!userId) return;

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, deleted_at: new Date().toISOString(), content: null } : m
        )
      );

      try {
        const { error } = await supabase
          .from("space_messages")
          .update({ deleted_at: new Date().toISOString(), content: null })
          .eq("id", messageId)
          .eq("sender_id", userId);

        if (error) throw error;
      } catch (err) {
        console.error("Error deleting message:", err);
      }
    },
    [userId]
  );

  // Mark message as read - debounced
  const markAsRead = useCallback(
    (messageId: string) => {
      if (!userId || !messageId || messageId.startsWith("temp-")) return;
      if (lastMarkedMessageRef.current === messageId) return;

      // Clear existing timeout
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
      }

      // Debounce by 1 second
      markReadTimeoutRef.current = setTimeout(async () => {
        try {
          await supabase.from("space_message_reads").upsert(
            {
              message_id: messageId,
              user_id: userId,
              read_at: new Date().toISOString(),
            },
            { onConflict: "message_id,user_id" }
          );
          lastMarkedMessageRef.current = messageId;
        } catch (err) {
          console.error("Error marking as read:", err);
        }
      }, 1000);
    },
    [userId]
  );

  // Get readers for a message
  const getMessageReaders = useCallback(
    async (messageId: string) => {
      const { data } = await supabase
        .from("space_message_reads")
        .select("*")
        .eq("message_id", messageId);

      if (!data) return [];

      const userIds = data.map((r) => r.user_id);
      await fetchProfiles(userIds);

      return data.map((r) => ({
        ...r,
        user_name: profileMapRef.current[r.user_id]?.name || "User",
        user_avatar: profileMapRef.current[r.user_id]?.avatar || undefined,
      }));
    },
    [fetchProfiles]
  );

  // Setup realtime subscriptions - stable, runs once per spaceId
  useEffect(() => {
    if (!spaceId || !userId) return;

    // Cleanup existing channels
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    if (readsChannelRef.current) {
      supabase.removeChannel(readsChannelRef.current);
    }

    // Messages channel
    channelRef.current = supabase
      .channel(`space-chat-${spaceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "space_messages",
          filter: `space_id=eq.${spaceId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;

          // If this is our optimistic message, replace it
          if (newMsg.client_id && pendingClientIdsRef.current.has(newMsg.client_id)) {
            pendingClientIdsRef.current.delete(newMsg.client_id);

            const enriched = await enrichMessage(newMsg, profileMapRef.current);
            setMessages((prev) => {
              const filtered = prev.filter((m) => m.id !== `temp-${newMsg.client_id}`);
              return [...filtered, { ...enriched, status: "sent", replyToMessage: messagesMapRef.current[newMsg.reply_to_id] || null }];
            });
          } else {
            // New message from someone else
            await fetchProfiles([newMsg.sender_id]);

            const enriched = await enrichMessage(newMsg, profileMapRef.current);
            setMessages((prev) => {
              // Dedupe by id
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, { ...enriched, status: "sent", replyToMessage: messagesMapRef.current[newMsg.reply_to_id] || null }];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "space_messages",
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as any;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updatedMsg.id
                ? {
                    ...m,
                    content: updatedMsg.content,
                    deleted_at: updatedMsg.deleted_at,
                    edited_at: updatedMsg.edited_at,
                    attachments: updatedMsg.attachments,
                  }
                : m
            )
          );
        }
      )
      .subscribe();

    // Read receipts channel
    readsChannelRef.current = supabase
      .channel(`space-reads-${spaceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "space_message_reads",
        },
        (payload) => {
          const newRead = payload.new as any;
          if (newRead.user_id !== userId) {
            readReceiptsRef.current[newRead.message_id] =
              (readReceiptsRef.current[newRead.message_id] || 0) + 1;

            // Update message read count in state
            setMessages((prev) =>
              prev.map((m) =>
                m.id === newRead.message_id
                  ? { ...m, readCount: readReceiptsRef.current[newRead.message_id] }
                  : m
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (readsChannelRef.current) {
        supabase.removeChannel(readsChannelRef.current);
        readsChannelRef.current = null;
      }
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
      }
    };
  }, [spaceId, userId, enrichMessage, fetchProfiles]);

  // Initial fetch - runs once
  useEffect(() => {
    if (spaceId && userId && !hasFetchedRef.current) {
      fetchMessages();
    }
  }, [spaceId, userId, fetchMessages]);

  // Reset when spaceId changes
  useEffect(() => {
    hasFetchedRef.current = false;
    setMessages([]);
    setIsInitialLoading(true);
    profileMapRef.current = {};
    readReceiptsRef.current = {};
    messagesMapRef.current = {};
    pendingClientIdsRef.current.clear();
  }, [spaceId]);

  return {
    messages,
    isInitialLoading,
    isSending,
    isUploading,
    uploadProgress,
    uploadingFiles,
    sendMessage,
    sendWithAttachments,
    uploadAndSend,
    retryMessage,
    deleteMessage,
    markAsRead,
    getMessageReaders,
  };
}
