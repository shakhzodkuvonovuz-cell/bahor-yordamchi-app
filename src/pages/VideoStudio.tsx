import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { checkAdminStatus } from "@/lib/entitlements";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { 
  Play, 
  Download, 
  Send, 
  RefreshCw, 
  X, 
  Shuffle, 
  Video as VideoIcon, 
  Clock, 
  Loader2,
  Settings2,
  ImageIcon,
  Type,
  FlaskConical,
  Lock,
  Zap,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

// ========== CONSTANTS ==========
const STYLE_PRESETS = [
  { id: "cinematic", label: "Kinematografik", params: { guidance_scale: 7, steps: 30, motion_strength: 0.8 } },
  { id: "realistic", label: "Realistik", params: { guidance_scale: 7.5, steps: 35, motion_strength: 0.6 } },
  { id: "anime", label: "Anime", params: { guidance_scale: 6.5, steps: 30, motion_strength: 0.7 } },
  { id: "retro", label: "Retro film", params: { guidance_scale: 6, steps: 25, motion_strength: 0.5 } },
  { id: "custom", label: "Maxsus", params: {} },
];

const ASPECT_RATIOS = [
  { id: "9:16", label: "9:16 (Vertikal)", width: 448, height: 768 },
  { id: "16:9", label: "16:9 (Keng)", width: 768, height: 448 },
  { id: "1:1", label: "1:1 (Kvadrat)", width: 512, height: 512 },
];

const DURATIONS = [
  { id: "4", label: "4s", seconds: 4 },
  { id: "6", label: "6s", seconds: 6 },
  { id: "8", label: "8s", seconds: 8 },
];

const ALLOWED_FPS = [8, 12, 24, 30];
const MAX_STEPS = 50;

type SourceType = "text" | "image";
type ModeType = "fast" | "pro";

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
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  idle: { label: "Tayyor", variant: "outline" },
  queued: { label: "Navbatda", variant: "secondary" },
  running: { label: "Ishlamoqda", variant: "default" },
  processing: { label: "Qayta ishlanmoqda", variant: "default" },
  uploading: { label: "Yuklanmoqda", variant: "default" },
  completed: { label: "Tayyor", variant: "outline" },
  failed: { label: "Xatolik", variant: "destructive" },
  canceled: { label: "Bekor qilindi", variant: "secondary" },
};

