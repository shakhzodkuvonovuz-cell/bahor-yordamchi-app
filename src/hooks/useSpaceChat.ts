import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SpaceMessage, SpaceMessageAttachment } from "@/components/spaces/SpaceChatMessage";

interface UseSpaceChatOptions {
  spaceId: string;
  userId: string | undefined;
}

interface ProfileData {
  name: string;
  avatar: string | null;
}

function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useSpaceChat({ spaceId, userId }: UseSpaceChatOptions) {
  const [messages, setMessages] = useState<SpaceMessage[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Refs for stable subscriptions
  const profileMapRef = useRef<Record<string, ProfileData>>({});
  const pendingClientIdsRef = useRef<Set<string>>(new Set());
  const readReceiptsRef = useRef<Record<string, number>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const readsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const hasFetchedRef = useRef(false);
  const markReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMarkedMessageRef = useRef<string | null>(null);

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

  // Enrich single message with profile data
  const enrichMessage = useCallback((msg: any, profiles: Record<string, ProfileData>): SpaceMessage => {
    const attachments = Array.isArray(msg.attachments)
      ? (msg.attachments as unknown as SpaceMessageAttachment[])
      : null;

    return {
      ...msg,
      attachments,
      senderName: profiles[msg.sender_id]?.name || "User",
      senderAvatar: profiles[msg.sender_id]?.avatar || undefined,
      readCount: readReceiptsRef.current[msg.id] || 0,
      status: pendingClientIdsRef.current.has(msg.client_id) ? "sending" : "sent",
    };
  }, []);

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

      // Fetch reply-to messages
      const replyIds = reversed.filter((m) => m.reply_to_id).map((m) => m.reply_to_id);
      let replyMap: Record<string, SpaceMessage> = {};

      if (replyIds.length > 0) {
        const { data: replyData } = await supabase
          .from("space_messages")
          .select("*")
          .in("id", replyIds);

        if (replyData) {
          const replyUserIds = [...new Set(replyData.map((r) => r.sender_id))];
          await fetchProfiles(replyUserIds);

          replyData.forEach((r) => {
            replyMap[r.id] = enrichMessage(r, profileMapRef.current);
          });
        }
      }

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
      }

      const enriched = reversed.map((m) => ({
        ...enrichMessage(m, profiles),
        replyToMessage: m.reply_to_id ? replyMap[m.reply_to_id] : null,
      }));

      setMessages(enriched);
      hasFetchedRef.current = true;
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setIsInitialLoading(false);
    }
  }, [spaceId, userId, fetchProfiles, enrichMessage]);

  // Send message with optimistic UI
  const sendMessage = useCallback(
    async (content: string, replyToId?: string, attachments?: SpaceMessageAttachment[]) => {
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

  // Upload and send
  const uploadAndSend = useCallback(
    async (files: FileList, content: string, replyToId?: string) => {
      if (!spaceId || !userId || files.length === 0) return;

      setIsUploading(true);
      setUploadProgress(0);

      const attachments: SpaceMessageAttachment[] = [];

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const now = new Date();
          const path = `${spaceId}/${userId}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}_${file.name}`;

          const { error: uploadError } = await supabase.storage
            .from("space-chat-files")
            .upload(path, file);

          if (uploadError) throw uploadError;

          attachments.push({
            path,
            mime: file.type,
            name: file.name,
            size: file.size,
          });

          setUploadProgress(Math.round(((i + 1) / files.length) * 100));
        }

        await sendMessage(content, replyToId, attachments);
      } catch (err) {
        console.error("Error uploading files:", err);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [spaceId, userId, sendMessage]
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

            setMessages((prev) => {
              const filtered = prev.filter((m) => m.id !== `temp-${newMsg.client_id}`);
              const enriched = enrichMessage(newMsg, profileMapRef.current);
              return [...filtered, { ...enriched, status: "sent" }];
            });
          } else {
            // New message from someone else
            await fetchProfiles([newMsg.sender_id]);

            setMessages((prev) => {
              // Dedupe by id
              if (prev.some((m) => m.id === newMsg.id)) return prev;

              const enriched = enrichMessage(newMsg, profileMapRef.current);
              return [...prev, { ...enriched, status: "sent" }];
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
    pendingClientIdsRef.current.clear();
  }, [spaceId]);

  return {
    messages,
    isInitialLoading,
    isSending,
    isUploading,
    uploadProgress,
    sendMessage,
    uploadAndSend,
    deleteMessage,
    markAsRead,
    getMessageReaders,
  };
}
