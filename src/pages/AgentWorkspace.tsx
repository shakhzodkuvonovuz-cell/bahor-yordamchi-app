import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Bot, ArrowLeft, FileText, MessageSquare, Files, Settings2, 
  Copy, Download, Save, Share2, Plus, Clock, Check, Loader2,
  ExternalLink, ChevronDown, ChevronUp, Link2, StickyNote,
  Paperclip, Send, RefreshCw, X, Eye, Image, AlertCircle, Upload,
  FileIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LanguageProvider";
import { AiResponseRenderer } from "@/components/ai/AiResponseRenderer";
import { cn } from "@/lib/utils";
import { downloadPDF } from "@/lib/pdfGenerator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AgentRun {
  id: string;
  goal: string;
  status: string;
  title?: string | null;
  extra_notes?: string | null;
  input_links?: any;
  final_output?: string | null;
  final_report_md?: string | null;
  sources?: any;
  created_at: string;
  updated_at: string;
}

interface AgentStep {
  id: string;
  step_index: number;
  title: string;
  status: string;
  tool_name?: string;
  tool_output?: any;
  created_at: string;
}

interface AgentMessage {
  id: string;
  run_id: string;
  role: string;
  content: string;
  created_at: string;
  metadata?: any;
}

interface AgentFile {
  id: string;
  filename: string;
  mime_type?: string;
  extraction_status: string;
  size_bytes?: number;
}

