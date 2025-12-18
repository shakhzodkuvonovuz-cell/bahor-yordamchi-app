import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppShellV2 } from "@/components/layout/AppShellV2";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Download, 
  Send, 
  RefreshCw, 
  X, 
  Shuffle, 
  Upload, 
  Video as VideoIcon, 
  Clock, 
  Loader2,
  ChevronRight,
  Trash2,
  Settings2,
  History,
  ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// Video generation presets
const PRESETS = [
  { id: "cinematic", label: "Kinematografik", params: { guidance_scale: 8, steps: 40, motion_strength: 0.8 } },
  { id: "anime", label: "Anime", params: { guidance_scale: 7, steps: 35, motion_strength: 0.7 } },
  { id: "realistic", label: "Realistik", params: { guidance_scale: 7.5, steps: 30, motion_strength: 0.6 } },
  { id: "retro", label: "Retro film", params: { guidance_scale: 6.5, steps: 25, motion_strength: 0.5 } },
  { id: "samarkand", label: "Samarqand uslubi", params: { guidance_scale: 7, steps: 35, motion_strength: 0.7 } },
  { id: "custom", label: "Maxsus", params: {} },
];

const ASPECT_RATIOS = [
  { id: "16:9", label: "16:9 (Keng)", width: 768, height: 448 },
  { id: "9:16", label: "9:16 (Vertikal)", width: 448, height: 768 },
  { id: "1:1", label: "1:1 (Kvadrat)", width: 512, height: 512 },
  { id: "4:3", label: "4:3", width: 640, height: 480 },
  { id: "custom", label: "Maxsus", width: 768, height: 512 },
];

const QUALITY_TIERS = [
  { id: "fast", label: "Tez", steps: 15 },
  { id: "balanced", label: "Muvozanat", steps: 25 },
  { id: "high", label: "Yuqori sifat", steps: 30 },
];

// Allowed FPS values (must match server)
const ALLOWED_FPS = [8, 12, 24, 30];
const MAX_DURATION_SECONDS = 8;
const MAX_STEPS = 30;

interface VideoGeneration {
  id: string;
  created_at: string;
  status: string;
  prompt: string;
  negative_prompt?: string;
  params: Record<string, any>;
  progress?: number;
  error?: string;
  output_video_path?: string;
  output_video_url?: string;
  duration_seconds?: number;
  fps?: number;
  width?: number;
  height?: number;
  seed?: number;
  url_expires_at?: number; // timestamp when URL expires
}

// Status display configs
const STATUS_CONFIG: Record<string, { label: string; labelEn: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  idle: { label: "Tayyor", labelEn: "Idle", variant: "outline" },
  queued: { label: "Navbatda", labelEn: "Queued", variant: "secondary" },
  running: { label: "Ishlamoqda", labelEn: "Running", variant: "default" },
  processing: { label: "Qayta ishlanmoqda", labelEn: "Processing", variant: "default" },
  uploading: { label: "Yuklanmoqda", labelEn: "Uploading", variant: "default" },
  completed: { label: "Tayyor", labelEn: "Completed", variant: "outline" },
  failed: { label: "Xatolik", labelEn: "Failed", variant: "destructive" },
  canceled: { label: "Bekor qilindi", labelEn: "Canceled", variant: "secondary" },
};

