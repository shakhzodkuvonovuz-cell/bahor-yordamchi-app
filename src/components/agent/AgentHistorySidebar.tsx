import { useState, useEffect, useCallback } from "react";
import { 
  History, Clock, Plus, Search, Eye, RefreshCw, Trash2, X, 
  Loader2, MessageSquare, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { uz } from "date-fns/locale";

interface AgentThread {
  id: string;
  title: string;
  rolling_summary?: string | null;
  created_at: string;
  updated_at: string;
}

interface AgentHistorySidebarProps {
  userId: string;
  currentThreadId?: string | null;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentHistorySidebar({
  userId,
  currentThreadId,
  onSelectThread,
  onNewThread,
  isOpen,
  onClose,
}: AgentHistorySidebarProps) {
  const [threads, setThreads] = useState<AgentThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("agent_threads")
        .select("id, title, rolling_summary, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (data) {
        setThreads(data);
      }
    } catch (error) {
      console.error("Load threads error:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      loadThreads();
    }
  }, [isOpen, userId, loadThreads]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("agent-threads-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_threads",
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setThreads((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setThreads((prev) => 
              prev.map((t) => (t.id === payload.new.id ? payload.new : t))
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            );
          } else if (payload.eventType === "DELETE") {
            setThreads((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleDelete = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(threadId);
    try {
      // Delete messages first
      await supabase.from("agent_messages").delete().eq("thread_id", threadId);
      // Delete thread (cascade will handle runs/steps via FK)
      await supabase.from("agent_threads").delete().eq("id", threadId);
      
      if (currentThreadId === threadId) {
        onNewThread();
      }
    } catch (error) {
      console.error("Delete thread error:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.rolling_summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group threads by date
  const groupedThreads = filteredThreads.reduce((acc, thread) => {
    const date = new Date(thread.updated_at);
    let group = "Eski";
    if (isToday(date)) group = "Bugun";
    else if (isYesterday(date)) group = "Kecha";
    else if (isThisWeek(date)) group = "Shu hafta";

    if (!acc[group]) acc[group] = [];
    acc[group].push(thread);
    return acc;
  }, {} as Record<string, AgentThread[]>);

  const groupOrder = ["Bugun", "Kecha", "Shu hafta", "Eski"];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-72 bg-background border-r flex flex-col animate-in slide-in-from-left-2 duration-200 lg:relative lg:animate-none">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Tarix</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 lg:hidden" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* New Thread Button */}
      <div className="p-2">
        <Button
          onClick={() => {
            onNewThread();
            onClose();
          }}
          className="w-full gap-2 h-9"
        >
          <Plus className="h-4 w-4" />
          Yangi vazifa
        </Button>
      </div>

      {/* Search */}
      <div className="px-2 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Thread List */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-3">
          {loading ? (
            <div className="space-y-2 pt-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Hali vazifalar yo'q</p>
            </div>
          ) : (
            groupOrder.map((group) => {
              const groupThreads = groupedThreads[group];
              if (!groupThreads?.length) return null;

              return (
                <div key={group}>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1">
                    {group}
                  </div>
                  <div className="space-y-1">
                    {groupThreads.map((thread) => (
                      <button
                        key={thread.id}
                        onClick={() => {
                          onSelectThread(thread.id);
                          onClose();
                        }}
                        className={cn(
                          "w-full text-left p-2 rounded-lg transition-colors group relative",
                          currentThreadId === thread.id
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <p className="text-xs font-medium line-clamp-2 pr-6">
                          {thread.title}
                        </p>
                        {thread.rolling_summary && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                            {thread.rolling_summary}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                          <span className="text-[9px] text-muted-foreground">
                            {format(new Date(thread.updated_at), "d MMM, HH:mm", { locale: uz })}
                          </span>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={(e) => handleDelete(thread.id, e)}
                          disabled={deletingId === thread.id}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                        >
                          {deletingId === thread.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
