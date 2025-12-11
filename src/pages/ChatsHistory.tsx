import { useState, useMemo, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Pin, 
  PinOff,
  Pencil, 
  Trash2, 
  FileDown,
  FolderPlus,
  MessageSquare,
  Globe,
  Paperclip,
  Image as ImageIcon,
  Brain
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/i18n/LanguageProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { listThreads, deleteThread, renameThread, ChatThread } from "@/lib/chatStore";
import { CHAT_MODES, getModeInfo } from "@/data/modes";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, parseISO } from "date-fns";
import { uz, ru, tr, enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

// Extended thread type with pinned status (stored locally for now)
interface ExtendedThread extends ChatThread {
  pinned?: boolean;
  flags?: {
    usedWebSearch?: boolean;
    hasFiles?: boolean;
    hasImages?: boolean;
    usedReasoner?: boolean;
  };
}

// Filter chip options
const MODE_FILTERS = [
  { id: "all", labelKey: "chats.filter.all", icon: null },
  ...CHAT_MODES.map(mode => ({ id: mode.id, labelKey: mode.title, icon: mode.icon })),
];

const SPECIAL_FILTERS = [
  { id: "search", labelKey: "chats.filter.search", icon: "🔎" },
  { id: "files", labelKey: "chats.filter.files", icon: "📎" },
  { id: "images", labelKey: "chats.filter.images", icon: "🖼" },
];

export default function ChatsHistory() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [threads, setThreads] = useState<ExtendedThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  
  // Modal states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<ExtendedThread | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [threadToRename, setThreadToRename] = useState<ExtendedThread | null>(null);
  const [newTitle, setNewTitle] = useState("");
  
  // Load pinned IDs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("bahor_pinned_chats");
    if (stored) {
      try {
        setPinnedIds(new Set(JSON.parse(stored)));
      } catch {}
    }
  }, []);
  
  // Save pinned IDs to localStorage
  const savePinnedIds = (ids: Set<string>) => {
    localStorage.setItem("bahor_pinned_chats", JSON.stringify([...ids]));
    setPinnedIds(ids);
  };
  
  // Load threads
  useEffect(() => {
    async function loadThreads() {
      if (!user?.id) return;
      setLoading(true);
      try {
        const data = await listThreads(user.id);
        setThreads(data);
      } catch (error) {
        console.error("Failed to load threads:", error);
        toast({
          title: t("common.error"),
          description: t("chats.loadError"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    loadThreads();
  }, [user?.id]);
  
  // Get date-fns locale
  const getLocale = () => {
    switch (language) {
      case "uz": return uz;
      case "ru": return ru;
      case "tr": return tr;
      default: return enUS;
    }
  };
  
  // Format relative time
  const formatTime = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return formatDistanceToNow(date, { addSuffix: true, locale: getLocale() });
    } catch {
      return "";
    }
  };
  
  // Group threads by date
  const groupedThreads = useMemo(() => {
    // Apply search filter
    let filtered = threads;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) ||
        (t.last_message_preview?.toLowerCase().includes(query))
      );
    }
    
    // Apply mode filter
    if (activeFilter !== "all") {
      if (activeFilter === "search") {
        filtered = filtered.filter(t => (t as ExtendedThread).flags?.usedWebSearch);
      } else if (activeFilter === "files") {
        filtered = filtered.filter(t => (t as ExtendedThread).flags?.hasFiles);
      } else if (activeFilter === "images") {
        filtered = filtered.filter(t => (t as ExtendedThread).flags?.hasImages);
      } else {
        filtered = filtered.filter(t => t.mode === activeFilter);
      }
    }
    
    // Separate pinned and non-pinned
    const pinned = filtered.filter(t => pinnedIds.has(t.id));
    const unpinned = filtered.filter(t => !pinnedIds.has(t.id));
    
    // Group unpinned by date
    const today: ExtendedThread[] = [];
    const yesterday: ExtendedThread[] = [];
    const thisWeek: ExtendedThread[] = [];
    const older: ExtendedThread[] = [];
    
    for (const thread of unpinned) {
      try {
        const date = parseISO(thread.updated_at);
        if (isToday(date)) {
          today.push(thread);
        } else if (isYesterday(date)) {
          yesterday.push(thread);
        } else if (isThisWeek(date)) {
          thisWeek.push(thread);
        } else {
          older.push(thread);
        }
      } catch {
        older.push(thread);
      }
    }
    
    return { pinned, today, yesterday, thisWeek, older };
  }, [threads, searchQuery, activeFilter, pinnedIds]);
  
  // Handle chat open
  const handleOpenChat = (thread: ExtendedThread) => {
    navigate(`/chat/${thread.mode}?thread=${thread.id}`);
  };
  
  // Handle new chat
  const handleNewChat = () => {
    sessionStorage.removeItem("bahor_session_chat_initialized");
    const newChatId = crypto.randomUUID?.() ?? Date.now().toString();
    navigate(`/chat/general?new=${newChatId}`);
  };
  
  // Handle pin toggle
  const handleTogglePin = (thread: ExtendedThread) => {
    const newPinned = new Set(pinnedIds);
    if (newPinned.has(thread.id)) {
      newPinned.delete(thread.id);
      toast({ description: t("chats.unpinned") });
    } else {
      newPinned.add(thread.id);
      toast({ description: t("chats.pinned") });
    }
    savePinnedIds(newPinned);
  };
  
  // Handle rename
  const handleRename = async () => {
    if (!threadToRename || !newTitle.trim()) return;
    try {
      await renameThread(threadToRename.id, newTitle.trim());
      setThreads(prev => prev.map(t => 
        t.id === threadToRename.id ? { ...t, title: newTitle.trim() } : t
      ));
      toast({ description: t("chats.renamed") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setRenameDialogOpen(false);
    setThreadToRename(null);
    setNewTitle("");
  };
  
  // Handle delete
  const handleDelete = async () => {
    if (!threadToDelete) return;
    try {
      await deleteThread(threadToDelete.id);
      setThreads(prev => prev.filter(t => t.id !== threadToDelete.id));
      // Remove from pinned if present
      if (pinnedIds.has(threadToDelete.id)) {
        const newPinned = new Set(pinnedIds);
        newPinned.delete(threadToDelete.id);
        savePinnedIds(newPinned);
      }
      toast({ description: t("chats.deleted") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setDeleteDialogOpen(false);
    setThreadToDelete(null);
  };
  
  // Render thread row
  const renderThreadRow = (thread: ExtendedThread) => {
    const modeInfo = getModeInfo(thread.mode);
    const isPinned = pinnedIds.has(thread.id);
    const flags = thread.flags || {};
    
    return (
      <div
        key={thread.id}
        className="group flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 cursor-pointer transition-colors"
        onClick={() => handleOpenChat(thread)}
      >
        {/* Mode icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center text-lg">
          {modeInfo?.icon || "💬"}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isPinned && <Pin className="w-3 h-3 text-primary flex-shrink-0" />}
            <h3 className="font-medium text-sm text-foreground truncate">
              {thread.title}
            </h3>
          </div>
          
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {thread.last_message_preview || t("chats.noMessages")}
          </p>
          
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {modeInfo?.title || thread.mode}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {formatTime(thread.updated_at)}
            </span>
          </div>
        </div>
        
        {/* Indicators */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {flags.usedWebSearch && <Globe className="w-3.5 h-3.5 text-muted-foreground" />}
          {flags.hasFiles && <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />}
          {flags.hasImages && <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />}
          {flags.usedReasoner && <Brain className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
        
        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => {
              setThreadToRename(thread);
              setNewTitle(thread.title);
              setRenameDialogOpen(true);
            }}>
              <Pencil className="w-4 h-4 mr-2" />
              {t("chats.rename")}
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => handleTogglePin(thread)}>
              {isPinned ? (
                <>
                  <PinOff className="w-4 h-4 mr-2" />
                  {t("chats.unpin")}
                </>
              ) : (
                <>
                  <Pin className="w-4 h-4 mr-2" />
                  {t("chats.pin")}
                </>
              )}
            </DropdownMenuItem>
            
            <DropdownMenuItem disabled>
              <FileDown className="w-4 h-4 mr-2" />
              {t("chats.exportPdf")}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem disabled className="text-muted-foreground">
              <FolderPlus className="w-4 h-4 mr-2" />
              {t("chats.addToFolder")}
              <Badge variant="outline" className="ml-2 text-[10px]">
                Premium
              </Badge>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => {
                setThreadToDelete(thread);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("chats.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };
  
  // Render group section
  const renderGroup = (title: string, threads: ExtendedThread[]) => {
    if (threads.length === 0) return null;
    return (
      <div className="mb-6">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 mb-2 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
          {title}
        </h2>
        <div className="space-y-1">
          {threads.map(renderThreadRow)}
        </div>
      </div>
    );
  };
  
  return (
    <>
      <SEO 
        title="Suhbatlar tarixi" 
        description="Barcha suhbatlar tarixi. O'tgan suhbatlarni ko'ring va davom ettiring."
        url="/chats"
        noIndex
      />
      <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {t("chats.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("chats.subtitle")}
            </p>
          </div>
          <Button onClick={handleNewChat} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("sidebar.new_chat")}</span>
          </Button>
        </div>
        
        {/* Search bar */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("chats.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary/30 border-border/50"
          />
        </div>
        
        {/* Filter chips */}
        <ScrollArea className="mt-3 -mx-4 px-4">
          <div className="flex gap-2 pb-1">
            {MODE_FILTERS.map(filter => (
              <Button
                key={filter.id}
                variant={activeFilter === filter.id ? "default" : "secondary"}
                size="sm"
                className={cn(
                  "flex-shrink-0 text-xs h-7 px-3 rounded-full",
                  activeFilter === filter.id && "bg-primary text-primary-foreground"
                )}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.icon && <span className="mr-1">{filter.icon}</span>}
                {filter.id === "all" ? t(filter.labelKey) : filter.labelKey}
              </Button>
            ))}
            <div className="w-px bg-border mx-1" />
            {SPECIAL_FILTERS.map(filter => (
              <Button
                key={filter.id}
                variant={activeFilter === filter.id ? "default" : "secondary"}
                size="sm"
                className={cn(
                  "flex-shrink-0 text-xs h-7 px-3 rounded-full",
                  activeFilter === filter.id && "bg-primary text-primary-foreground"
                )}
                onClick={() => setActiveFilter(filter.id)}
              >
                <span className="mr-1">{filter.icon}</span>
                {t(filter.labelKey)}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      
      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-1 py-4">
        {loading ? (
          <div className="space-y-3 px-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">
              {t("chats.empty")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("chats.emptyDescription")}
            </p>
            <Button onClick={handleNewChat} className="gap-1.5">
              <Plus className="w-4 h-4" />
              {t("sidebar.new_chat")}
            </Button>
          </div>
        ) : (
          <>
            {renderGroup(t("chats.group.pinned"), groupedThreads.pinned)}
            {renderGroup(t("chats.group.today"), groupedThreads.today)}
            {renderGroup(t("chats.group.yesterday"), groupedThreads.yesterday)}
            {renderGroup(t("chats.group.thisWeek"), groupedThreads.thisWeek)}
            {renderGroup(t("chats.group.older"), groupedThreads.older)}
            
            {/* No results */}
            {groupedThreads.pinned.length === 0 && 
             groupedThreads.today.length === 0 && 
             groupedThreads.yesterday.length === 0 && 
             groupedThreads.thisWeek.length === 0 && 
             groupedThreads.older.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t("chats.noResults")}</p>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chats.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chats.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("chats.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Rename dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chats.renameTitle")}</DialogTitle>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t("chats.renamePlaceholder")}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleRename} disabled={!newTitle.trim()}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