export default function AgentWorkspace() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { user } = useAuth();
  
  const [run, setRun] = useState<AgentRun | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("report");
  
  // Follow-up chat state
  const [followUpInput, setFollowUpInput] = useState("");
  const [isSendingFollowUp, setIsSendingFollowUp] = useState(false);
  
  // Timeline expanded state
  const [showTimeline, setShowTimeline] = useState(false);
  
  // Edit title state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  
  // File upload state
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Load run data
  useEffect(() => {
    if (!runId || !user) return;
    
    const loadWorkspace = async () => {
      setLoading(true);
      
      try {
        // Load run
        const { data: runData, error: runError } = await supabase
          .from("agent_runs")
          .select("*")
          .eq("id", runId)
          .eq("user_id", user.id)
          .single();
        
        if (runError || !runData) {
          toast.error("Ish topilmadi");
          navigate("/agent");
          return;
        }
        
        // Cast to our interface with extended fields
        const runWithExtras = runData as any;
        setRun({
          id: runWithExtras.id,
          goal: runWithExtras.goal,
          status: runWithExtras.status,
          title: runWithExtras.title,
          extra_notes: runWithExtras.extra_notes,
          input_links: runWithExtras.input_links,
          final_output: runWithExtras.final_output,
          final_report_md: runWithExtras.final_report_md,
          sources: runWithExtras.sources,
          created_at: runWithExtras.created_at,
          updated_at: runWithExtras.updated_at,
        });
        setEditedTitle(runWithExtras.title || runWithExtras.goal?.slice(0, 60) || "");
        
        // Load steps
        const { data: stepsData } = await supabase
          .from("agent_steps")
          .select("*")
          .eq("run_id", runId)
          .order("step_index", { ascending: true });
        
        if (stepsData) {
          setSteps(stepsData as unknown as AgentStep[]);
        }
        
        // Load existing messages from agent_messages table
        const { data: messagesData } = await supabase
          .from("agent_messages")
          .select("*")
          .eq("thread_id", runId)
          .order("created_at", { ascending: true });
        
        if (messagesData && messagesData.length > 0) {
          setMessages(messagesData.map((msg: any) => ({
            id: msg.id,
            run_id: runId,
            role: msg.role,
            content: msg.content,
            created_at: msg.created_at,
            metadata: msg.metadata,
          })));
        }
        
        // Load messages from separate run messages table if exists
        // Will be enabled once types regenerate
        
        // Load files
        const { data: filesData } = await supabase
          .from("agent_files")
          .select("*")
          .eq("run_id", runId);
        
        if (filesData) {
          setFiles(filesData as unknown as AgentFile[]);
        }
      } catch (error) {
        console.error("Load workspace error:", error);
        toast.error("Yuklanishda xato");
      } finally {
        setLoading(false);
      }
    };
    
    loadWorkspace();
  }, [runId, user, navigate]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!runId) return;
    
    const channel = supabase
      .channel(`workspace-${runId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agent_runs",
          filter: `id=eq.${runId}`,
        },
        (payload) => {
          setRun(payload.new as unknown as AgentRun);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_messages",
          filter: `thread_id=eq.${runId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as unknown as AgentMessage]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agent_files",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          // Update file status when extraction completes
          setFiles(prev => prev.map(f => 
            f.id === payload.new.id ? { ...f, ...payload.new } as AgentFile : f
          ));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_files",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          // Add new file
          setFiles(prev => {
            if (prev.some(f => f.id === payload.new.id)) return prev;
            return [...prev, payload.new as unknown as AgentFile];
          });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId]);

  // Send follow-up message
  const handleSendFollowUp = async () => {
    if (!followUpInput.trim() || !run || !user || isSendingFollowUp) return;
    
    const content = followUpInput.trim();
    setFollowUpInput("");
    setIsSendingFollowUp(true);
    
    try {
      // Add user message optimistically
      const tempId = crypto.randomUUID();
      const userMsg: AgentMessage = {
        id: tempId,
        run_id: run.id,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg]);
      
      // Call follow-up edge function
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-followup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({ 
            runId: run.id, 
            message: content,
            reportContext: run.final_output 
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error("Follow-up request failed");
      }
      
      const result = await response.json();
      
      // Add assistant message
      if (result.content) {
        const assistantMsg: AgentMessage = {
          id: result.message?.id || crypto.randomUUID(),
          run_id: run.id,
          role: "assistant",
          content: result.content,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
      
      setIsSendingFollowUp(false);
    } catch (error) {
      console.error("Follow-up error:", error);
      toast.error("Xabar yuborishda xato");
      setIsSendingFollowUp(false);
    }
  };

  // Update title - use type assertion since column is new
  const handleSaveTitle = async () => {
    if (!run || !editedTitle.trim()) return;
    
    try {
      // Update title using raw query
      await (supabase.from("agent_runs") as any)
        .update({ title: editedTitle.trim() })
        .eq("id", run.id);
      
      setRun(prev => prev ? { ...prev, title: editedTitle.trim() } : null);
      setIsEditingTitle(false);
      toast.success("Sarlavha saqlandi");
    } catch (error) {
      console.error("Save title error:", error);
      toast.error("Saqlashda xato");
    }
  };

  // Export handlers
  const handleCopyReport = () => {
    const content = run?.final_report_md || run?.final_output || "";
    navigator.clipboard.writeText(content);
    toast.success("Nusxa olindi");
  };

  // Copy as Google Docs friendly format (plain text with formatting preserved)
  const handleCopyAsGoogleDoc = () => {
    const content = run?.final_report_md || run?.final_output || "";
    // Convert markdown to clean text for Google Docs
    const cleanContent = content
      .replace(/^#{1,6}\s+/gm, '') // Remove heading markers but keep text
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/\*(.+?)\*/g, '$1') // Italic
      .replace(/`(.+?)`/g, '$1') // Code
      .replace(/^\s*[-*]\s+/gm, '• ') // List items
      .replace(/^\s*\d+\.\s+/gm, (m, i) => `${i + 1}. `) // Numbered lists
      .replace(/\n{3,}/g, '\n\n'); // Multiple newlines
    
    navigator.clipboard.writeText(cleanContent);
    toast.success("Google Docs uchun nusxa olindi");
  };

  const handleExportPDF = async () => {
    if (!run) return;
    
    try {
      toast.loading("PDF tayyorlanmoqda...");
      
      await downloadPDF({
        title: run.title || run.goal.slice(0, 60),
        content: run.final_report_md || run.final_output || "",
        date: new Date(run.created_at).toLocaleDateString("uz-UZ"),
        filename: `agent-report-${run.id.slice(0, 8)}.pdf`,
      });
      
      toast.dismiss();
      toast.success("PDF yuklab olindi");
    } catch (error) {
      toast.dismiss();
      toast.error("PDF yaratishda xato");
    }
  };
  
  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !run || !user) return;
    
    setIsUploadingFile(true);
    
    try {
      for (const file of Array.from(selectedFiles)) {
        const ext = file.name.split('.').pop() || 'bin';
        const path = `${user.id}/${run.id}/${Date.now()}-${file.name}`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("agent-files")
          .upload(path, file);
        
        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Fayl yuklashda xato: ${file.name}`);
          continue;
        }
        
        // Create file record
        const { data: fileData, error: fileError } = await supabase
          .from("agent_files")
          .insert({
            user_id: user.id,
            run_id: run.id,
            filename: file.name,
            storage_path: path,
            mime_type: file.type,
            size_bytes: file.size,
            extraction_status: "pending",
          })
          .select()
          .single();
        
        if (fileError) {
          console.error("File record error:", fileError);
          continue;
        }
        
        // Add to local state
        if (fileData) {
          setFiles(prev => [...prev, fileData as unknown as AgentFile]);
        }
        
        // Trigger extraction
        const { data: session } = await supabase.auth.getSession();
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-extract-file`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.session?.access_token}`,
            },
            body: JSON.stringify({ fileId: fileData.id }),
          }
        ).catch(console.error);
      }
      
      toast.success("Fayl(lar) yuklandi");
    } catch (error) {
      console.error("File upload error:", error);
      toast.error("Fayl yuklashda xato");
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Update report button
  const handleUpdateReport = async () => {
    if (!run || !user) return;
    
    try {
      toast.loading("Hisobot yangilanmoqda...");
      
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-update-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({ runId: run.id }),
        }
      );
      
      if (!response.ok) throw new Error("Update failed");
      
      const result = await response.json();
      setRun(prev => prev ? { ...prev, final_report_md: result.report } : null);
      
      toast.dismiss();
      toast.success("Hisobot yangilandi");
    } catch (error) {
      toast.dismiss();
      toast.error("Yangilashda xato");
    }
  };

  // Get status badge
  const getStatusBadge = () => {
    if (!run) return null;
    
    switch (run.status) {
      case "done":
        return <Badge className="bg-green-500/10 text-green-600">Tayyor</Badge>;
      case "running":
        return <Badge className="bg-primary/10 text-primary"><Loader2 className="h-3 w-3 animate-spin mr-1" />Bajarilmoqda</Badge>;
      case "error":
        return <Badge variant="destructive">Xato</Badge>;
      default:
        return <Badge variant="outline">{run.status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Ish topilmadi</p>
        <Button onClick={() => navigate("/agent")} className="mt-4">
          Ortga qaytish
        </Button>
      </div>
    );
  }

  const reportContent = run.final_report_md || run.final_output || "";

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden max-w-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-2 sm:p-3 border-b bg-background/95 backdrop-blur shrink-0 min-w-0">
        <Button
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/agent")}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex-1 min-w-0 overflow-hidden">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="h-7 text-sm flex-1 min-w-0"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
              />
              <Button size="sm" className="h-7 shrink-0" onClick={handleSaveTitle}>
                <Check className="h-3 w-3" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 shrink-0"
                onClick={() => setIsEditingTitle(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <button 
              onClick={() => setIsEditingTitle(true)}
              className="text-left hover:bg-muted/50 rounded px-1 -ml-1 max-w-full"
            >
              <h1 className="text-xs sm:text-sm font-semibold truncate max-w-[200px] sm:max-w-none">
                {run.title || run.goal.slice(0, 50)}
              </h1>
            </button>
          )}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
            {getStatusBadge()}
            <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden xs:inline">
              {new Date(run.created_at).toLocaleDateString("uz-UZ", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          {/* Copy dropdown for mobile, separate buttons for desktop */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Nusxa</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={handleCopyReport}>
                <Copy className="h-3.5 w-3.5 mr-2" />
                Markdown nusxa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyAsGoogleDoc}>
                <FileText className="h-3.5 w-3.5 mr-2" />
                Google Docs uchun
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleExportPDF}>
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button size="sm" className="h-8 gap-1.5 bg-primary" onClick={() => navigate("/agent")}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Yangi</span>
          </Button>
        </div>
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Rail - Context (hidden on mobile) */}
        <div className="hidden lg:flex w-72 border-r flex-col overflow-hidden bg-muted/30">
          <ScrollArea className="flex-1 p-3">
            {/* Prompt Section */}
            <div className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5" />
                Savol
              </h3>
              <Card className="p-3">
                <p className="text-sm">{run.goal}</p>
              </Card>
            </div>
            
            {/* Extra Notes */}
            {run.extra_notes && (
              <div className="mb-4">
                <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" />
                  Eslatmalar
                </h3>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">{run.extra_notes}</p>
                </Card>
              </div>
            )}
            
            {/* Files */}
            {files.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Files className="h-3.5 w-3.5" />
                  Fayllar ({files.length})
                </h3>
                <div className="space-y-1.5">
                  {files.map((file) => (
                    <Card key={file.id} className="p-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs truncate flex-1">{file.filename}</span>
                      <Badge 
                        variant={file.extraction_status === "ready" ? "secondary" : "outline"}
                        className="text-[9px] h-4"
                      >
                        {file.extraction_status === "ready" ? "✓" : "..."}
                      </Badge>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* Links */}
            {run.input_links && run.input_links.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  Havolalar
                </h3>
                <div className="space-y-1.5">
                  {run.input_links.map((link, i) => (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted text-xs truncate"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      {new URL(link).hostname}
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {/* Timeline */}
            <Collapsible open={showTimeline} onOpenChange={setShowTimeline}>
              <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground mb-2">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Bosqichlar ({steps.length})
                </span>
                {showTimeline ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1.5">
                  {steps.map((step, i) => (
                    <div 
                      key={step.id}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-lg text-xs",
                        step.status === "done" && "bg-green-500/5",
                        step.status === "error" && "bg-destructive/5"
                      )}
                    >
                      <div className="mt-0.5">
                        {step.status === "done" ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : step.status === "error" ? (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{step.title}</p>
                        {step.tool_name && (
                          <Badge variant="outline" className="text-[9px] h-4 mt-0.5">
                            {step.tool_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </ScrollArea>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-3 pt-3 shrink-0">
              <TabsList className="grid w-full grid-cols-3 h-9">
                <TabsTrigger value="report" className="gap-1 text-xs px-2">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Hisobot</span>
                </TabsTrigger>
                <TabsTrigger value="chat" className="gap-1 text-xs px-2">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Suhbat</span>
                </TabsTrigger>
                <TabsTrigger value="files" className="gap-1 text-xs px-2 lg:hidden">
                  <Files className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Fayllar</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Report Tab */}
            <TabsContent value="report" className="flex-1 overflow-y-auto mt-0 p-3">
              <div className="max-w-3xl mx-auto pb-8">
                  {/* Report Content */}
                  <Card className="p-4 md:p-6">
                    <AiResponseRenderer content={reportContent} />
                  </Card>
                  
                  {/* Sources */}
                  {run.sources && run.sources.length > 0 && (
                    <Card className="mt-4 p-4">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Manbalar ({run.sources.length})
                      </h3>
                      <div className="grid gap-2">
                        {run.sources.map((source: any, i: number) => (
                          <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                          >
                            <Badge variant="outline" className="shrink-0 mt-0.5">
                              {i + 1}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium line-clamp-1">{source.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{source.url}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </Card>
                  )}
                  
                  {/* How this was built */}
                  <Collapsible className="mt-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Settings2 className="h-3.5 w-3.5" />
                        Qanday tayyorlangan
                        <ChevronDown className="h-3.5 w-3.5 ml-auto" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <Card className="p-3">
                        <div className="space-y-2">
                          {steps.map((step, i) => (
                            <div key={step.id} className="flex items-start gap-2 text-xs">
                              <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                              <div>
                                <p className="font-medium">{step.title}</p>
                                {step.tool_name && (
                                  <span className="text-muted-foreground">
                                    Vosita: {step.tool_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1.5"
                      onClick={() => setActiveTab("chat")}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Savol berish
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1.5"
                      onClick={handleUpdateReport}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Yangilash
                    </Button>
                </div>
              </div>
            </TabsContent>
            
            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden mt-0">
              <ScrollArea className="flex-1 p-3">
                <div className="max-w-2xl mx-auto space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <Card
                        className={cn(
                          "p-3 max-w-[85%]",
                          msg.role === "user" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        )}
                      >
                        {msg.role === "assistant" ? (
                          <AiResponseRenderer content={msg.content} />
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                        <p className="text-[10px] opacity-60 mt-2">
                          {new Date(msg.created_at).toLocaleTimeString("uz-UZ", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </Card>
                    </div>
                  ))}
                  
                  {isSendingFollowUp && (
                    <div className="flex gap-3">
                      <Card className="p-3 bg-muted">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </Card>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {/* Chat Input */}
              <div className="p-3 border-t shrink-0">
                <div className="max-w-2xl mx-auto flex gap-2">
                  <Textarea
                    value={followUpInput}
                    onChange={(e) => setFollowUpInput(e.target.value)}
                    placeholder="Davom ettiring yoki savol bering..."
                    className="min-h-[44px] max-h-32 resize-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendFollowUp();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSendFollowUp}
                    disabled={!followUpInput.trim() || isSendingFollowUp}
                    className="shrink-0"
                  >
                    {isSendingFollowUp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            {/* Files Tab (Mobile only) */}
            <TabsContent value="files" className="flex-1 overflow-hidden mt-0 p-3 lg:hidden">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {/* Prompt */}
                  <Card className="p-3">
                    <h3 className="text-xs font-medium text-muted-foreground mb-2">Savol</h3>
                    <p className="text-sm break-words">{run.goal}</p>
                  </Card>
                  
                  {/* Upload button */}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingFile}
                  >
                    {isUploadingFile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Fayl qo'shish
                  </Button>
                  
                  {/* Files */}
                  {files.length > 0 ? (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-2">
                        Fayllar ({files.length})
                      </h3>
                      <div className="space-y-2">
                        {files.map((file) => (
                          <Card key={file.id} className="p-3 flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.filename}</p>
                              {file.size_bytes && (
                                <p className="text-xs text-muted-foreground">
                                  {(file.size_bytes / 1024).toFixed(1)} KB
                                </p>
                              )}
                            </div>
                            <Badge variant={file.extraction_status === "ready" ? "secondary" : "outline"} className="shrink-0">
                              {file.extraction_status === "ready" ? "Tayyor" : "..."}
                            </Badge>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Files className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Fayl yuklanmagan</p>
                    </div>
                  )}
                  
                  {/* Timeline */}
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-2">
                      Bosqichlar ({steps.length})
                    </h3>
                    <div className="space-y-2">
                      {steps.map((step, i) => (
                        <Card key={step.id} className="p-2 flex items-start gap-2">
                          <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium break-words">{step.title}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {step.tool_name && (
                                <Badge variant="secondary" className="text-[9px]">
                                  {step.tool_name}
                                </Badge>
                              )}
                              <Badge 
                                variant={step.status === "done" ? "secondary" : "outline"}
                                className="text-[9px]"
                              >
                                {step.status === "done" ? "✓" : step.status}
                              </Badge>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