export default function VideoStudio() {
  const { t } = useTranslation();
  const { user, session } = useAuth();
  const { toast } = useToast();
  
  // Form state
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [preset, setPreset] = useState("cinematic");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [qualityTier, setQualityTier] = useState("balanced");
  const [durationSeconds, setDurationSeconds] = useState(5);
  const [fps, setFps] = useState(24);
  const [seed, setSeed] = useState<number | null>(null);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [steps, setSteps] = useState(30);
  const [motionStrength, setMotionStrength] = useState(0.7);
  const [customWidth, setCustomWidth] = useState(768);
  const [customHeight, setCustomHeight] = useState(512);
  const [generateAudio, setGenerateAudio] = useState(false);
  const [outputFormat, setOutputFormat] = useState("mp4");
  
  // Reference uploads
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceVideo, setReferenceVideo] = useState<File | null>(null);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<VideoGeneration | null>(null);
  const [history, setHistory] = useState<VideoGeneration[]>([]);
  const [dailyUsed, setDailyUsed] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5);
  const [isFreeUser, setIsFreeUser] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Polling & timers
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load history on mount
  useEffect(() => {
    if (user) {
      loadHistory();
      loadDailyUsage();
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, [user]);

  // Cooldown timer function
  const startCooldownTimer = useCallback((seconds: number) => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }
    setCooldownRemaining(seconds);
    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Apply preset when changed
  useEffect(() => {
    const presetData = PRESETS.find(p => p.id === preset);
    if (presetData && preset !== "custom") {
      if (presetData.params.guidance_scale) setGuidanceScale(presetData.params.guidance_scale);
      if (presetData.params.steps) setSteps(presetData.params.steps);
      if (presetData.params.motion_strength) setMotionStrength(presetData.params.motion_strength);
    }
  }, [preset]);

  // Apply quality tier when changed
  useEffect(() => {
    const tier = QUALITY_TIERS.find(q => q.id === qualityTier);
    if (tier && preset !== "custom") {
      setSteps(tier.steps);
    }
  }, [qualityTier]);

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from("video_generations")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      // Type cast the data since Supabase types might not be updated yet
      setHistory(data as unknown as VideoGeneration[]);
    }
  };

  const loadDailyUsage = async () => {
    // Use explicit UTC boundaries for consistent counting
    const now = new Date();
    const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const endOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    
    const { count } = await supabase
      .from("video_generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .gte("created_at", startOfDayUTC.toISOString())
      .lt("created_at", endOfDayUTC.toISOString());
    
    setDailyUsed(count ?? 0);
    
    // Check user plan
    try {
      const { data, error } = await supabase.functions.invoke("admin-entitlements", {
        method: "GET",
      });
      
      if (!error && data) {
        const userIsPremium = data.plan === "beta_premium" || data.plan === "premium" || data.isDevBypass;
        setIsPremium(userIsPremium);
        setIsFreeUser(!userIsPremium && !data.isDevBypass);
        setDailyLimit(data.isDevBypass ? -1 : (userIsPremium ? 5 : 0));
      } else {
        // Default to free user if we can't check
        setIsFreeUser(true);
        setDailyLimit(0);
      }
    } catch (error) {
      console.warn("Entitlement check failed:", error);
      setIsFreeUser(true);
      setDailyLimit(0);
    }
  };

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 2147483647));
  };

  const getResolution = () => {
    if (aspectRatio === "custom") {
      return { width: customWidth, height: customHeight };
    }
    const ar = ASPECT_RATIOS.find(a => a.id === aspectRatio);
    return ar ? { width: ar.width, height: ar.height } : { width: 768, height: 512 };
  };

  const startGeneration = async () => {
    if (!prompt.trim()) {
      toast({ title: "Prompt kiriting", variant: "destructive" });
      return;
    }

    if (!session?.access_token) {
      toast({ title: "Iltimos, tizimga kiring", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    const resolution = getResolution();

    try {
      const response = await supabase.functions.invoke("runpod-video", {
        body: {
          action: "start",
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || null,
          params: {
            width: resolution.width,
            height: resolution.height,
            fps: ALLOWED_FPS.includes(fps) ? fps : 24,
            duration_seconds: Math.min(durationSeconds, MAX_DURATION_SECONDS),
            seed: seed ?? Math.floor(Math.random() * 2147483647),
            guidance_scale: Math.min(guidanceScale, 8),
            steps: Math.min(steps, MAX_STEPS),
            motion_strength: Math.max(0, Math.min(1, motionStrength)),
            generate_audio: generateAudio,
            output_format: outputFormat,
            preset,
            quality_tier: qualityTier,
          },
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Video yaratishda xatolik");
      }

      const data = response.data;
      if (!data.ok) {
        // Handle specific error codes
        if (data.error === "VIDEO_NOT_AVAILABLE_FREE") {
          toast({ 
            title: t("videoStudio.freeBlocked.title"),
            description: t("videoStudio.freeBlocked.description"),
            variant: "destructive" 
          });
          setIsFreeUser(true);
        } else if (data.error === "VIDEO_COOLDOWN") {
          // Start cooldown timer
          const retryAfter = data.retryAfterSec || 90;
          setCooldownRemaining(retryAfter);
          startCooldownTimer(retryAfter);
          toast({ 
            title: "Kutish kerak", 
            description: data.messageUz || `Keyingi video yaratish uchun ${retryAfter} soniya kuting.`,
            variant: "default" 
          });
        } else if (data.error === "VIDEO_BUSY_TRY_LATER") {
          toast({ 
            title: "Tizim band", 
            description: data.messageUz || "Hozir video yaratish band. Bir necha daqiqadan keyin urinib ko'ring.",
            variant: "destructive" 
          });
        } else if (data.error === "VIDEO_PARAMS_INVALID" || data.error === "VIDEO_PARAMS_TOO_HIGH") {
          toast({ 
            title: "Noto'g'ri parametrlar", 
            description: data.messageUz || "Parametrlar noto'g'ri yoki juda yuqori.",
            variant: "destructive" 
          });
        } else if (data.error === "VIDEO_DAILY_LIMIT") {
          toast({ 
            title: "Limit tugadi", 
            description: data.messageUz || `Bugungi video limiti tugadi (${data.used}/${data.limit}).`,
            variant: "destructive" 
          });
        } else {
          throw new Error(data.messageUz || data.error || "Video yaratishda xatolik");
        }
        setIsGenerating(false);
        return;
      }

      // Start polling
      setCurrentGeneration({
        id: data.generationId,
        created_at: new Date().toISOString(),
        status: "running",
        prompt: prompt.trim(),
        negative_prompt: negativePrompt.trim() || undefined,
        params: {},
        progress: 0,
      });

      startPolling(data.generationId);
      setDailyUsed(prev => prev + 1);

    } catch (error: any) {
      console.error("Generation error:", error);
      toast({ 
        title: "Xatolik", 
        description: error.message || "Video yaratishda xatolik",
        variant: "destructive" 
      });
      setIsGenerating(false);
    }
  };

  const startPolling = (generationId: string) => {
    pollCountRef.current = 0;
    
    const poll = async () => {
      pollCountRef.current++;
      
      try {
        const response = await supabase.functions.invoke("runpod-video", {
          body: { action: "status", generationId },
        });

        if (response.error) {
          console.error("Poll error:", response.error);
          return;
        }

        const data = response.data;
        
        // Handle error responses (including ECHO_ENDPOINT)
        if (!data.ok) {
          console.error("Poll failed:", data.error, data.errorCode);
          
          // Stop polling on error
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsGenerating(false);
          
          // Update UI with error state
          setCurrentGeneration(prev => prev ? {
            ...prev,
            status: "failed",
            error: data.messageUz || data.error || "Noma'lum xatolik",
          } : null);
          
          // Show specific toast for echo endpoint
          if (data.errorCode === "ECHO_ENDPOINT") {
            toast({ 
              title: "RunPod konfiguratsiya xatosi", 
              description: "RunPod endpoint test/echo rejimida. LTX Video worker o'rnatilishi kerak.",
              variant: "destructive",
              duration: 10000,
            });
          } else {
            toast({ 
              title: "Xatolik", 
              description: data.error || "Video yaratishda xatolik", 
              variant: "destructive" 
            });
          }
          
          loadHistory();
          return;
        }

        setCurrentGeneration(prev => prev ? {
          ...prev,
          status: data.status,
          progress: data.progress || prev.progress,
          error: data.error,
          output_video_path: data.outputVideoPath,
          output_video_url: data.outputVideoUrl,
        } : null);

        // Stop polling if completed or failed
        if (["completed", "failed", "canceled"].includes(data.status)) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsGenerating(false);
          loadHistory();
          
          if (data.status === "completed" && data.outputVideoUrl) {
            toast({ title: "Video tayyor!" });
          } else if (data.status === "completed" && !data.outputVideoUrl) {
            // Edge case: completed but no video URL
            setCurrentGeneration(prev => prev ? {
              ...prev,
              status: "failed",
              error: data.error || "Video URL topilmadi",
            } : null);
            toast({ title: "Xatolik", description: data.error || "Video URL topilmadi", variant: "destructive" });
          } else if (data.status === "failed") {
            toast({ title: "Xatolik", description: data.error, variant: "destructive" });
          }
        }

        // Adjust poll interval based on count
        if (pollCountRef.current > 60) {
          // After 2 minutes, poll every 5s
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = setInterval(poll, 5000);
          }
        } else if (pollCountRef.current > 30) {
          // After 1 minute, poll every 3s
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = setInterval(poll, 3000);
          }
        }

      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    // Start with 2s interval
    pollIntervalRef.current = setInterval(poll, 2000);
    poll(); // Immediate first poll
  };

  const cancelGeneration = async () => {
    if (!currentGeneration) return;

    try {
      await supabase.functions.invoke("runpod-video", {
        body: { action: "cancel", generationId: currentGeneration.id },
      });

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      setCurrentGeneration(prev => prev ? { ...prev, status: "canceled" } : null);
      setIsGenerating(false);
      toast({ title: "Video yaratish bekor qilindi" });
    } catch (error) {
      console.error("Cancel error:", error);
    }
  };

  const downloadVideo = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `bahor-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast({ title: "Yuklab olishda xatolik", variant: "destructive" });
    }
  };

  const regenerateWithSameSettings = () => {
    if (currentGeneration) {
      setPrompt(currentGeneration.prompt);
      if (currentGeneration.negative_prompt) {
        setNegativePrompt(currentGeneration.negative_prompt);
      }
      randomizeSeed();
    }
  };

  // Refresh signed URL using server-side sign action
  const refreshVideoUrl = async () => {
    if (!currentGeneration?.output_video_path) return;
    
    try {
      const response = await supabase.functions.invoke("runpod-video", {
        body: { action: "sign", outputVideoPath: currentGeneration.output_video_path },
      });
      
      if (response.data?.ok && response.data.outputVideoUrl) {
        setCurrentGeneration(prev => prev ? { 
          ...prev, 
          output_video_url: response.data.outputVideoUrl,
          url_expires_at: Date.now() + (response.data.expiresIn * 1000),
        } : null);
        toast({ title: "Havola yangilandi" });
      } else {
        toast({ title: "Havolani yangilashda xatolik", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Havolani yangilashda xatolik", variant: "destructive" });
    }
  };

  // Refresh status for stuck/processing jobs
  const refreshStatus = async (generationId?: string) => {
    const targetId = generationId || currentGeneration?.id;
    if (!targetId) return;
    
    setIsRefreshing(true);
    try {
      const response = await supabase.functions.invoke("runpod-video", {
        body: { action: "status", generationId: targetId },
      });

      if (response.error) {
        toast({ title: "Status tekshirishda xatolik", variant: "destructive" });
        return;
      }

      const data = response.data;
      
      if (!data.ok) {
        // Error from RunPod
        setCurrentGeneration(prev => prev ? {
          ...prev,
          status: "failed",
          error: data.messageUz || data.error || "Noma'lum xatolik",
        } : null);
        toast({ title: "Xatolik", description: data.messageUz || data.error, variant: "destructive" });
        loadHistory();
        return;
      }

      // Update current generation with new status
      setCurrentGeneration(prev => prev ? {
        ...prev,
        status: data.status,
        progress: data.progress || prev.progress,
        error: data.error,
        output_video_path: data.outputVideoPath,
        output_video_url: data.outputVideoUrl,
      } : null);

      if (data.status === "completed" && data.outputVideoUrl) {
        toast({ title: "Video tayyor!" });
        setIsGenerating(false);
      } else if (data.status === "completed" && !data.outputVideoUrl) {
        setCurrentGeneration(prev => prev ? {
          ...prev,
          status: "failed",
          error: "Video URL topilmadi",
        } : null);
        toast({ title: "Xatolik", description: "Video URL topilmadi", variant: "destructive" });
      } else if (data.status === "failed") {
        toast({ title: "Xatolik", description: data.error, variant: "destructive" });
        setIsGenerating(false);
      } else if (["queued", "running", "processing"].includes(data.status)) {
        // Still in progress - resume polling
        toast({ title: "Hali ishlamoqda", description: "Polling qayta boshlanmoqda..." });
        startPolling(targetId);
      }
      
      loadHistory();
    } catch (error) {
      console.error("Refresh status error:", error);
      toast({ title: "Status tekshirishda xatolik", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Send video to chat as attachment
  const sendToChat = async () => {
    if (!currentGeneration?.output_video_path || !currentGeneration.output_video_url) {
      toast({ title: "Video topilmadi", variant: "destructive" });
      return;
    }

    try {
      // Import the chatStore to add message
      const { addMessage, createThread } = await import("@/lib/chatStore");
      
      // Create a thread for video sharing
      const thread = await createThread(user!.id, { mode: "general", title: "Video Studio" });
      
      // Add message with video info
      await addMessage(user!.id, {
        threadId: thread.id,
        role: "assistant",
        content: `🎬 Video yaratildi:\n\n**Prompt:** ${currentGeneration.prompt}\n\n📥 [Video yuklab olish](${currentGeneration.output_video_url})`,
      });
      
      toast({ title: "Chatga yuborildi" });
    } catch (error) {
      console.error("Send to chat error:", error);
      toast({ title: "Chatga yuborishda xatolik", variant: "destructive" });
    }
  };

  const selectHistoryItem = async (item: VideoGeneration) => {
    // Get signed URL if needed
    if (item.output_video_path && !item.output_video_url) {
      const { data } = await supabase.storage
        .from("video-generations")
        .createSignedUrl(item.output_video_path, 3600);
      
      if (data?.signedUrl) {
        item.output_video_url = data.signedUrl;
      }
    }
    setCurrentGeneration(item);
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { label: status, labelEn: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <AppShellV2>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <VideoIcon className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">{t("videoStudio.title")}</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isFreeUser ? (
                <Badge variant="outline" className="text-destructive border-destructive">
                  {t("videoStudio.premiumOnly")}
                </Badge>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>{dailyUsed}/{dailyLimit === -1 ? '∞' : dailyLimit} {t("videoStudio.today")}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Free user blocking overlay */}
        {isFreeUser && (
          <div className="flex-1 flex items-center justify-center p-8">
            <Card className="max-w-md w-full p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <VideoIcon className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">{t("videoStudio.freeBlocked.title")}</h2>
              <p className="text-muted-foreground">{t("videoStudio.freeBlocked.description")}</p>
              <Button className="w-full" onClick={() => window.location.href = "/settings"}>
                {t("videoStudio.freeBlocked.upgrade")}
              </Button>
            </Card>
          </div>
        )}

        {/* Main content - only show for non-free users */}
        {!isFreeUser && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Inputs */}
          <div className="w-[400px] flex-shrink-0 border-r border-border overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Prompt */}
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Video tavsifini kiriting..."
                  className="min-h-[100px] resize-none"
                />
              </div>

              {/* Negative Prompt */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="negative">
                  <AccordionTrigger className="text-sm">Salbiy prompt</AccordionTrigger>
                  <AccordionContent>
                    <Textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="Nima bo'lmasligi kerak..."
                      className="min-h-[60px] resize-none"
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Preset */}
              <div className="space-y-2">
                <Label>Uslub</Label>
                <Select value={preset} onValueChange={setPreset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESETS.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map(ar => (
                      <SelectItem key={ar.id} value={ar.id}>{ar.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {aspectRatio === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Kenglik</Label>
                    <Input
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(parseInt(e.target.value) || 768)}
                      min={256}
                      max={1920}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Balandlik</Label>
                    <Input
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(parseInt(e.target.value) || 512)}
                      min={256}
                      max={1920}
                    />
                  </div>
                </div>
              )}

              {/* Quality Tier */}
              <div className="space-y-2">
                <Label>Sifat</Label>
                <Select value={qualityTier} onValueChange={setQualityTier}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_TIERS.map(q => (
                      <SelectItem key={q.id} value={q.id}>{q.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>Davomiyligi: {durationSeconds}s</Label>
                <Select value={String(durationSeconds)} onValueChange={(v) => setDurationSeconds(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8].map(d => (
                      <SelectItem key={d} value={String(d)}>{d} soniya</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Settings */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="advanced">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      Kengaytirilgan sozlamalar
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    {/* FPS */}
                    <div className="space-y-2">
                      <Label>FPS</Label>
                      <Select value={String(fps)} onValueChange={(v) => setFps(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALLOWED_FPS.map(f => (
                            <SelectItem key={f} value={String(f)}>{f} fps</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Seed */}
                    <div className="space-y-2">
                      <Label>Seed</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={seed ?? ""}
                          onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="Tasodifiy"
                        />
                        <Button variant="outline" size="icon" onClick={randomizeSeed}>
                          <Shuffle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-2">
                      <Label>Steps: {steps}</Label>
                      <Slider
                        value={[steps]}
                        onValueChange={([v]) => setSteps(Math.min(v, MAX_STEPS))}
                        min={10}
                        max={MAX_STEPS}
                        step={5}
                      />
                    </div>

                    {/* Guidance Scale */}
                    <div className="space-y-2">
                      <Label>Guidance: {guidanceScale.toFixed(1)}</Label>
                      <Slider
                        value={[guidanceScale]}
                        onValueChange={([v]) => setGuidanceScale(v)}
                        min={1}
                        max={8}
                        step={0.5}
                      />
                    </div>

                    {/* Motion Strength */}
                    <div className="space-y-2">
                      <Label>Harakat kuchi: {(motionStrength * 100).toFixed(0)}%</Label>
                      <Slider
                        value={[motionStrength]}
                        onValueChange={([v]) => setMotionStrength(v)}
                        min={0}
                        max={1}
                        step={0.1}
                      />
                    </div>

                    {/* Audio */}
                    <div className="flex items-center justify-between">
                      <Label>Audio yaratish</Label>
                      <Switch checked={generateAudio} onCheckedChange={setGenerateAudio} />
                    </div>

                    {/* Output Format */}
                    <div className="space-y-2">
                      <Label>Format</Label>
                      <Select value={outputFormat} onValueChange={setOutputFormat}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mp4">MP4</SelectItem>
                          <SelectItem value="webm">WebM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Reference Uploads */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="references">
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Namuna fayllar
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Namuna rasm</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setReferenceImage(e.target.files?.[0] || null)}
                      />
                      {referenceImage && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{referenceImage.name}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReferenceImage(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Namuna video</Label>
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setReferenceVideo(e.target.files?.[0] || null)}
                      />
                      {referenceVideo && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{referenceVideo.name}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReferenceVideo(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Generate Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={startGeneration}
                disabled={isGenerating || !prompt.trim() || (dailyLimit >= 0 && dailyUsed >= dailyLimit)}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Yaratilmoqda...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Video yaratish
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Panel - Results & History */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Current Generation */}
            {currentGeneration && (
              <div className="p-4 border-b border-border">
                <Card className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(currentGeneration.status)}
                        {currentGeneration.status === "running" && (
                          <span className="text-sm text-muted-foreground">
                            {Math.round(currentGeneration.progress || 0)}%
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {currentGeneration.prompt}
                      </p>
                    </div>
                    {(currentGeneration.status === "running" || currentGeneration.status === "processing") && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={cancelGeneration}>
                          <X className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => refreshStatus()}
                          disabled={isRefreshing}
                        >
                          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                        </Button>
                      </div>
                    )}
                  </div>

                  {(currentGeneration.status === "running" || currentGeneration.status === "processing") && (
                    <div className="space-y-2 mb-3">
                      <Progress value={currentGeneration.progress || 0} />
                      <p className="text-xs text-muted-foreground text-center">
                        {currentGeneration.status === "processing" ? "RunPod ishlamoqda..." : "Video yaratilmoqda..."}
                        {" "}
                        <button 
                          onClick={() => refreshStatus()} 
                          className="text-primary hover:underline"
                          disabled={isRefreshing}
                        >
                          {isRefreshing ? "Tekshirilmoqda..." : "Statusni yangilash"}
                        </button>
                      </p>
                    </div>
                  )}

                  {currentGeneration.status === "failed" && currentGeneration.error && (
                    <p className="text-sm text-destructive mb-3">{currentGeneration.error}</p>
                  )}

                  {currentGeneration.status === "completed" && currentGeneration.output_video_url && (
                    <div className="space-y-3">
                      <video
                        src={currentGeneration.output_video_url}
                        controls
                        playsInline
                        className="w-full rounded-xl bg-black max-h-[400px]"
                        style={{ borderRadius: 12 }}
                      />
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadVideo(currentGeneration.output_video_url!)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Yuklab olish
                        </Button>
                        <Button variant="outline" size="sm" onClick={regenerateWithSameSettings}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Qayta yaratish
                        </Button>
                        <Button variant="outline" size="sm" onClick={sendToChat}>
                          <Send className="w-4 h-4 mr-2" />
                          Chatga yuborish
                        </Button>
                        {currentGeneration.output_video_path && (
                          <Button variant="ghost" size="sm" onClick={refreshVideoUrl}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Havolani yangilash
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* History */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Tarix</span>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Hali video yaratilmagan
                    </p>
                  ) : (
                    history.map(item => (
                      <Card
                        key={item.id}
                        className={cn(
                          "p-3 cursor-pointer hover:bg-accent/50 transition-colors",
                          currentGeneration?.id === item.id && "ring-2 ring-primary"
                        )}
                        onClick={() => selectHistoryItem(item)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{item.prompt}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusBadge(item.status)}
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
        )}
      </div>
    </AppShellV2>
  );
}
