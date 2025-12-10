import { useState } from "react";
import { Search, Plus, MessageSquare, Trash2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface AgentThread {
  id: string;
  title: string;
  rolling_summary: string;
  pinned_context: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface AgentHistorySidebarProps {
  threads: AgentThread[];
  currentThreadId: string | null;
  isLoading: boolean;
  onSelectThread: (thread: AgentThread) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: string) => void;
  onClose: () => void;
}

export function AgentHistorySidebar({
  threads,
  currentThreadId,
  isLoading,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onClose,
}: AgentHistorySidebarProps) {
  const [search, setSearch] = useState("");

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Bugun";
    if (diffDays === 1) return "Kecha";
    if (diffDays < 7) return `${diffDays} kun oldin`;
    return date.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
  };

  return (
    <div className="flex flex-col h-full bg-background border-r">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Agent Tarixi</h3>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 lg:hidden" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Button onClick={onNewThread} className="w-full h-8 text-xs gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Yangi vazifa
        </Button>
      </div>

      {/* Threads List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">
                {search ? "Hech narsa topilmadi" : "Hali vazifalar yo'q"}
              </p>
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <div
                key={thread.id}
                className={cn(
                  "group flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                  currentThreadId === thread.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50"
                )}
                onClick={() => onSelectThread(thread)}
              >
                <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-2">{thread.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDate(thread.updated_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteThread(thread.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
