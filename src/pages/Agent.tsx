import { useState, useEffect, useCallback, useMemo } from "react";
import { SEO } from "@/components/SEO";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  
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
  
  // Sync files state with extraction status from hook
  useEffect(() => {
    if (fileReadiness.fileStatuses.length === 0) return;
    
    setFiles(prevFiles => {
      let hasChanges = false;
      const updated = prevFiles.map(f => {
        const hookStatus = fileReadiness.fileStatuses.find(s => s.id === f.id);
        if (hookStatus) {
          const newExtractionStatus = hookStatus.status === "ready" ? "ready" : 
                                       hookStatus.status === "processing" ? "extracting" : 
                                       hookStatus.status === "failed" ? "failed" : f.extraction_status;
          if (f.extraction_status !== newExtractionStatus) {
            hasChanges = true;
            return { ...f, extraction_status: newExtractionStatus };
          }
        }
        return f;
      });
      return hasChanges ? updated : prevFiles;
    });
  }, [fileReadiness.fileStatuses]);
  
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
    // Navigate to the Agent Workspace for this run
    navigate(`/agent/workspace/${run.id}`);
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
            
            // Navigate to workspace
            navigate(`/agent/workspace/${updatedRun.id}`);
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
  }, [currentRun?.id, navigate]);

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
        console.log("[Agent] Files in state:", files.map(f => ({ id: f.id, status: f.extraction_status })));
        
        const readyFiles = files.filter((f) => f.extraction_status === "ready");
        console.log("[Agent] Ready files count:", readyFiles.length);
        
        const results = await Promise.all(
          readyFiles.map(async (f) => {
              const { data, error } = await supabase
                .from("agent_files")
                .select("extracted_text, filename")
                .eq("id", f.id)
                .single();
              
              console.log(`[Agent] File ${f.id}: fetched ${data?.extracted_text?.length || 0} chars, error: ${error?.message || 'none'}`);
              return data ? { filename: data.filename, text: data.extracted_text } : null;
            })
        );
        
        fileContents = results.filter(Boolean) as Array<{ filename: string; text: string | null }>;
        filesPayload = fileContents.map(f => ({
          filename: f.filename,
          textLength: f.text?.length || 0
        }));
        
        console.log("[Agent] Sending files to backend:", filesPayload);
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
    <>
      <SEO 
        title="Agent" 
        description="Bahor AI Agent - murakkab vazifalarni AI yordamida bajaring. Ko'p bosqichli rejalashtirish."
        url="/agent"
      />
      <div className="flex flex-col h-full bg-background">
      {/* Modern Header */}
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight">
              {t("agent.title") || "Agent"}
            </h1>
            <p className="text-xs text-muted-foreground">
              AI ko'p bosqichli vazifalarni rejalashtiradi
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowHistory(!showHistory)}
          className={cn(
            "gap-2 h-9 rounded-lg transition-colors",
            showHistory && "bg-primary/10 text-primary"
          )}
        >
          <History className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">Tarix</span>
        </Button>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="border-b border-border/50 bg-muted/30">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Oldingi ishlar
              </h3>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowHistory(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {loadingHistory ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : pastRuns.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Hali ish bajarilmagan</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-auto">
                {pastRuns.slice(0, 5).map((run) => (
                  <div
                    key={run.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer",
                      "bg-background/60 hover:bg-background border border-border/50 hover:border-primary/30",
                      currentRun?.id === run.id && "border-primary/50 bg-primary/5"
                    )}
                    onClick={() => handleViewPastRun(run)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{run.goal}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] h-5 rounded-md",
                            run.status === "done" && "bg-green-500/10 text-green-600 border-green-500/30",
                            run.status === "error" && "bg-destructive/10 text-destructive border-destructive/30"
                          )}
                        >
                          {run.status === "done" ? "✓ Tayyor" : run.status === "error" ? "Xato" : run.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(run.created_at).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={(e) => { e.stopPropagation(); handleRerun(run); }}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteRun(run.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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

      {/* Debug Panel */}
      <AgentDebugPanel
        fileReadiness={fileReadiness}
        contextSnapshot={contextSnapshot}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Goal Input - Modern Glass Style */}
          <div className="space-y-4">
            <div className="relative">
              <Textarea
                placeholder="Maqsadingizni yozing... Masalan: 'Yangi mobil ilova uchun marketing strategiyasini tuzing'"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className={cn(
                  "min-h-[120px] sm:min-h-[140px] resize-none text-base sm:text-lg p-4 sm:p-5",
                  "bg-card/50 border-border/50 rounded-2xl",
                  "placeholder:text-muted-foreground/60",
                  "focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
                  "transition-all duration-200"
                )}
                disabled={isRunning}
              />
              {goal.length > 0 && (
                <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground">
                  {goal.length} belgi
                </div>
              )}
            </div>
            
            {/* Sample Goals - Modern Chips */}
            <div className="flex flex-wrap gap-2">
              {SAMPLE_GOALS.map((sample, i) => (
                <button
                  key={i}
                  onClick={() => setGoal(sample)}
                  className={cn(
                    "text-xs sm:text-sm px-3 py-2 rounded-xl",
                    "bg-muted/50 hover:bg-muted border border-transparent hover:border-border/50",
                    "text-muted-foreground hover:text-foreground",
                    "transition-all duration-200",
                    "disabled:opacity-50"
                  )}
                  disabled={isRunning}
                >
                  {sample.slice(0, 40)}...
                </button>
              ))}
            </div>

            {/* Expandable Settings */}
            <Collapsible open={showConstraints} onOpenChange={setShowConstraints}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground h-9 rounded-xl">
                  <Settings2 className="h-4 w-4" />
                  Qo'shimcha sozlamalar
                  {showConstraints ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Ohang</label>
                    <Input
                      placeholder="Rasmiy, do'stona..."
                      value={constraints.tone}
                      onChange={(e) => setConstraints((c) => ({ ...c, tone: e.target.value }))}
                      className="h-9 text-sm rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Hajmi</label>
                    <Input
                      placeholder="Qisqa, batafsil..."
                      value={constraints.length}
                      onChange={(e) => setConstraints((c) => ({ ...c, length: e.target.value }))}
                      className="h-9 text-sm rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Auditoriya</label>
                    <Input
                      placeholder="Talabalar, biznesmenlar..."
                      value={constraints.audience}
                      onChange={(e) => setConstraints((c) => ({ ...c, audience: e.target.value }))}
                      className="h-9 text-sm rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Til</label>
                    <Input
                      placeholder="O'zbekcha, English..."
                      value={constraints.language}
                      onChange={(e) => setConstraints((c) => ({ ...c, language: e.target.value }))}
                      className="h-9 text-sm rounded-lg"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Workspace Inputs - Modern Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-full h-12 p-1 bg-muted/50 rounded-xl grid grid-cols-4">
              <TabsTrigger value="files" className="rounded-lg gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <File className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Fayllar</span>
                {files.length > 0 && (
                  <Badge variant="secondary" className="h-5 w-5 p-0 text-[10px] justify-center rounded-full">{files.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="links" className="rounded-lg gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Link2 className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Havolalar</span>
                {links.length > 0 && (
                  <Badge variant="secondary" className="h-5 w-5 p-0 text-[10px] justify-center rounded-full">{links.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="notes" className="rounded-lg gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <StickyNote className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Eslatmalar</span>
              </TabsTrigger>
              <TabsTrigger value="results" className="rounded-lg gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Natijalar</span>
              </TabsTrigger>
            </TabsList>

            {/* Files Tab */}
            <TabsContent value="files" className="mt-0 space-y-3">
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
                  "border-border/50 hover:border-primary/50 hover:bg-primary/5"
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
                onClick={() => document.getElementById("agent-file-input")?.click()}
              >
                <div className="h-12 w-12 mx-auto mb-3 rounded-xl bg-muted/50 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Fayllarni shu yerga tashlang yoki <span className="text-primary font-medium">tanlang</span>
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  PDF, DOCX, TXT, rasmlar • max 10MB
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
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50"
                    >
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <File className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.size_bytes ? `${(file.size_bytes / 1024).toFixed(1)} KB` : ""}
                        </p>
                      </div>
                      {getFileStatusBadge(file.extraction_status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveFile(file.id, file.storage_path)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Links Tab */}
            <TabsContent value="links" className="mt-0 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
                  className="flex-1 h-10 text-sm rounded-xl"
                />
                <Button onClick={handleAddLink} size="sm" className="h-10 px-4 rounded-xl">
                  Qo'shish
                </Button>
              </div>
              {links.length > 0 && (
                <div className="space-y-2">
                  {links.map((link, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Link2 className="h-4 w-4 text-blue-500" />
                      </div>
                      <span className="text-sm truncate flex-1">{link}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg"
                        onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="h-3.5 w-3.5" />
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
                className="min-h-[120px] resize-none text-sm rounded-xl"
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
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Natijalar bu yerda ko'rsatiladi</p>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Sticky Run Button */}
      <div className="border-t border-border/50 bg-background/95 backdrop-blur p-4 sm:p-5">
        <div className="max-w-2xl mx-auto">
          {!currentRun?.final_output ? (
            <div className="flex items-center gap-3">
              {isRunning ? (
                <>
                  <Button variant="destructive" onClick={handleCancel} className="gap-2 h-11 px-5 rounded-xl flex-1 sm:flex-none">
                    <Square className="h-4 w-4" />
                    To'xtatish
                  </Button>
                  {totalSteps > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>{completedSteps}/{totalSteps}</span>
                      {estimatedTime && <span className="text-primary">• {estimatedTime}</span>}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleRun} 
                    disabled={!canRunAgent}
                    title={runGatingMessage || undefined}
                    className="gap-2 h-11 px-6 rounded-xl flex-1 sm:flex-none text-base font-medium"
                  >
                    <Play className="h-4 w-4" />
                    Ishga tushirish
                  </Button>
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useWebSearch}
                      onChange={(e) => setUseWebSearch(e.target.checked)}
                      className="rounded border-border h-4 w-4 accent-primary"
                    />
                    <span className="text-muted-foreground">Web qidiruv</span>
                  </label>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
      
      {/* Modern Floating Steps Progress */}
      {(isRunning || steps.length > 0) && (
        <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-40 pointer-events-auto">
          <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-medium">
                  {isRunning && steps.length === 0 ? "Reja tuzilmoqda..." : "Bajarilmoqda"}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] h-5 rounded-md bg-background/50">
                {completedSteps}/{totalSteps || "..."}
              </Badge>
            </div>

            {/* Progress Bar */}
            {totalSteps > 0 && (
              <div className="px-4 py-2 border-b border-border/20">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                  <span>{totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0}%</span>
                  {estimatedTime && <span className="text-primary">{estimatedTime}</span>}
                </div>
              </div>
            )}

            {/* Steps List */}
            <div className="max-h-[200px] overflow-auto">
              {steps.length === 0 ? (
                <div className="px-4 py-3 space-y-2">
                  <Skeleton className="h-5 w-full rounded-lg" />
                  <Skeleton className="h-5 w-4/5 rounded-lg" />
                  <Skeleton className="h-5 w-3/5 rounded-lg" />
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 transition-colors",
                        step.status === "running" && "bg-primary/5",
                        step.status === "done" && "opacity-60"
                      )}
                    >
                      <div className="shrink-0">
                        {step.status === "done" ? (
                          <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center">
                            <Check className="h-3 w-3 text-green-500" />
                          </div>
                        ) : step.status === "running" ? (
                          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          </div>
                        ) : step.status === "error" ? (
                          <div className="h-5 w-5 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertCircle className="h-3 w-3 text-destructive" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/20" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs font-medium truncate",
                          step.status === "running" && "text-primary"
                        )}>
                          {step.title}
                        </p>
                        {step.tool_name && step.status === "running" && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {step.tool_name === "web_search" ? "Web qidirilmoqda..." : 
                             step.tool_name === "generate_image" ? "Rasm yaratilmoqda..." : 
                             "Bajarilmoqda..."}
                          </p>
                        )}
                      </div>
                      {step.status === "done" && step.tool_name === "web_search" && step.tool_output?.sources && (
                        <Badge variant="outline" className="text-[9px] h-4 shrink-0">
                          {(step.tool_output.sources as any[]).length}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modern Sources Strip */}
      {currentRun?.sources && (currentRun.sources as any[]).length > 0 && !isRunning && (
        <div className="fixed bottom-24 left-4 right-4 sm:left-6 sm:right-auto sm:w-auto sm:max-w-md z-30">
          <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl p-3 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">Manbalar</span>
              <Badge variant="secondary" className="text-[9px] h-4 ml-auto">
                {(currentRun.sources as any[]).length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(currentRun.sources as any[]).slice(0, 6).map((source: any, i: number) => (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted/50 hover:bg-muted rounded-lg text-[10px] transition-colors max-w-[140px]"
                >
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=16`}
                    alt=""
                    className="h-3 w-3 rounded-sm shrink-0"
                  />
                  <span className="truncate">{source.title || new URL(source.url).hostname}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-transparent border-none">
          {lightboxImage && (
            <div className="relative">
              <img
                src={lightboxImage}
                alt="Full size"
                className="w-full h-auto rounded-lg"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1"
                  onClick={() => {
                    const idx = generatedImages.findIndex(img => img.url === lightboxImage);
                    if (idx >= 0) handleDownloadImage(lightboxImage, idx);
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Yuklash
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
