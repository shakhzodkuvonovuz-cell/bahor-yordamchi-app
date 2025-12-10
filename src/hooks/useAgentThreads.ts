import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AgentThread } from "@/components/agent/AgentHistorySidebar";
import type { AgentMessage } from "@/components/agent/AgentThreadView";

const MAX_MESSAGES_CONTEXT = 60;
const SUMMARY_MAX_CHARS = 1500;

export function useAgentThreads(userId: string | undefined) {
  const [threads, setThreads] = useState<AgentThread[]>([]);
  const [currentThread, setCurrentThread] = useState<AgentThread | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Load all threads
  const loadThreads = useCallback(async () => {
    if (!userId) return;
    setIsLoadingThreads(true);
    try {
      const { data, error } = await supabase
        .from("agent_threads")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setThreads((data || []) as AgentThread[]);
    } catch (error) {
      console.error("Load threads error:", error);
    } finally {
      setIsLoadingThreads(false);
    }
  }, [userId]);

  // Load messages for a thread
  const loadMessages = useCallback(async (threadId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("agent_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data || []) as AgentMessage[]);
    } catch (error) {
      console.error("Load messages error:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Create new thread
  const createThread = useCallback(async (title: string = "Yangi vazifa") => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from("agent_threads")
        .insert({ user_id: userId, title })
        .select()
        .single();

      if (error) throw error;
      const newThread = data as AgentThread;
      setThreads((prev) => [newThread, ...prev]);
      setCurrentThread(newThread);
      setMessages([]);
      return newThread;
    } catch (error) {
      console.error("Create thread error:", error);
      toast.error("Yangi vazifa yaratishda xato");
      return null;
    }
  }, [userId]);

  // Select thread
  const selectThread = useCallback(async (thread: AgentThread) => {
    setCurrentThread(thread);
    await loadMessages(thread.id);
  }, [loadMessages]);

  // Delete thread
  const deleteThread = useCallback(async (threadId: string) => {
    try {
      const { error } = await supabase
        .from("agent_threads")
        .delete()
        .eq("id", threadId);

      if (error) throw error;
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (currentThread?.id === threadId) {
        setCurrentThread(null);
        setMessages([]);
      }
      toast.success("O'chirildi");
    } catch (error) {
      console.error("Delete thread error:", error);
      toast.error("O'chirishda xato");
    }
  }, [currentThread?.id]);

  // Update thread title
  const updateThreadTitle = useCallback(async (threadId: string, title: string) => {
    try {
      const { error } = await supabase
        .from("agent_threads")
        .update({ title })
        .eq("id", threadId);

      if (error) throw error;
      setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, title } : t)));
      if (currentThread?.id === threadId) {
        setCurrentThread((prev) => (prev ? { ...prev, title } : null));
      }
    } catch (error) {
      console.error("Update title error:", error);
    }
  }, [currentThread?.id]);

  // Add message
  const addMessage = useCallback(async (
    threadId: string,
    role: "user" | "assistant" | "tool",
    content: string,
    metadata: Record<string, any> = {}
  ) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from("agent_messages")
        .insert({
          thread_id: threadId,
          user_id: userId,
          role,
          content,
          metadata,
        })
        .select()
        .single();

      if (error) throw error;
      const newMsg = data as AgentMessage;
      setMessages((prev) => [...prev, newMsg]);
      return newMsg;
    } catch (error) {
      console.error("Add message error:", error);
      return null;
    }
  }, [userId]);

  // Pin/unpin message
  const togglePinMessage = useCallback(async (messageId: string, isPinned: boolean) => {
    if (!currentThread) return;

    try {
      // Update message
      const { error: msgError } = await supabase
        .from("agent_messages")
        .update({ is_pinned: isPinned })
        .eq("id", messageId);

      if (msgError) throw msgError;

      // Update local state
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_pinned: isPinned } : m))
      );

      // Update pinned_context on thread
      const msg = messages.find((m) => m.id === messageId);
      if (msg) {
        const newPinnedContext = { ...currentThread.pinned_context };
        if (isPinned) {
          newPinnedContext[messageId] = {
            role: msg.role,
            content: msg.content.slice(0, 500),
            pinned_at: new Date().toISOString(),
          };
        } else {
          delete newPinnedContext[messageId];
        }

        const { error: threadError } = await supabase
          .from("agent_threads")
          .update({ pinned_context: newPinnedContext })
          .eq("id", currentThread.id);

        if (threadError) throw threadError;

        setCurrentThread((prev) =>
          prev ? { ...prev, pinned_context: newPinnedContext } : null
        );
      }

      toast.success(isPinned ? "Pinlandi" : "Pin olib tashlandi");
    } catch (error) {
      console.error("Toggle pin error:", error);
      toast.error("Xato yuz berdi");
    }
  }, [currentThread, messages]);

  // Update rolling summary
  const updateRollingSummary = useCallback(async (threadId: string, summary: string) => {
    try {
      const { error } = await supabase
        .from("agent_threads")
        .update({ rolling_summary: summary.slice(0, SUMMARY_MAX_CHARS) })
        .eq("id", threadId);

      if (error) throw error;

      setCurrentThread((prev) =>
        prev?.id === threadId ? { ...prev, rolling_summary: summary } : prev
      );
    } catch (error) {
      console.error("Update summary error:", error);
    }
  }, []);

  // Get context for model (summary + pinned + last N messages)
  const getThreadContext = useCallback(() => {
    if (!currentThread) return { systemContext: "", messages: [] };

    let systemContext = "";

    // Add rolling summary
    if (currentThread.rolling_summary) {
      systemContext += `## Conversation Summary\n${currentThread.rolling_summary}\n\n`;
    }

    // Add pinned context
    const pinnedItems = Object.values(currentThread.pinned_context || {});
    if (pinnedItems.length > 0) {
      systemContext += `## Pinned Information\n`;
      pinnedItems.forEach((item: any, i) => {
        systemContext += `${i + 1}. [${item.role}]: ${item.content}\n`;
      });
      systemContext += "\n";
    }

    // Get last N messages
    const recentMessages = messages.slice(-MAX_MESSAGES_CONTEXT);

    return { systemContext, messages: recentMessages };
  }, [currentThread, messages]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!currentThread?.id) return;

    const channel = supabase
      .channel(`agent-messages-${currentThread.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_messages",
          filter: `thread_id=eq.${currentThread.id}`,
        },
        (payload) => {
          const newMsg = payload.new as AgentMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentThread?.id]);

  // Load threads on mount
  useEffect(() => {
    if (userId) {
      loadThreads();
    }
  }, [userId, loadThreads]);

  return {
    threads,
    currentThread,
    messages,
    isLoadingThreads,
    isLoadingMessages,
    loadThreads,
    createThread,
    selectThread,
    deleteThread,
    updateThreadTitle,
    addMessage,
    togglePinMessage,
    updateRollingSummary,
    getThreadContext,
    setCurrentThread,
    setMessages,
  };
}
