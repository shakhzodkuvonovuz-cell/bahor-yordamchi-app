import { useState, useEffect, useCallback } from "react";
import { 
  Bot, Play, Square, RotateCcw, Check, Loader2, AlertCircle, Sparkles, 
  ExternalLink, ChevronDown, ChevronUp, Save, Upload, File, X, Link2,
  StickyNote, FileText, Copy, Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LanguageProvider";
import { AiResponseRenderer } from "@/components/ai/AiResponseRenderer";
import { cn } from "@/lib/utils";

interface AgentStep {
  id: string;
  step_index: number;
  title: string;
  rationale?: string | null;
  status: string;
  tool_name?: string | null;
  tool_output?: any;
  error?: string | null;
}

interface AgentRun {
  id: string;
  goal: string;
  status: string;
  plan?: any;
  final_output?: string | null;
  sources?: any;
  created_at: string;
}

interface AgentFile {
  id: string;
  filename: string;
  mime_type?: string;
  size_bytes?: number;
  extraction_status: string;
  storage_path: string;
}

const SAMPLE_GOALS = [
  "O'zbekistondagi eng yaxshi IT universitetlarni taqqosla",
  "Marketing reja tuzing: yangi mahsulotni bozorga chiqarish",
  "Python dasturlash tilini o'rganish rejasi tuzing",
  "Kichik biznes uchun moliyaviy tahlil qiling",
];

export default function Agent() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  
  const [goal, setGoal] = useState("");
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState("files");
  
  // Workspace state
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [notes, setNotes] = useState("");
  const [useWebSearch, setUseWebSearch] = useState(true);
  
  // Constraints
  const [showConstraints, setShowConstraints] = useState(false);
  const [constraints, setConstraints] = useState({
    tone: "",
    length: "",
    language: language as string,
    audience: "",
  });

  // Subscribe to step updates
  useEffect(() => {
    if (!currentRun?.id) return;

    const channel = supabase
      .channel(`agent-steps-${currentRun.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_steps",
          filter: `run_id=eq.${currentRun.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setSteps((prev) => [...prev, payload.new as AgentStep].sort((a, b) => a.step_index - b.step_index));
          } else if (payload.eventType === "UPDATE") {
            setSteps((prev) =>
              prev.map((s) => (s.id === payload.new.id ? (payload.new as AgentStep) : s))
            );
          }
        }
      )
      .subscribe();

    // Also subscribe to run updates
    const runChannel = supabase
      .channel(`agent-run-${currentRun.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agent_runs",
          filter: `id=eq.${currentRun.id}`,
        },
        (payload) => {
          setCurrentRun(payload.new as unknown as AgentRun);
          if (payload.new.status === "done" || payload.new.status === "cancelled") {
            setIsRunning(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(runChannel);
    };
  }, [currentRun?.id]);

  // Load steps when run changes
  useEffect(() => {
    if (!currentRun?.id) return;

    const loadSteps = async () => {
      const { data } = await supabase
        .from("agent_steps")
        .select("*")
        .eq("run_id", currentRun.id)
        .order("step_index", { ascending: true });

      if (data) {
        setSteps(data as unknown as AgentStep[]);
      }
    };

    loadSteps();
  }, [currentRun?.id]);

  // File upload handler
  const handleFileUpload = useCallback(async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || !user) return;

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
      "text/csv",
      "text/markdown",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    for (const file of Array.from(uploadedFiles)) {
      if (!validTypes.includes(file.type)) {
        toast.error(`Fayl turi qo'llab-quvvatlanmaydi: ${file.name}`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Fayl juda katta: ${file.name} (max 10MB)`);
        continue;
      }

      const tempId = crypto.randomUUID();
      const storagePath = `${user.id}/agent/${tempId}-${file.name}`;

      // Add to local state as "uploading"
      const tempFile: AgentFile = {
        id: tempId,
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        extraction_status: "uploading",
        storage_path: storagePath,
      };
      setFiles((prev) => [...prev, tempFile]);

      try {
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        // Create DB record
        const { data: fileRecord, error: dbError } = await supabase
          .from("agent_files")
          .insert({
            user_id: user.id,
            storage_path: storagePath,
            filename: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            extraction_status: "pending",
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // Update local state with real ID
        setFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? { ...f, id: fileRecord.id, extraction_status: "pending" }
              : f
          )
        );

        // Trigger extraction
        const { data: session } = await supabase.auth.getSession();
        const extractResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-extract-file`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.session?.access_token}`,
            },
            body: JSON.stringify({
              fileId: fileRecord.id,
              storagePath,
              mimeType: file.type,
            }),
          }
        );

        if (extractResponse.ok) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileRecord.id ? { ...f, extraction_status: "ready" } : f
            )
          );
          toast.success(`${file.name} tayyor`);
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileRecord.id ? { ...f, extraction_status: "failed" } : f
            )
          );
        }
      } catch (error: any) {
        console.error("Upload error:", error);
        setFiles((prev) => prev.filter((f) => f.id !== tempId));
        toast.error(`Yuklashda xato: ${file.name}`);
      }
    }
  }, [user]);

  const handleRemoveFile = async (fileId: string, storagePath: string) => {
    try {
      await supabase.from("agent_files").delete().eq("id", fileId);
      await supabase.storage.from("chat-attachments").remove([storagePath]);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (error) {
      console.error("Remove file error:", error);
    }
  };

  const handleAddLink = () => {
    if (newLink.trim() && !links.includes(newLink.trim())) {
      setLinks((prev) => [...prev, newLink.trim()]);
      setNewLink("");
    }
  };

  const handleRun = async () => {
    if (!goal.trim() || !user) return;

    setIsRunning(true);
    setCurrentRun(null);
    setSteps([]);

    try {
      // Get file contents
      const fileContents = await Promise.all(
        files
          .filter((f) => f.extraction_status === "ready")
          .map(async (f) => {
            const { data } = await supabase
              .from("agent_files")
              .select("extracted_text, filename")
              .eq("id", f.id)
              .single();
            return data ? { filename: data.filename, text: data.extracted_text } : null;
          })
      );

      const validFiles = fileContents.filter(Boolean);

      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            goal: goal.trim(),
            constraints,
            files: validFiles,
            links,
            notes,
            useWebSearch,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Agent run failed");
      }

      // Load the completed run
      const { data: run } = await supabase
        .from("agent_runs")
        .select("*")
        .eq("id", result.runId)
        .single();

      if (run) {
        setCurrentRun(run as unknown as AgentRun);
      }

      toast.success("Agent vazifani bajardi!");
    } catch (error: any) {
      console.error("Agent error:", error);
      toast.error(error.message || "Failed to run agent");
      setIsRunning(false);
    }
  };

  const handleCancel = async () => {
    if (!currentRun?.id) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({ runId: currentRun.id, action: "cancel" }),
        }
      );

      setCurrentRun((prev) => prev ? { ...prev, status: "cancelled" } : null);
      setIsRunning(false);
      toast.info("Agent to'xtatildi");
    } catch (error) {
      console.error("Cancel error:", error);
    }
  };

  const handleCopyResult = () => {
    if (currentRun?.final_output) {
      navigator.clipboard.writeText(currentRun.final_output);
      toast.success("Nusxa olindi!");
    }
  };

  const toggleStepExpanded = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case "done":
        return <Check className="h-4 w-4 text-green-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  const getFileStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-[10px]">Tayyor</Badge>;
      case "extracting":
      case "pending":
      case "uploading":
        return <Badge variant="secondary" className="text-[10px]"><Loader2 className="h-3 w-3 animate-spin mr-1" />O'qilmoqda</Badge>;
      case "failed":
        return <Badge variant="destructive" className="text-[10px]">Xato</Badge>;
      default:
        return null;
    }
  };

  const completedSteps = steps.filter((s) => s.status === "done").length;
  const totalSteps = steps.length;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-3 py-2 md:p-4 space-y-2.5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">{t("agent.title") || "Agent"}</h1>
          <p className="text-xs text-muted-foreground">
            AI ko'p bosqichli vazifalarni rejalashtiradi va bajaradi
          </p>
        </div>
      </div>

      {/* Goal Input */}
      <Card>
        <CardContent className="pt-3 space-y-2.5">
          <Textarea
            placeholder="Maqsadingizni yozing... Masalan: 'Yangi mobil ilova uchun marketing strategiyasini tuzing'"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="min-h-[80px] resize-none text-sm"
            disabled={isRunning}
          />
          
          {/* Sample goals */}
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_GOALS.map((sample, i) => (
              <button
                key={i}
                onClick={() => setGoal(sample)}
                className="text-[11px] px-2 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isRunning}
              >
                {sample.slice(0, 35)}...
              </button>
            ))}
          </div>

          {/* Constraints Accordion */}
          <Collapsible open={showConstraints} onOpenChange={setShowConstraints}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-7 text-xs">
                <Settings2 className="h-3.5 w-3.5" />
                Qo'shimcha sozlamalar
                {showConstraints ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">Ohang</label>
                  <Input
                    placeholder="Rasmiy, do'stona..."
                    value={constraints.tone}
                    onChange={(e) => setConstraints((c) => ({ ...c, tone: e.target.value }))}
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">Hajmi</label>
                  <Input
                    placeholder="Qisqa, batafsil..."
                    value={constraints.length}
                    onChange={(e) => setConstraints((c) => ({ ...c, length: e.target.value }))}
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">Auditoriya</label>
                  <Input
                    placeholder="Talabalar, biznesmenlar..."
                    value={constraints.audience}
                    onChange={(e) => setConstraints((c) => ({ ...c, audience: e.target.value }))}
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">Til</label>
                  <Input
                    placeholder="O'zbekcha, English..."
                    value={constraints.language}
                    onChange={(e) => setConstraints((c) => ({ ...c, language: e.target.value }))}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Workspace Tabs */}
      <Card className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <CardHeader className="py-2 px-3">
            <TabsList className="grid grid-cols-4 w-full h-8">
              <TabsTrigger value="files" className="text-[11px] gap-1 h-7">
                <File className="h-3 w-3" />
                <span className="hidden sm:inline">Fayllar</span>
                {files.length > 0 && <Badge variant="secondary" className="h-3.5 w-3.5 p-0 text-[9px] justify-center">{files.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="links" className="text-[11px] gap-1 h-7">
                <Link2 className="h-3 w-3" />
                <span className="hidden sm:inline">Havolalar</span>
                {links.length > 0 && <Badge variant="secondary" className="h-3.5 w-3.5 p-0 text-[9px] justify-center">{links.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-[11px] gap-1 h-7">
                <StickyNote className="h-3 w-3" />
                <span className="hidden sm:inline">Eslatmalar</span>
              </TabsTrigger>
              <TabsTrigger value="results" className="text-[11px] gap-1 h-7">
                <FileText className="h-3 w-3" />
                <span className="hidden sm:inline">Natijalar</span>
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-2 pb-3 px-3 flex-1 overflow-auto">
            {/* Files Tab */}
            <TabsContent value="files" className="mt-0 space-y-2">
              <div
                className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileUpload(e.dataTransfer.files);
                }}
                onClick={() => document.getElementById("agent-file-input")?.click()}
              >
                <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1.5" />
                <p className="text-xs text-muted-foreground">
                  Fayllarni shu yerga tashlang yoki <span className="text-primary">tanlang</span>
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  PDF, DOCX, TXT, rasmlar (max 10MB)
                </p>
                <input
                  id="agent-file-input"
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt,.csv,.md,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-1.5">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                    >
                      <File className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{file.filename}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {file.size_bytes ? `${(file.size_bytes / 1024).toFixed(1)} KB` : ""}
                        </p>
                      </div>
                      {getFileStatusBadge(file.extraction_status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleRemoveFile(file.id, file.storage_path)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Links Tab */}
            <TabsContent value="links" className="mt-0 space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
                  className="flex-1 h-8 text-xs"
                />
                <Button onClick={handleAddLink} size="sm" className="h-8 text-xs">
                  Qo'shish
                </Button>
              </div>
              {links.length > 0 && (
                <div className="space-y-1.5">
                  {links.map((link, i) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-muted/50">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs truncate flex-1">{link}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-0">
              <Textarea
                placeholder="Qo'shimcha ma'lumotlar, talablar, yoki kontekst..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] resize-none text-xs"
              />
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="mt-0">
              {currentRun?.final_output ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Check className="h-2.5 w-2.5" />
                      Tayyor
                    </Badge>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" onClick={handleCopyResult} className="gap-1 h-7 text-xs">
                        <Copy className="h-3 w-3" />
                        Nusxa
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 h-7 text-xs">
                        <Save className="h-3 w-3" />
                        Saqlash
                      </Button>
                    </div>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                    <AiResponseRenderer content={currentRun.final_output} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Natijalar bu yerda ko'rsatiladi</p>
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Run Button */}
      <div className="flex items-center gap-2 pt-1">
        {isRunning ? (
          <>
            <Button variant="destructive" onClick={handleCancel} className="gap-1.5 flex-1 sm:flex-none h-9 text-sm">
              <Square className="h-3.5 w-3.5" />
              To'xtatish
            </Button>
            {totalSteps > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{completedSteps}/{totalSteps} qadam</span>
              </div>
            )}
          </>
        ) : (
          <>
            <Button onClick={handleRun} disabled={!goal.trim()} className="gap-1.5 flex-1 sm:flex-none h-9 text-sm">
              <Play className="h-3.5 w-3.5" />
              Ishga tushirish
            </Button>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={useWebSearch}
                onChange={(e) => setUseWebSearch(e.target.checked)}
                className="rounded border-border h-3.5 w-3.5"
              />
              <span className="text-muted-foreground">Web qidiruv</span>
            </label>
          </>
        )}
      </div>

      {/* Planning Skeleton */}
      {isRunning && steps.length === 0 && (
        <Card>
          <CardHeader className="py-2 px-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
              <span className="text-xs font-medium">Reja tuzilmoqda...</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 px-3 py-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
            <Skeleton className="h-6 w-4/6" />
          </CardContent>
        </Card>
      )}

      {/* Steps Progress */}
      {steps.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Bajarish rejasi
              <Badge variant="outline" className="ml-auto text-xs">
                {completedSteps}/{totalSteps}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {steps.map((step, index) => (
              <Collapsible
                key={step.id}
                open={expandedSteps.has(index)}
                onOpenChange={() => toggleStepExpanded(index)}
              >
                <div
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg transition-colors",
                    step.status === "running" && "bg-primary/5",
                    step.status === "done" && "bg-green-500/5",
                    step.status === "error" && "bg-destructive/5"
                  )}
                >
                  <div className="mt-0.5">{getStepIcon(step.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{step.title}</span>
                      {step.tool_name && (
                        <Badge variant="secondary" className="text-xs">
                          {step.tool_name}
                        </Badge>
                      )}
                    </div>
                    {step.rationale && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.rationale}
                      </p>
                    )}
                    
                    <CollapsibleContent>
                      {step.tool_output?.result && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                          <AiResponseRenderer content={step.tool_output.result} />
                        </div>
                      )}
                      {step.error && (
                        <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive flex items-center justify-between">
                          <span>{step.error}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Qayta
                          </Button>
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                  
                  {(step.tool_output?.result || step.error) && (
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        {expandedSteps.has(index) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  )}
                </div>
              </Collapsible>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sources Strip */}
      {currentRun?.sources && currentRun.sources.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Manbalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {currentRun.sources.map((source: any, i: number) => (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm transition-colors"
                >
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=16`}
                    alt=""
                    className="h-4 w-4 rounded-sm"
                  />
                  <span className="truncate max-w-[200px]">{source.title}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
