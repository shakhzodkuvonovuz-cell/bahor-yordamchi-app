import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Bot, Play, Square, RotateCcw, Check, Loader2, AlertCircle, Sparkles, 
  ExternalLink, ChevronDown, ChevronUp, Save, Upload, File, X, Link2,
  StickyNote, FileText, Copy, Settings2, Image, Download, ZoomIn, History,
  Clock, Trash2, Eye, RefreshCw, FileDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LanguageProvider";
import { AiResponseRenderer } from "@/components/ai/AiResponseRenderer";
import { cn } from "@/lib/utils";
import { downloadPDF } from "@/lib/pdfGenerator";
import { useAgentFileStatus } from "@/hooks/useAgentFileStatus";
import { AgentDebugPanel } from "@/components/agent/AgentDebugPanel";
import { AgentFileGating } from "@/components/agent/AgentFileGating";
import { AgentEvidenceWarning } from "@/components/agent/AgentEvidenceWarning";

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

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  goal?: string;
  sources?: any[];
}

interface AgentFile {
  id: string;
  filename: string;
  mime_type?: string;
  size_bytes?: number;
  extraction_status: string;
  storage_path: string;
}

interface GeneratedImage {
  url: string;
  stepIndex: number;
  stepTitle: string;
}

interface ContextSnapshot {
  goal: string;
  filesIncluded: number;
  totalChars: number;
  filesPayload?: Array<{ filename: string; textLength: number }>;
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
  const [activeTab, setActiveTab] = useState("goal");
  
  // Workspace state
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [notes, setNotes] = useState("");
  const [useWebSearch, setUseWebSearch] = useState(true);
  
