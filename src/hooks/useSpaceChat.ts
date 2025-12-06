import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SpaceMessage, SpaceMessageAttachment } from "@/components/spaces/SpaceChatMessage";

interface UseSpaceChatOptions {
  spaceId: string;
  userId: string | undefined;
}

interface ReadReceipt {
  message_id: string;
  user_id: string;
  read_at: string;
  user_name?: string;
  user_avatar?: string;
}

function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useSpaceChat({ spaceId, userId }: UseSpaceChatOptions) {
  const [messages, setMessages] = useState<SpaceMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [profileMap, setProfileMap] = useState<Record<string, { name: string; avatar: string | null }>>({});
  const [readReceipts, setReadReceipts] = useState<Record<string, number>>({});
  const latestMessageRef = useRef<string | null>(null);
  const pendingClientIds = useRef<Set<string>>(new Set());

  // Fetch profiles for a set of user IDs
  const fetchProfiles = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return {};

    const newIds = userIds.filter((id) => !profileMap[id]);
    if (newIds.length === 0) return profileMap;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, avatar_url")
      .in("user_id", newIds);

    const newMap = { ...profileMap };
    (profiles || []).forEach((p) => {
      newMap[p.user_id] = {
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "User",
        avatar: p.avatar_url,
      };
    });

    setProfileMap(newMap);
    return newMap;
  }, [profileMap]);

  // Enrich messages with profile data
  const enrichMessages = useCallback(
    (msgs: any[], profiles: Record<string, { name: string; avatar: string | null }>): SpaceMessage[] => {
      return msgs.map((m) => ({
        ...m,
        attachments: m.attachments as SpaceMessageAttachment[] | null,
        senderName: profiles[m.sender_id]?.name || "User",
        senderAvatar: profiles[m.sender_id]?.avatar || undefined,
        readCount: readReceipts[m.id] || 0,
        status: pendingClientIds.current.has(m.client_id) ? "sending" : "sent",
      }));
    },
    [readReceipts]
  );

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!spaceId) return;

    setLoading(true);
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
            const attachmentsData = Array.isArray(r.attachments) 
              ? (r.attachments as unknown as SpaceMessageAttachment[]) 
              : null;
            replyMap[r.id] = {
              ...r,
              attachments: attachmentsData,
              senderName: profiles[r.sender_id]?.name || "User",
            } as SpaceMessage;
          });
        }
      }

      const enriched = enrichMessages(reversed, profiles).map((m) => ({
        ...m,
        replyToMessage: m.reply_to_id ? replyMap[m.reply_to_id] : null,
      }));

      setMessages(enriched);
      setHasMoreMessages(data && data.length === 50);

      if (reversed.length > 0) {
        latestMessageRef.current = reversed[reversed.length - 1].id;
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  }, [spaceId, fetchProfiles, enrichMessages]);

  // Fetch read receipts for messages
  const fetchReadReceipts = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    const { data } = await supabase
      .from("space_message_reads")
      .select("message_id, user_id")
      .in("message_id", messageIds);

    const counts: Record<string, number> = {};
    (data || []).forEach((r) => {
      // Exclude own reads
      if (r.user_id !== userId) {
        counts[r.message_id] = (counts[r.message_id] || 0) + 1;
      }
    });

    setReadReceipts((prev) => ({ ...prev, ...counts }));
  }, [userId]);

  // Send message (optimistic)
  const sendMessage = useCallback(
    async (content: string, replyToId?: string, attachments?: SpaceMessageAttachment[]) => {
      if (!spaceId || !userId) return;

      const clientId = generateClientId();
      pendingClientIds.current.add(clientId);

      // Optimistic message
      const optimisticMsg: SpaceMessage = {
        id: `temp-${clientId}`,
        sender_id: userId,
        content,
        type: attachments && attachments.length > 0 ? (attachments[0].mime.startsWith("image/") ? "image" : "file") : "text",
        created_at: new Date().toISOString(),
        reply_to_id: replyToId || null,
        attachments: attachments || null,
        client_id: clientId,
        deleted_at: null,
        senderName: profileMap[userId]?.name || "You",
        senderAvatar: profileMap[userId]?.avatar || undefined,
        status: "sending",
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setSending(true);

      try {
        const insertData: any = {
          space_id: spaceId,
          sender_id: userId,
          content: content || null,
          type: optimisticMsg.type,
          reply_to_id: replyToId || null,
          attachments: attachments || null,
          client_id: clientId,
        };

        const { error } = await supabase.from("space_messages").insert(insertData);

        if (error) throw error;
      } catch (err) {
        console.error("Error sending message:", err);
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== `temp-${clientId}`));
        pendingClientIds.current.delete(clientId);
      } finally {
        setSending(false);
      }
    },
    [spaceId, userId, profileMap]
  );

  // Upload file and send message
  const uploadAndSend = useCallback(
    async (files: FileList, content: string, replyToId?: string) => {
      if (!spaceId || !userId || files.length === 0) return;

      setUploading(true);
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
        setUploading(false);
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
        // Revert on error
        fetchMessages();
      }
    },
    [userId, fetchMessages]
  );

  // Mark message as read
  const markAsRead = useCallback(
    async (messageId: string) => {
      if (!userId || !messageId) return;

      try {
        await supabase.from("space_message_reads").upsert(
          {
            message_id: messageId,
            user_id: userId,
            read_at: new Date().toISOString(),
          },
          { onConflict: "message_id,user_id" }
        );
      } catch (err) {
        // Silently fail for read receipts
        console.error("Error marking as read:", err);
      }
    },
    [userId]
  );

  // Get readers for a message
  const getMessageReaders = useCallback(
    async (messageId: string): Promise<ReadReceipt[]> => {
      const { data } = await supabase
        .from("space_message_reads")
        .select("*")
        .eq("message_id", messageId);

      if (!data) return [];

      // Fetch profiles for readers
      const userIds = data.map((r) => r.user_id);
      const profiles = await fetchProfiles(userIds);

      return data.map((r) => ({
        ...r,
        user_name: profiles[r.user_id]?.name || "User",
        user_avatar: profiles[r.user_id]?.avatar || undefined,
      }));
    },
    [fetchProfiles]
  );

  // Set up realtime subscriptions
  useEffect(() => {
    if (!spaceId) return;

    const messagesChannel = supabase
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
          if (newMsg.client_id && pendingClientIds.current.has(newMsg.client_id)) {
            pendingClientIds.current.delete(newMsg.client_id);
            
            setMessages((prev) => {
              const filtered = prev.filter((m) => m.id !== `temp-${newMsg.client_id}`);
              const profiles = { ...profileMap };
              const enriched: SpaceMessage = {
                ...newMsg,
                senderName: profiles[newMsg.sender_id]?.name || "User",
                senderAvatar: profiles[newMsg.sender_id]?.avatar || undefined,
                status: "sent",
              };
              return [...filtered, enriched];
            });
          } else {
            // New message from someone else
            const profiles = await fetchProfiles([newMsg.sender_id]);
            
            setMessages((prev) => {
              // Dedupe by id
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              
              const enriched: SpaceMessage = {
                ...newMsg,
                senderName: profiles[newMsg.sender_id]?.name || "User",
                senderAvatar: profiles[newMsg.sender_id]?.avatar || undefined,
                status: "sent",
              };
              return [...prev, enriched];
            });
          }

          latestMessageRef.current = newMsg.id;
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
    const readsChannel = supabase
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
            setReadReceipts((prev) => ({
              ...prev,
              [newRead.message_id]: (prev[newRead.message_id] || 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(readsChannel);
    };
  }, [spaceId, userId, fetchProfiles, profileMap]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Fetch read receipts when messages change
  useEffect(() => {
    if (userId) {
      const ownMessageIds = messages.filter((m) => m.sender_id === userId && m.id && !m.id.startsWith("temp-")).map((m) => m.id);
      if (ownMessageIds.length > 0) {
        fetchReadReceipts(ownMessageIds);
      }
    }
  }, [messages, userId, fetchReadReceipts]);

  return {
    messages,
    loading,
    sending,
    uploading,
    uploadProgress,
    hasMoreMessages,
    sendMessage,
    uploadAndSend,
    deleteMessage,
    markAsRead,
    getMessageReaders,
    refetch: fetchMessages,
  };
}