export default function VideoStudio() {
  const { t } = useTranslation();
  const { user, session } = useAuth();
  const { toast } = useToast();
  
  // Access control
  const [hasLabsAccess, setHasLabsAccess] = useState(false);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isFreeUser, setIsFreeUser] = useState(false);
  
  // Form state
  const [prompt, setPrompt] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("text");
  const [mode, setMode] = useState<ModeType>("fast");
  const [duration, setDuration] = useState("4");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [stylePreset, setStylePreset] = useState("cinematic");
  
  // Advanced settings
  const [seed, setSeed] = useState<number | null>(null);
  const [motionStrength, setMotionStrength] = useState(0.7);
  const [guidanceScale, setGuidanceScale] = useState(7);
  const [steps, setSteps] = useState(30);
  const [fps, setFps] = useState(24);
  
  // Reference image for image→video
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<VideoGeneration | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [dailyUsed, setDailyUsed] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5);
  
  // Polling
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const activePollGenerationIdRef = useRef<string | null>(null);
  const lastCompletedToastGenerationIdRef = useRef<string | null>(null);

  // Check access on mount
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setCheckingAccess(false);
        return;
      }
      
      try {
        const { isAdmin, isDevBypass } = await checkAdminStatus();
        setHasLabsAccess(isAdmin || isDevBypass);
      } catch (err) {
        console.error('Failed to check labs access:', err);
        setHasLabsAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    };
    
    checkAccess();
  }, [user]);

  // Load daily usage
  useEffect(() => {
    if (user) {
      loadDailyUsage();
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [user]);

  // Apply preset when changed
  useEffect(() => {
    const presetData = STYLE_PRESETS.find(p => p.id === stylePreset);
    if (presetData && stylePreset !== "custom") {
      if (presetData.params.guidance_scale) setGuidanceScale(presetData.params.guidance_scale);
      if (presetData.params.steps) setSteps(presetData.params.steps);
      if (presetData.params.motion_strength) setMotionStrength(presetData.params.motion_strength);
    }
  }, [stylePreset]);

  // Update steps based on mode
  useEffect(() => {
    if (mode === "fast") {
      setSteps(Math.min(25, steps));
    } else {
      setSteps(Math.max(35, steps));
    }
  }, [mode]);

  // Handle reference image preview
  useEffect(() => {
    if (referenceImage) {
      const url = URL.createObjectURL(referenceImage);
      setReferenceImagePreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setReferenceImagePreview(null);
    }
  }, [referenceImage]);

  const loadDailyUsage = async () => {
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
    
    try {
      const { data, error } = await supabase.functions.invoke("admin-entitlements", {
        method: "GET",
      });
      
      if (!error && data) {
        const userIsPremium = data.plan === "beta_premium" || data.plan === "premium" || data.isDevBypass;
        setIsFreeUser(!userIsPremium && !data.isDevBypass);
        setDailyLimit(data.isDevBypass ? -1 : (userIsPremium ? 5 : 0));
      } else {
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
    const ar = ASPECT_RATIOS.find(a => a.id === aspectRatio);
    return ar ? { width: ar.width, height: ar.height } : { width: 768, height: 448 };
  };

  const getDurationSeconds = () => {
    const d = DURATIONS.find(dur => dur.id === duration);
    return d ? d.seconds : 4;
  };

  const calculateETA = () => {
    const durationSec = getDurationSeconds();
    const baseTime = mode === "fast" ? 60 : 120;
    return baseTime + (durationSec * 10);
  };

  const startGeneration = async () => {
    if (!prompt.trim()) {
      toast({ title: t("videoStudio.enterPrompt"), variant: "destructive" });
      return;
    }

    if (!session?.access_token) {
      toast({ title: t("videoStudio.pleaseLogin"), variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setEstimatedTime(calculateETA());
    const resolution = getResolution();

    try {
      const response = await supabase.functions.invoke("runpod-video", {
        body: {
          action: "start",
          prompt: prompt.trim(),
          params: {
            width: resolution.width,
            height: resolution.height,
            fps: ALLOWED_FPS.includes(fps) ? fps : 24,
            duration_seconds: getDurationSeconds(),
            seed: seed ?? Math.floor(Math.random() * 2147483647),
            guidance_scale: Math.min(guidanceScale, 8),
            steps: Math.min(steps, MAX_STEPS),
            motion_strength: Math.max(0, Math.min(1, motionStrength)),
            preset: stylePreset,
            mode,
          },
        },
      });

      const data = response.data;
      
      if (data?.error === "VIDEO_DISABLED_TEMPORARILY") {
        setFeatureDisabled(true);
        setIsGenerating(false);
        toast({ 
          title: "Vaqtincha to'xtatildi",
          description: data.messageUz || "Video funksiyasi vaqtincha o'chirildi.",
          variant: "destructive" 
        });
        return;
      }

      if (response.error && !data) {
        throw new Error(response.error.message || t("videoStudio.error"));
      }

      if (!data?.ok) {
        if (data?.error === "VIDEO_NOT_AVAILABLE_FREE") {
          toast({ 
            title: t("videoStudio.freeBlocked.title"),
            description: t("videoStudio.freeBlocked.description"),
            variant: "destructive" 
          });
          setIsFreeUser(true);
        } else {
          throw new Error(data?.messageUz || data?.error || t("videoStudio.error"));
        }
        setIsGenerating(false);
        return;
      }

      setCurrentGeneration({
        id: data.generationId,
        created_at: new Date().toISOString(),
        status: "running",
        prompt: prompt.trim(),
        params: {},
        progress: 0,
      });

      startPolling(data.generationId);
      setDailyUsed(prev => prev + 1);

    } catch (error: any) {
      console.error("Generation error:", error);
      toast({ 
        title: t("videoStudio.error"), 
        description: error.message,
        variant: "destructive" 
      });
      setIsGenerating(false);
    }
  };

  const notifyCompletedOnce = (generationId: string) => {
    if (lastCompletedToastGenerationIdRef.current === generationId) return;
    lastCompletedToastGenerationIdRef.current = generationId;
    toast({ title: t("videoStudio.videoReady") });
  };

  const startPolling = (generationId: string) => {
    if (pollIntervalRef.current && activePollGenerationIdRef.current === generationId) {
      return;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    activePollGenerationIdRef.current = generationId;
    pollCountRef.current = 0;
    
    const poll = async () => {
      pollCountRef.current++;
      
      try {
        const response = await supabase.functions.invoke("runpod-video", {
          body: { action: "status", generationId },
        });

        if (response.error) {
          return;
        }

        const data = response.data;
        
        if (!data.ok) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsGenerating(false);
          setCurrentGeneration(prev => prev ? {
            ...prev,
            status: "failed",
            error: data.messageUz || data.error || "Noma'lum xatolik",
          } : null);
          toast({ 
            title: t("videoStudio.error"), 
            description: data.error, 
            variant: "destructive" 
          });
          return;
        }

        setCurrentGeneration(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: data.status,
            progress: data.progress || prev.progress,
            error: data.error,
            output_video_path: data.outputVideoPath,
            output_video_url: data.outputVideoUrl,
          };
        });

        if (["completed", "failed", "canceled"].includes(data.status)) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsGenerating(false);
          
          if (data.status === "completed" && data.outputVideoUrl) {
            notifyCompletedOnce(generationId);
          } else if (data.status === "failed") {
            toast({ title: t("videoStudio.error"), description: data.error, variant: "destructive" });
          }
        }

      } catch (error) {
        console.error("Polling exception:", error);
      }
    };

    pollIntervalRef.current = setInterval(poll, 2000);
    poll();
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
      toast({ title: t("videoStudio.canceled") });
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
      toast({ title: t("videoStudio.error"), variant: "destructive" });
    }
  };

  const sendToChat = async () => {
    if (!currentGeneration?.output_video_path || !currentGeneration.output_video_url) {
      toast({ title: t("videoStudio.error"), variant: "destructive" });
      return;
    }

    try {
      const { addMessage, createThread } = await import("@/lib/chatStore");
      const thread = await createThread(user!.id, { mode: "general", title: "Video Studio" });
      await addMessage(user!.id, {
        threadId: thread.id,
        role: "assistant",
        content: `🎬 Video yaratildi:\n\n**Prompt:** ${currentGeneration.prompt}\n\n📥 [Video yuklab olish](${currentGeneration.output_video_url})`,
      });
      toast({ title: t("videoStudio.sendToChat") + " ✓" });
    } catch (error) {
      console.error("Send to chat error:", error);
      toast({ title: t("videoStudio.error"), variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatETA = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `~${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (checkingAccess) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Access restricted
  if (!hasLabsAccess || featureDisabled) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
            <FlaskConical className="w-10 h-10 text-purple-500" />
          </div>
          <div className="space-y-2">
            <Badge variant="secondary" className="gap-1.5 mb-3">
              <Lock className="w-3 h-3" />
              Labs
            </Badge>
            <h2 className="text-2xl font-bold">Video Studio</h2>
            <p className="text-lg text-muted-foreground">
              {featureDisabled ? "Vaqtincha to'xtatildi" : "Tez orada"}
            </p>
          </div>
          <p className="text-muted-foreground">
            {featureDisabled 
              ? "Video funksiyasi vaqtincha o'chirildi. Sifatni oshirib qaytamiz."
              : "Video yaratish funksiyasi hozirda sinovda. Tez orada barcha foydalanuvchilar uchun ochiladi!"}
          </p>
          <Button variant="outline" className="w-full" onClick={() => window.location.href = "/modes"}>
            Bosh sahifaga qaytish
          </Button>
        </Card>
      </div>
    );
  }

  // Free user blocked
  if (isFreeUser) {
    return (
      <div className="flex items-center justify-center h-full p-8">
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
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex-shrink-0 h-14 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <VideoIcon className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">{t("videoStudio.title")}</h1>
          <Badge variant="secondary" className="gap-1">
            <FlaskConical className="w-3 h-3" />
            Labs
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{dailyUsed}/{dailyLimit === -1 ? '∞' : dailyLimit} {t("videoStudio.today")}</span>
        </div>
      </header>

      {/* Main content with resizable panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Inputs */}
        <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
          <ScrollArea className="h-full">
            <div className="p-4 space-y-5">
              {/* Prompt */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("videoStudio.promptLabel")}</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t("videoStudio.promptPlaceholder")}
                  className="min-h-[120px] resize-none"
                />
              </div>

              {/* Mode Toggle */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Rejim</Label>
                <Tabs value={mode} onValueChange={(v) => setMode(v as ModeType)} className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="fast" className="gap-2">
                      <Zap className="w-4 h-4" />
                      Tez
                    </TabsTrigger>
                    <TabsTrigger value="pro" className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      Pro
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Source Type Toggle */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Manba turi</Label>
                <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)} className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="text" className="gap-2">
                      <Type className="w-4 h-4" />
                      Matn → Video
                    </TabsTrigger>
                    <TabsTrigger value="image" className="gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Rasm → Video
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Reference Image (only for image→video) */}
              {sourceType === "image" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("videoStudio.referenceImage")}</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setReferenceImage(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {referenceImagePreview && (
                    <div className="relative rounded-lg overflow-hidden border border-border">
                      <img 
                        src={referenceImagePreview} 
                        alt="Reference" 
                        className="w-full h-32 object-cover"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 bg-background/80"
                        onClick={() => setReferenceImage(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Duration Select */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("videoStudio.duration")}</Label>
                <Tabs value={duration} onValueChange={setDuration} className="w-full">
                  <TabsList className="w-full grid grid-cols-3">
                    {DURATIONS.map(d => (
                      <TabsTrigger key={d.id} value={d.id}>{d.label}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("videoStudio.aspectRatio")}</Label>
                <Tabs value={aspectRatio} onValueChange={setAspectRatio} className="w-full">
                  <TabsList className="w-full grid grid-cols-3">
                    {ASPECT_RATIOS.map(ar => (
                      <TabsTrigger key={ar.id} value={ar.id}>{ar.id}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              {/* Style Preset */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("videoStudio.preset")}</Label>
                <Select value={stylePreset} onValueChange={setStylePreset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_PRESETS.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Settings */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="advanced" className="border-none">
                  <AccordionTrigger className="text-sm py-2 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      {t("videoStudio.advancedSettings")}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    {/* Seed */}
                    <div className="space-y-2">
                      <Label className="text-xs">{t("videoStudio.seed")}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={seed ?? ""}
                          onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                          placeholder={t("videoStudio.seedPlaceholder")}
                          className="flex-1"
                        />
                        <Button variant="outline" size="icon" onClick={randomizeSeed}>
                          <Shuffle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Motion Strength */}
                    <div className="space-y-2">
                      <Label className="text-xs">{t("videoStudio.motionStrength")}: {(motionStrength * 100).toFixed(0)}%</Label>
                      <Slider
                        value={[motionStrength]}
                        onValueChange={([v]) => setMotionStrength(v)}
                        min={0}
                        max={1}
                        step={0.1}
                      />
                    </div>

                    {/* Guidance */}
                    <div className="space-y-2">
                      <Label className="text-xs">{t("videoStudio.guidance")}: {guidanceScale.toFixed(1)}</Label>
                      <Slider
                        value={[guidanceScale]}
                        onValueChange={([v]) => setGuidanceScale(v)}
                        min={1}
                        max={8}
                        step={0.5}
                      />
                    </div>

                    {/* Steps */}
                    <div className="space-y-2">
                      <Label className="text-xs">{t("videoStudio.steps")}: {steps}</Label>
                      <Slider
                        value={[steps]}
                        onValueChange={([v]) => setSteps(Math.min(v, MAX_STEPS))}
                        min={10}
                        max={MAX_STEPS}
                        step={5}
                      />
                    </div>

                    {/* FPS */}
                    <div className="space-y-2">
                      <Label className="text-xs">{t("videoStudio.fps")}</Label>
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
                    {t("videoStudio.generating")}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    {t("videoStudio.generateBtn")}
                  </>
                )}
              </Button>
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Preview */}
        <ResizablePanel defaultSize={65}>
          <div className="h-full flex flex-col items-center justify-center p-6">
            {/* Empty State */}
            {!currentGeneration && (
              <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center">
                  <VideoIcon className="w-12 h-12 text-muted-foreground/50" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-muted-foreground">Video yarating</h3>
                  <p className="text-sm text-muted-foreground/70 max-w-sm">
                    Chap panelda video tavsifini kiriting va "Video yaratish" tugmasini bosing
                  </p>
                </div>
              </div>
            )}

            {/* Status Card */}
            {currentGeneration && (
              <Card className="w-full max-w-2xl p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(currentGeneration.status)}
                      {(currentGeneration.status === "running" || currentGeneration.status === "processing") && (
                        <span className="text-sm text-muted-foreground">
                          {Math.round(currentGeneration.progress || 0)}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 pr-4">
                      {currentGeneration.prompt}
                    </p>
                  </div>
                  {(currentGeneration.status === "running" || currentGeneration.status === "processing") && (
                    <Button variant="ghost" size="sm" onClick={cancelGeneration}>
                      <X className="w-4 h-4 mr-1" />
                      {t("videoStudio.cancel")}
                    </Button>
                  )}
                </div>

                {/* Progress Bar & ETA */}
                {(currentGeneration.status === "running" || currentGeneration.status === "processing") && (
                  <div className="space-y-3">
                    <Progress value={currentGeneration.progress || 0} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {currentGeneration.status === "processing" ? "Qayta ishlanmoqda..." : "Video yaratilmoqda..."}
                      </span>
                      {estimatedTime && (
                        <span>ETA: {formatETA(estimatedTime)}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Error */}
                {currentGeneration.status === "failed" && currentGeneration.error && (
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <p className="text-sm text-destructive">{currentGeneration.error}</p>
                  </div>
                )}

                {/* Completed - Video Player */}
                {currentGeneration.status === "completed" && currentGeneration.output_video_url && (
                  <div className="space-y-4">
                    <video
                      src={currentGeneration.output_video_url}
                      controls
                      playsInline
                      autoPlay
                      loop
                      className="w-full rounded-xl bg-black aspect-video"
                    />
                    <div className="flex gap-3 justify-center">
                      <Button
                        variant="default"
                        onClick={() => downloadVideo(currentGeneration.output_video_url!)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {t("videoStudio.download")}
                      </Button>
                      <Button variant="outline" onClick={sendToChat}>
                        <Send className="w-4 h-4 mr-2" />
                        {t("videoStudio.sendToChat")}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Canceled */}
                {currentGeneration.status === "canceled" && (
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">{t("videoStudio.canceled")}</p>
                  </div>
                )}
              </Card>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