  // Generated images state
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // History state (legacy runs)
  const [showHistory, setShowHistory] = useState(false);
  const [pastRuns, setPastRuns] = useState<AgentRun[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Conversation history for follow-ups
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  
  // Constraints
  const [showConstraints, setShowConstraints] = useState(false);
  const [constraints, setConstraints] = useState({
    tone: "",
    length: "",
    language: language as string,
    audience: "",
  });
  
  // File gating state
  const [runWithoutFiles, setRunWithoutFiles] = useState(false);
  const [isRetryingExtraction, setIsRetryingExtraction] = useState(false);
  const [contextSnapshot, setContextSnapshot] = useState<ContextSnapshot | null>(null);
  
  // File IDs for gating check
  const fileIds = useMemo(() => files.map(f => f.id), [files]);
  const fileReadiness = useAgentFileStatus(fileIds);
  
  // Determine if agent can run
  const canRunAgent = useMemo(() => {
    if (!goal.trim() || isRunning) return false;
    if (runWithoutFiles) return true; // User explicitly chose to run without files
    if (files.length === 0) return true; // No files attached
    if (fileReadiness.hasProcessingFiles) return false; // Block if still processing
    if (fileReadiness.allFilesReady) return true; // All files ready
    // Has failed files but no processing - allow with warning
    return fileReadiness.failedCount > 0 && fileReadiness.processingCount === 0;
  }, [goal, isRunning, runWithoutFiles, files.length, fileReadiness]);
  
  // Run gating message
  const runGatingMessage = useMemo(() => {
    if (files.length > 0 && fileReadiness.hasProcessingFiles && !runWithoutFiles) {
      return "Fayllar o'qilmoqda...";
    }
    return null;
  }, [files.length, fileReadiness.hasProcessingFiles, runWithoutFiles]);

  // Load history
  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from("agent_runs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (data) {
        setPastRuns(data as unknown as AgentRun[]);
      }
    } catch (error) {
      console.error("Load history error:", error);
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    if (showHistory && user) {
      loadHistory();
    }
  }, [showHistory, user, loadHistory]);

  const handleViewPastRun = async (run: AgentRun) => {
    setCurrentRun(run);
    setShowHistory(false);
    setActiveTab("results");
    setGeneratedImages([]);
    
    // Load steps for this run
    const { data: stepsData } = await supabase
      .from("agent_steps")
      .select("*")
      .eq("run_id", run.id)
      .order("step_index", { ascending: true });
    
    if (stepsData) {
      setSteps(stepsData as unknown as AgentStep[]);
      
      // Extract images from steps
      const images: GeneratedImage[] = [];
      stepsData.forEach((step: any) => {
        if (step.tool_output?.imageUrl) {
          images.push({
            url: step.tool_output.imageUrl,
            stepIndex: step.step_index,
            stepTitle: step.title,
          });
        }
      });
      setGeneratedImages(images);
    }
  };

  const handleRerun = (run: AgentRun) => {
    setGoal(run.goal);
    setCurrentRun(null);
    setSteps([]);
    setGeneratedImages([]);
    setShowHistory(false);
    toast.info("Maqsad kiritildi. Ishga tushirish uchun bosing.");
  };

  const handleDeleteRun = async (runId: string) => {
    try {
      await supabase.from("agent_steps").delete().eq("run_id", runId);
      await supabase.from("agent_runs").delete().eq("id", runId);
      setPastRuns((prev) => prev.filter((r) => r.id !== runId));
      if (currentRun?.id === runId) {
        setCurrentRun(null);
        setSteps([]);
        setGeneratedImages([]);
      }
      toast.success("O'chirildi");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("O'chirishda xato");
    }
  };

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
            const updatedStep = payload.new as AgentStep;
            setSteps((prev) =>
              prev.map((s) => (s.id === updatedStep.id ? updatedStep : s))
            );
            
            // Extract generated images from step output
            if (updatedStep.tool_output?.imageUrl) {
              setGeneratedImages((prev) => {
                const exists = prev.some(img => img.url === updatedStep.tool_output.imageUrl);
                if (!exists) {
                  return [...prev, {
                    url: updatedStep.tool_output.imageUrl,
                    stepIndex: updatedStep.step_index,
                    stepTitle: updatedStep.title
                  }];
                }
                return prev;
              });
            }
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
          const updatedRun = payload.new as unknown as AgentRun;
          setCurrentRun(updatedRun);
          if (payload.new.status === "done") {
            setIsRunning(false);
            setGoal(""); // Clear goal after successful completion
            toast.success("Agent vazifani bajardi!");
            
            // Add assistant response to conversation history
            if (updatedRun.final_output) {
              setConversationHistory(prev => [...prev, { 
                role: "assistant", 
                content: updatedRun.final_output || "",
                sources: updatedRun.sources as any[] || []
              }]);
            }
          } else if (payload.new.status === "cancelled") {
            setIsRunning(false);
          } else if (payload.new.status === "error") {
            setIsRunning(false);
            toast.error("Agent xatoga uchradi");
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

  // Retry extraction handler
  const handleRetryExtraction = async () => {
    if (!user) return;
    setIsRetryingExtraction(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      const failedFiles = files.filter(f => f.extraction_status === "failed");
      
      for (const file of failedFiles) {
        // Update local status
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, extraction_status: "pending" } : f
        ));
        
        // Trigger re-extraction
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-extract-file`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.session?.access_token}`,
            },
            body: JSON.stringify({
              fileId: file.id,
              storagePath: file.storage_path,
              mimeType: file.mime_type,
            }),
          }
        );
      }
      
      toast.success("Qayta o'qish boshlandi");
    } catch (error) {
      console.error("Retry extraction error:", error);
      toast.error("Xatolik yuz berdi");
    } finally {
      setIsRetryingExtraction(false);
    }
  };

  // Remove files from run handler
  const handleRemoveFilesFromRun = () => {
    setRunWithoutFiles(true);
    toast.info("Agent faylsiz ishga tushiriladi");
  };

  const handleRun = async () => {
    if (!goal.trim() || !user) return;
    if (!canRunAgent) return;

    const currentGoal = goal.trim();
    setIsRunning(true);
    setSteps([]);
    setGeneratedImages([]); // Clear previous images
    
    // Add user turn to conversation history
    setConversationHistory(prev => [...prev, { role: "user", content: currentGoal, goal: currentGoal }]);

    try {
      // Get file contents (only if not running without files)
      let fileContents: Array<{ filename: string; text: string | null }> = [];
      let filesPayload: Array<{ filename: string; textLength: number }> = [];
      
      if (!runWithoutFiles && files.length > 0) {
        const results = await Promise.all(
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
        
        fileContents = results.filter(Boolean) as Array<{ filename: string; text: string | null }>;
        filesPayload = fileContents.map(f => ({
          filename: f.filename,
          textLength: f.text?.length || 0
        }));
      }
      
      // Capture context snapshot for debug panel
      const totalChars = fileContents.reduce((sum, f) => sum + (f.text?.length || 0), 0);
      setContextSnapshot({
        goal: currentGoal,
        filesIncluded: fileContents.length,
        totalChars,
        filesPayload
      });

      const validFiles = fileContents;

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
            goal: currentGoal,
            constraints,
            files: validFiles,
            links,
            notes,
            useWebSearch,
            conversationHistory, // Send conversation history to backend
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Agent run failed");
      }

      // Load the initial run - Realtime will handle updates
      const { data: run } = await supabase
        .from("agent_runs")
        .select("*")
        .eq("id", result.runId)
        .single();

      if (run) {
        setCurrentRun(run as unknown as AgentRun);
      }
      
      // Don't show success toast here - Realtime will notify when done
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

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToFiles = async () => {
    if (!currentRun?.final_output || !user || isSaving) return;

    setIsSaving(true);
    try {
      // Create markdown content
      const timestamp = new Date().toISOString();
      const dateStr = new Date().toLocaleDateString("uz-UZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).replace(/\//g, "-");
      
      const mdContent = `# ${currentRun.goal}\n\n*Yaratilgan: ${new Date().toLocaleString("uz-UZ")}*\n\n---\n\n${currentRun.final_output}`;
      
      // Convert to blob
      const blob = new Blob([mdContent], { type: "text/markdown" });
      const fileName = `agent-${dateStr}-${currentRun.id.slice(0, 8)}.md`;
      const storagePath = `${user.id}/agent-results/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(storagePath, blob, { upsert: true });

      if (uploadError) throw uploadError;

      // Create file record
      const { error: dbError } = await supabase
        .from("user_files")
        .insert({
          user_id: user.id,
          path: storagePath,
          bucket: "user-files",
          title: currentRun.goal.slice(0, 100),
          tool: "agent",
          mime_type: "text/markdown",
          size_bytes: blob.size,
          status: "success",
          source: "agent",
          meta: {
            run_id: currentRun.id,
            goal: currentRun.goal,
            steps_count: steps.length,
            images_count: generatedImages.length,
          },
        });

      if (dbError) throw dbError;

      toast.success("Fayllarimga saqlandi!");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Saqlashda xato yuz berdi");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadImage = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agent-image-${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Rasm yuklab olindi!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Yuklab olishda xato");
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
  const runningSteps = steps.filter((s) => s.status === "running").length;
  const totalSteps = steps.length;
  
  // Fallback: If all steps are done and we have final_output, ensure isRunning is false
  useEffect(() => {
    if (isRunning && totalSteps > 0 && completedSteps === totalSteps && runningSteps === 0 && currentRun?.final_output) {
      console.log("[Agent] Fallback: All steps done + final_output exists, stopping running state");
      setIsRunning(false);
    }
  }, [isRunning, totalSteps, completedSteps, runningSteps, currentRun?.final_output]);
  
  // Also check run status directly as fallback
  useEffect(() => {
    if (isRunning && currentRun?.status === "done") {
      console.log("[Agent] Fallback: Run status is done, stopping running state");
      setIsRunning(false);
    }
  }, [isRunning, currentRun?.status]);
  
  // Calculate estimated time remaining
  const [runStartTime, setRunStartTime] = useState<number | null>(null);
  
  useEffect(() => {
    if (isRunning && !runStartTime) {
      setRunStartTime(Date.now());
    } else if (!isRunning) {
      setRunStartTime(null);
    }
  }, [isRunning]);
  
  const getEstimatedTimeRemaining = () => {
    if (!runStartTime || totalSteps === 0 || completedSteps === 0) {
      // Default estimate: ~5 seconds per step
      const remainingSteps = totalSteps - completedSteps;
      if (remainingSteps > 0) {
        const seconds = remainingSteps * 5;
        return seconds >= 60 ? `~${Math.ceil(seconds / 60)} daqiqa` : `~${seconds} soniya`;
      }
      return null;
    }
    
    const elapsedMs = Date.now() - runStartTime;
    const msPerStep = elapsedMs / completedSteps;
    const remainingSteps = totalSteps - completedSteps;
    const remainingMs = remainingSteps * msPerStep;
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    
    if (remainingSeconds <= 0) return null;
    if (remainingSeconds >= 60) {
      return `~${Math.ceil(remainingSeconds / 60)} daqiqa`;
    }
    return `~${remainingSeconds} soniya`;
  };
  
  const estimatedTime = isRunning ? getEstimatedTimeRemaining() : null;

  const handleExportPDF = async () => {
    if (!currentRun?.final_output) return;
    
    try {
      toast.loading("PDF tayyorlanmoqda...");
      
      await downloadPDF({
        title: currentRun.goal.slice(0, 60),
        content: currentRun.final_output,
        date: new Date(currentRun.created_at).toLocaleDateString("uz-UZ", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        filename: `agent-${new Date().toISOString().split('T')[0]}.pdf`,
      });
      
      toast.dismiss();
      toast.success("PDF yuklab olindi!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.dismiss();
      toast.error("PDF yaratishda xato");
    }
  };


  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">
            {t("agent.title") || "Agent"}
          </h1>
          <p className="text-[10px] text-muted-foreground">
            AI ko'p bosqichli vazifalarni rejalashtiradi
          </p>
        </div>
        <Button 
          variant={showHistory ? "secondary" : "outline"} 
          size="sm" 
          onClick={() => setShowHistory(!showHistory)}
          className="gap-1.5 h-8 text-xs"
        >
          <History className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Tarix</span>
        </Button>
      </div>

      {/* History Panel */}
      {showHistory && (
        <Card className="border-primary/20">
          <CardHeader className="py-2 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Oldingi ishlar
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowHistory(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 max-h-[240px] overflow-auto">
            {loadingHistory ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : pastRuns.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Hali hech qanday ish bajarilmagan</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {pastRuns.map((run) => (
                  <div
                    key={run.id}
                    className={cn(
                      "flex items-start gap-2 p-2 rounded-lg transition-colors hover:bg-muted/50",
                      currentRun?.id === run.id && "bg-primary/5 border border-primary/20"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-2">{run.goal}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={run.status === "done" ? "secondary" : run.status === "error" ? "destructive" : "outline"} 
                          className="text-[9px] h-4"
                        >
                          {run.status === "done" ? "Tayyor" : run.status === "error" ? "Xato" : run.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(run.created_at).toLocaleDateString("uz-UZ", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleViewPastRun(run)}
                        title="Ko'rish"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleRerun(run)}
                        title="Qayta ishga tushirish"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteRun(run.id)}
                        title="O'chirish"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* File Gating Warning */}
      {files.length > 0 && !runWithoutFiles && (
        <AgentFileGating
          fileReadiness={fileReadiness}
          onRetryExtraction={handleRetryExtraction}
          onRemoveFilesFromRun={handleRemoveFilesFromRun}
          isRetrying={isRetryingExtraction}
        />
      )}

      {/* Debug Panel (visible when ?debug=1 or for dev users) */}
      <AgentDebugPanel
        fileReadiness={fileReadiness}
        contextSnapshot={contextSnapshot}
      />

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
            <TabsContent value="results" className="mt-0 space-y-4">
              {/* Conversation History */}
              {conversationHistory.length > 0 && (
                <div className="space-y-3">
                  {conversationHistory.map((turn, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "rounded-lg p-3 text-sm",
                        turn.role === "user" 
                          ? "bg-primary/10 border border-primary/20 ml-8" 
                          : "bg-muted/50 border border-border/50 mr-4"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {turn.role === "user" ? (
                          <>
                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-[10px] font-medium">Siz</span>
                            </div>
                            <span className="text-xs font-medium text-primary">Savol</span>
                          </>
                        ) : (
                          <>
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Bot className="h-3 w-3 text-primary-foreground" />
                            </div>
                            <span className="text-xs font-medium">Bahor AI</span>
                            {turn.sources && (turn.sources as any[]).length > 0 && (
                              <Badge variant="outline" className="text-[9px] h-4">
                                {(turn.sources as any[]).length} manba
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                      {turn.role === "user" ? (
                        <p className="text-sm">{turn.goal || turn.content}</p>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <AiResponseRenderer content={turn.content} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Generated Images Gallery */}
              {generatedImages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Yaratilgan rasmlar</span>
                    <Badge variant="secondary" className="text-[10px]">{generatedImages.length}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {generatedImages.map((img, i) => (
                      <div 
                        key={i} 
                        className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
                      >
                        <img
                          src={img.url}
                          alt={`Generated image ${i + 1}`}
                          className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                          onClick={() => setLightboxImage(img.url)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-0 left-0 right-0 p-2 flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] text-white truncate flex-1 pr-2">
                            {img.stepTitle.slice(0, 30)}...
                          </span>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage(img.url);
                              }}
                            >
                              <ZoomIn className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadImage(img.url, i);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

                {/* Evidence Warning - No Files */}
                {runWithoutFiles && files.length === 0 && (
                  <AgentEvidenceWarning type="no-files" />
                )}

                {/* Final Output - Research Paper Style */}
                {currentRun?.final_output ? (
                <div className="space-y-4">
                  {/* Header with actions */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1 text-[10px] bg-green-500/10 text-green-600">
                        <Check className="h-2.5 w-2.5" />
                        Tayyor
                      </Badge>
                      {currentRun.sources && (currentRun.sources as any[]).length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {(currentRun.sources as any[]).length} manba
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <Button variant="outline" size="sm" onClick={handleCopyResult} className="gap-1 h-7 text-xs">
                        <Copy className="h-3 w-3" />
                        Nusxa
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1 h-7 text-xs">
                        <FileDown className="h-3 w-3" />
                        PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSaveToFiles} 
                        disabled={isSaving}
                        className="gap-1 h-7 text-xs"
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        {isSaving ? "Saqlanmoqda..." : "Saqlash"}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Research Paper Content */}
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm bg-muted/30 rounded-lg p-4 border border-border/50">
                    <AiResponseRenderer content={currentRun.final_output} />
                  </div>
                  
                  {/* Sources Section */}
                  {currentRun.sources && (currentRun.sources as any[]).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <ExternalLink className="h-3 w-3" />
                        Manbalar
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {(currentRun.sources as any[]).slice(0, 8).map((source, i) => (
                          <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-full bg-muted hover:bg-muted/80 transition-colors truncate max-w-[200px]"
                          >
                            <span className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-medium shrink-0">
                              {i + 1}
                            </span>
                            <span className="truncate">{source.title || new URL(source.url).hostname}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Follow-up Section */}
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Input
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="Qo'shimcha savol yoki yangi vazifa..."
                        className="flex-1 h-9 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && goal.trim()) {
                            handleRun();
                          }
                        }}
                      />
                      <Button 
                        onClick={handleRun} 
                        disabled={!goal.trim() || isRunning}
                        className="gap-1.5 h-9 text-sm shrink-0"
                      >
                        {isRunning ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        Davom etish
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Qo'shimcha savol bering yoki yangi vazifa kiriting
                    </p>
                  </div>
                </div>
              ) : generatedImages.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Natijalar bu yerda ko'rsatiladi</p>
                </div>
              ) : null}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Run Button - hidden when we have results (follow-up is in the results area) */}
      {!currentRun?.final_output && (
        <div className="flex items-center gap-2 pt-1">
          {isRunning ? (
            <>
              <Button variant="destructive" onClick={handleCancel} className="gap-1.5 flex-1 sm:flex-none h-9 text-sm">
                <Square className="h-3.5 w-3.5" />
                To'xtatish
              </Button>
              {totalSteps > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{completedSteps}/{totalSteps} qadam</span>
                  {estimatedTime && (
                    <span className="text-primary/70">• {estimatedTime} qoldi</span>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <Button 
                onClick={handleRun} 
                disabled={!canRunAgent}
                title={runGatingMessage || undefined}
                className="gap-1.5 flex-1 sm:flex-none h-9 text-sm"
              >
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
      )}
      
      {/* New Task Button - shown when we have results */}
      {currentRun?.final_output && !isRunning && (
        <div className="flex items-center gap-2 pt-1">
          <Button 
            variant="outline" 
            onClick={() => {
              setGoal("");
              setCurrentRun(null);
              setSteps([]);
              setGeneratedImages([]);
              setFiles([]);
              setLinks([]);
              setNotes("");
              setConversationHistory([]); // Clear conversation history for new task
            }}
            className="gap-1.5 h-9 text-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Yangi vazifa
          </Button>
        </div>
      )}

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
            {/* Progress bar and time estimate */}
            {isRunning && totalSteps > 0 && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{Math.round((completedSteps / totalSteps) * 100)}% bajarildi</span>
                  {estimatedTime && <span>{estimatedTime} qoldi</span>}
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                  />
                </div>
              </div>
            )}
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

      {/* Image Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          {lightboxImage && (
            <div className="relative">
              <img
                src={lightboxImage}
                alt="Full size"
                className="w-full h-auto max-h-[85vh] object-contain"
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    const idx = generatedImages.findIndex(img => img.url === lightboxImage);
                    handleDownloadImage(lightboxImage, idx >= 0 ? idx : 0);
                  }}
                >
                  <Download className="h-4 w-4" />
                  Yuklab olish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
