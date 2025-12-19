import React, { useState, useRef, useCallback } from "react";
import { SEO } from "@/components/SEO";
import { 
  Sparkles, 
  Download, 
  Eye,
  Upload,
  X,
  Image as ImageIcon,
  Camera,
  Palette,
  Paintbrush,
  Film,
  Layers,
  Zap,
  Crown,
  Lock,
  Info,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useDailyUsageServer } from "@/hooks/useEntitlements";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { resizeImage, generateStudioInputPath } from "@/lib/imageResize";

// ========== TYPE DEFINITIONS ==========
type ToolMode = "t2i" | "remix" | "controlnet";
type ModelChoice = "flux" | "sdxl";
type AspectRatio = "1:1" | "16:9" | "9:16" | "4:5";
type RenderMode = "photo" | "illustration";
type StylePreset = "realistic" | "digital_art" | "illustration" | "anime" | "minimal";

interface ImageStudioRequestDraft {
  toolMode: ToolMode;
  modelChoice: ModelChoice;
  prompt: string;
  aspectRatio: AspectRatio;
  renderMode: RenderMode;
  qualityBoost: boolean;
  stylePreset: StylePreset;
  remixStrength: number;
  conditioningScale: number;
  stepScheduleStart: number;
  stepScheduleEnd: number;
}

interface UploadedImage {
  file: File;
  preview: string;
}

interface InputImageState {
  bucket: string;
  path: string;
}

interface GeneratedImageResult {
  url: string;
  fileName: string;
  meta: {
    prompt_used: string;
    prompt_original: string;
    model: string;
    width: number;
    height: number;
    render_mode: string;
    seed?: number;
    steps?: number;
    toolMode?: ToolMode;
    modelChoice?: ModelChoice;
  };
  createdAt: Date;
}

type UploadStatus = "idle" | "resizing" | "uploading" | "done" | "error";

// ========== CONSTANTS ==========
const STYLE_PRESETS: { id: StylePreset; labelKey: string; icon: React.ElementType; color: string }[] = [
  { id: "realistic", labelKey: "imageStudioV2.style.realistic", icon: Camera, color: "text-blue-500" },
  { id: "digital_art", labelKey: "imageStudioV2.style.digitalArt", icon: Palette, color: "text-purple-500" },
  { id: "illustration", labelKey: "imageStudioV2.style.illustration", icon: Paintbrush, color: "text-orange-500" },
  { id: "anime", labelKey: "imageStudioV2.style.anime", icon: Film, color: "text-pink-500" },
  { id: "minimal", labelKey: "imageStudioV2.style.minimal", icon: Layers, color: "text-slate-500" },
];

const ASPECT_RATIOS: { id: AspectRatio; label: string }[] = [
  { id: "1:1", label: "1:1" },
  { id: "16:9", label: "16:9" },
  { id: "9:16", label: "9:16" },
  { id: "4:5", label: "4:5" },
];

const TOOL_MODES: { id: ToolMode; labelKey: string; disabled?: boolean; badge?: string }[] = [
  { id: "t2i", labelKey: "imageStudioV2.mode.t2i" },
  { id: "remix", labelKey: "imageStudioV2.mode.remix" },
  { id: "controlnet", labelKey: "imageStudioV2.mode.controlnet", disabled: true, badge: "imageStudioV2.comingSoon" },
];

const MAX_PROMPT_LENGTH = 500;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ========== COMPONENT ==========
export default function ImageStudioV2() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isPremium, isDevBypass, isBetaActive, loading: entitlementLoading } = useDailyUsageServer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check if user has premium access (includes dev bypass)
  const isPremiumUser = isPremium || isBetaActive || isDevBypass;

  // Form state - single object
  const [draft, setDraft] = useState<ImageStudioRequestDraft>({
    toolMode: "t2i",
    modelChoice: "flux",
    prompt: "",
    aspectRatio: "1:1",
    renderMode: "photo",
    qualityBoost: false,
    stylePreset: "realistic",
    remixStrength: 0.35,
    conditioningScale: 0.7,
    stepScheduleStart: 0.2,
    stepScheduleEnd: 0.8,
  });

  // Image upload state
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [inputImage, setInputImage] = useState<InputImageState | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedImageResult | null>(null);
  const [requestInFlight, setRequestInFlight] = useState(false);

  // Helper to update draft with premium gating for SDXL
  const updateDraft = useCallback(<K extends keyof ImageStudioRequestDraft>(
    key: K,
    value: ImageStudioRequestDraft[K]
  ) => {
    // Gate SDXL model selection for non-premium users
    if (key === "modelChoice" && value === "sdxl" && !isPremiumUser) {
      toast({
        title: t("imageStudioV2.premiumRequired"),
        description: t("imageStudioV2.sdxlPremiumOnly"),
        variant: "destructive",
      });
      return;
    }
    setDraft(prev => ({ ...prev, [key]: value }));
  }, [isPremiumUser, toast, t]);

  // File handling with resize and upload
  const handleFileSelect = useCallback(async (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: t("imageStudioV2.error"),
        description: t("imageStudioV2.invalidFileType"),
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: t("imageStudioV2.error"),
        description: t("imageStudioV2.fileTooLarge"),
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: t("imageStudioV2.error"),
        description: t("imageStudioV2.pleaseLogin"),
        variant: "destructive",
      });
      return;
    }

    // Set local preview immediately
    const preview = URL.createObjectURL(file);
    setUploadedImage({ file, preview });
    setInputImage(null);
    setUploadStatus("resizing");
    setUploadProgress(0);

    try {
      // Step 1: Resize image (0-30%)
      setUploadProgress(10);
      const resizedBlob = await resizeImage(file, {
        maxLongEdge: 1536,
        quality: 0.85,
        format: "image/jpeg",
      });
      setUploadProgress(30);
      setUploadStatus("uploading");

      // Step 2: Upload to Supabase storage (30-100%)
      const storagePath = generateStudioInputPath(user.id);
      
      // Use XMLHttpRequest for progress tracking
      const uploadPromise = new Promise<{ path: string; error: Error | null }>((resolve) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = 30 + Math.round((e.loaded / e.total) * 70);
            setUploadProgress(percent);
          }
        });

        xhr.addEventListener("load", async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ path: storagePath, error: null });
          } else {
            resolve({ path: "", error: new Error(`Upload failed: ${xhr.status}`) });
          }
        });

        xhr.addEventListener("error", () => {
          resolve({ path: "", error: new Error("Upload failed") });
        });

        // Get session for auth header
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            resolve({ path: "", error: new Error("Not authenticated") });
            return;
          }

          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const uploadUrl = `${supabaseUrl}/storage/v1/object/user-files/${storagePath}`;
          
          xhr.open("POST", uploadUrl);
          xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
          xhr.setRequestHeader("Content-Type", "image/jpeg");
          xhr.setRequestHeader("x-upsert", "true");
          xhr.send(resizedBlob);
        });
      });

      const { path, error } = await uploadPromise;

      if (error) {
        throw error;
      }

      setUploadProgress(100);
      setUploadStatus("done");
      setInputImage({ bucket: "user-files", path });
      
    } catch (error) {
      console.error("Image upload error:", error);
      setUploadStatus("error");
      setInputImage(null);
      toast({
        title: t("imageStudioV2.error"),
        description: t("imageStudioV2.uploadFailed"),
        variant: "destructive",
      });
    }
  }, [toast, t, user]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  }, [handleFileSelect]);

  const removeUploadedImage = useCallback(() => {
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage.preview);
      setUploadedImage(null);
    }
    setInputImage(null);
    setUploadStatus("idle");
    setUploadProgress(0);
  }, [uploadedImage]);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Validation
  const isImageRequired = draft.toolMode === "remix" || draft.toolMode === "controlnet";
  // For Remix: require uploaded image with successful upload
  // For ControlNet: upload works but mode is disabled anyway
  const hasValidInputImage = inputImage !== null && uploadStatus === "done";
  const canGenerate = draft.prompt.trim().length > 0 && 
    (!isImageRequired || hasValidInputImage) &&
    draft.toolMode !== "controlnet"; // ControlNet is still disabled

  // Handle generate
  const handleGenerate = async () => {
    if (!canGenerate || requestInFlight || loading) {
      console.log('[ImageStudioV2] Request already in flight or invalid state, ignoring');
      return;
    }

    // Currently supporting: t2i (flux/sdxl) and remix (sdxl only)
    if (draft.toolMode === "controlnet") {
      toast({
        title: t("imageStudioV2.backendPending"),
        description: t("imageStudioV2.backendPendingDesc"),
      });
      return;
    }

    // Remix mode requires inputImage
    if (draft.toolMode === "remix" && !inputImage) {
      toast({
        title: t("imageStudioV2.error"),
        description: t("imageStudioV2.remixRequiresImage"),
        variant: "destructive",
      });
      return;
    }

    // Premium check for SDXL and Remix (Remix always uses SDXL)
    const requiresPremium = draft.modelChoice === "sdxl" || draft.toolMode === "remix";
    if (requiresPremium && !isPremiumUser) {
      toast({
        title: t("imageStudioV2.premiumRequired"),
        description: draft.toolMode === "remix" 
          ? t("imageStudioV2.remixPremiumOnly") 
          : t("imageStudioV2.sdxlPremiumOnly"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setRequestInFlight(true);
    setGeneratedResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: t("imageStudioV2.error"),
          description: t("imageStudioV2.pleaseLogin"),
          variant: "destructive",
        });
        return;
      }

      // Build request payload based on mode
      const basePayload = {
        prompt: draft.prompt.trim(),
        aspectRatio: draft.aspectRatio,
        renderMode: draft.renderMode,
        stylePreset: draft.stylePreset,
        attachToChat: false,
        toolMode: draft.toolMode,
      };

      let requestPayload: Record<string, unknown>;

      if (draft.toolMode === "remix") {
        // Remix mode: always SDXL with inputImage and remixStrength
        requestPayload = {
          ...basePayload,
          modelChoice: "sdxl",
          qualityBoost: false,
          inputImage: inputImage,
          remixStrength: draft.remixStrength,
        };
      } else {
        // T2I mode
        requestPayload = {
          ...basePayload,
          modelChoice: draft.modelChoice,
          qualityBoost: draft.modelChoice === "sdxl" ? false : draft.qualityBoost,
        };
      }

      console.log('[ImageStudioV2] Sending request:', requestPayload);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fireworks-image-router`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestPayload),
        }
      );

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || t("imageStudioV2.error"));
      }

      setGeneratedResult({
        url: result.image_url,
        fileName: result.file_name,
        meta: {
          prompt_used: result.prompt_used,
          prompt_original: result.prompt_original,
          model: result.model,
          width: result.width,
          height: result.height,
          render_mode: result.render_mode,
          seed: result.seed,
          steps: result.steps,
          toolMode: draft.toolMode,
          modelChoice: draft.toolMode === "remix" ? "sdxl" : draft.modelChoice,
        },
        createdAt: new Date(),
      });

      toast({
        title: t("imageStudioV2.success"),
        description: t("imageStudioV2.imageSaved"),
      });
    } catch (error) {
      console.error("[ImageStudioV2] Generation error:", error);
      toast({
        title: t("imageStudioV2.error"),
        description: error instanceof Error ? error.message : t("imageStudioV2.error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRequestInFlight(false);
    }
  };

  // Handle download
  const handleDownload = async () => {
    if (!generatedResult) return;

    try {
      const response = await fetch(generatedResult.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = generatedResult.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: t("imageStudioV2.downloadStarted") });
    } catch (error) {
      console.error("Download error:", error);
      window.open(generatedResult.url, "_blank");
    }
  };

  // Handle open in new tab
  const handleOpen = () => {
    if (!generatedResult) return;
    window.open(generatedResult.url, "_blank");
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <SEO 
        title="Rasm studiyasi v2" 
        description="Bahor AI bilan sun'iy intellekt yordamida rasmlar yarating, remix qiling yoki strukturasini saqlang."
        url="/image-studio-v2"
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  {t("imageStudioV2.title")}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("imageStudioV2.subtitle")}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">{t("imageStudioV2.rules")}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          
          {/* Mode selector tabs */}
          <Card>
            <CardContent className="p-4">
              <Tabs 
                value={draft.toolMode} 
                onValueChange={(v) => updateDraft("toolMode", v as ToolMode)}
              >
                <TabsList className="grid w-full grid-cols-3">
                  {TOOL_MODES.map((mode) => (
                    <div
                      key={mode.id}
                      onClick={() => {
                        if (mode.disabled) {
                          toast({
                            title: t("imageStudioV2.controlnetComingSoon"),
                            description: t("imageStudioV2.controlnetComingSoonDesc"),
                          });
                        }
                      }}
                      className={mode.disabled ? "cursor-pointer" : ""}
                    >
                      <TabsTrigger
                        value={mode.id}
                        disabled={mode.disabled}
                        className="relative w-full"
                      >
                        {t(mode.labelKey)}
                        {mode.badge && (
                          <Badge 
                            variant="outline" 
                            className="ml-2 text-[10px] px-1.5 py-0 h-4 bg-muted"
                          >
                            {t(mode.badge)}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </div>
                  ))}
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Model selector */}
          <Card>
            <CardContent className="p-4">
              <Label className="text-sm font-medium mb-3 block">{t("imageStudioV2.modelLabel")}</Label>
              <div className="flex gap-3">
                <button
                  onClick={() => updateDraft("modelChoice", "flux")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all",
                    draft.modelChoice === "flux"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="font-medium">{t("imageStudioV2.model.flux")}</span>
                </button>
                <button
                  onClick={() => updateDraft("modelChoice", "sdxl")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all",
                    draft.modelChoice === "sdxl"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <Crown className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">{t("imageStudioV2.model.sdxl")}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    Premium
                  </Badge>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Image upload (only for Remix / ControlNet) */}
          {isImageRequired && (
            <Card>
              <CardContent className="p-4">
                <Label className="text-sm font-medium mb-3 block">
                  {t("imageStudioV2.sourceImageLabel")}
                </Label>
                
                {!uploadedImage ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                      isDragOver
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-accent/50"
                    )}
                  >
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">
                      {t("imageStudioV2.dropOrClick")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPEG, WebP · {t("imageStudioV2.maxFileSize", { size: "10MB" })}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES.join(",")}
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="relative">
                        <img
                          src={uploadedImage.preview}
                          alt="Preview"
                          className={cn(
                            "w-20 h-20 object-cover rounded-lg transition-opacity",
                            uploadStatus === "resizing" || uploadStatus === "uploading" ? "opacity-50" : ""
                          )}
                        />
                        {(uploadStatus === "resizing" || uploadStatus === "uploading") && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                          </div>
                        )}
                        {uploadStatus === "done" && (
                          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                        )}
                        {uploadStatus === "error" && (
                          <div className="absolute -bottom-1 -right-1 bg-destructive rounded-full p-0.5">
                            <AlertCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{uploadedImage.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(uploadedImage.file.size)}
                        </p>
                        {/* Upload status text */}
                        {uploadStatus === "resizing" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("imageStudioV2.resizing")}
                          </p>
                        )}
                        {uploadStatus === "uploading" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("imageStudioV2.uploading")}
                          </p>
                        )}
                        {uploadStatus === "done" && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            {t("imageStudioV2.uploadComplete")}
                          </p>
                        )}
                        {uploadStatus === "error" && (
                          <p className="text-xs text-destructive mt-1">
                            {t("imageStudioV2.uploadFailed")}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={removeUploadedImage}
                        disabled={uploadStatus === "resizing" || uploadStatus === "uploading"}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {/* Progress bar */}
                    {(uploadStatus === "resizing" || uploadStatus === "uploading") && (
                      <Progress value={uploadProgress} className="h-1.5" />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Remix strength slider (only for Remix mode) */}
          {draft.toolMode === "remix" && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">{t("imageStudioV2.remixStrengthLabel")}</Label>
                  <span className="text-sm text-muted-foreground">{draft.remixStrength.toFixed(2)}</span>
                </div>
                <Slider
                  value={[draft.remixStrength]}
                  onValueChange={([v]) => updateDraft("remixStrength", v)}
                  min={0.05}
                  max={0.9}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t("imageStudioV2.remixStrengthHelper")}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Prompt input */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>{t("imageStudioV2.promptLabel")}</Label>
                <Textarea
                  placeholder={t("imageStudioV2.promptPlaceholder")}
                  value={draft.prompt}
                  onChange={(e) => updateDraft("prompt", e.target.value.slice(0, MAX_PROMPT_LENGTH))}
                  rows={4}
                  className="resize-none"
                  disabled={loading}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("imageStudioV2.promptHelper")}</span>
                  <span>{draft.prompt.length}/{MAX_PROMPT_LENGTH}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Style presets */}
          <Card>
            <CardContent className="p-4">
              <Label className="text-sm font-medium mb-3 block">{t("imageStudioV2.styleLabel")}</Label>
              <div className="grid grid-cols-5 gap-2">
                {STYLE_PRESETS.map((style) => {
                  const Icon = style.icon;
                  const isSelected = draft.stylePreset === style.id;
                  return (
                    <button
                      key={style.id}
                      onClick={() => updateDraft("stylePreset", style.id)}
                      disabled={loading}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-accent/50"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", isSelected ? "text-primary" : style.color)} />
                      <span className="text-xs font-medium truncate w-full text-center">
                        {t(style.labelKey)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Aspect ratio & Render mode */}
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Aspect ratio */}
              <div className="space-y-2">
                <Label>{t("imageStudioV2.aspectLabel")}</Label>
                <div className="flex flex-wrap gap-2">
                  {ASPECT_RATIOS.map((ratio) => (
                    <Button
                      key={ratio.id}
                      variant={draft.aspectRatio === ratio.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateDraft("aspectRatio", ratio.id)}
                      disabled={loading}
                      className="min-w-[60px]"
                    >
                      {ratio.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Render mode */}
              <div className="space-y-2">
                <Label>{t("imageStudioV2.renderModeLabel")}</Label>
                <div className="flex gap-2">
                  <Button
                    variant={draft.renderMode === "photo" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateDraft("renderMode", "photo")}
                    disabled={loading}
                  >
                    <Camera className="w-4 h-4 mr-1.5" />
                    {t("imageStudioV2.renderMode.photo")}
                  </Button>
                  <Button
                    variant={draft.renderMode === "illustration" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateDraft("renderMode", "illustration")}
                    disabled={loading}
                  >
                    <Paintbrush className="w-4 h-4 mr-1.5" />
                    {t("imageStudioV2.renderMode.illustration")}
                  </Button>
                </div>
              </div>

              {/* Quality boost (only for FLUX) */}
              <div className={cn(
                "flex items-center justify-between py-2 px-3 rounded-lg transition-opacity",
                draft.modelChoice === "sdxl" ? "opacity-50 bg-muted/30" : "bg-muted/50"
              )}>
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{t("imageStudioV2.qualityBoost")}</Label>
                  <p className="text-xs text-muted-foreground">{t("imageStudioV2.qualityBoostDesc")}</p>
                </div>
                <Switch
                  checked={draft.qualityBoost}
                  onCheckedChange={(v) => updateDraft("qualityBoost", v)}
                  disabled={loading || draft.modelChoice === "sdxl"}
                />
              </div>
              {draft.modelChoice === "sdxl" && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {t("imageStudioV2.qualityBoostSdxlDisabled")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={loading || !canGenerate}
            className="w-full h-12 text-base"
            size="lg"
          >
            {loading ? (
              <>
                <Clock className="w-5 h-5 mr-2 animate-spin" />
                {t("imageStudioV2.generating")}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                {t("imageStudioV2.generateBtn")}
              </>
            )}
          </Button>

          {/* Result section */}
          <Card>
            <CardContent className="p-4">
              {loading ? (
                <div className="aspect-square bg-muted/50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{t("imageStudioV2.generatingProgress")}</p>
                  </div>
                </div>
              ) : generatedResult ? (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden bg-muted">
                    <img
                      src={generatedResult.url}
                      alt="Generated"
                      className="w-full h-auto object-contain max-h-[500px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={handleDownload}>
                      <Download className="w-4 h-4 mr-2" />
                      {t("imageStudioV2.download")}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handleOpen}>
                      <Eye className="w-4 h-4 mr-2" />
                      {t("imageStudioV2.open")}
                    </Button>
                  </div>
                  {/* Metadata line */}
                  <div className="text-xs text-muted-foreground text-center space-y-1">
                    <p>
                      {generatedResult.meta.toolMode && generatedResult.meta.modelChoice && (
                        <span className="font-medium">
                          {t(`imageStudioV2.mode.${generatedResult.meta.toolMode}`)} · {t(`imageStudioV2.model.${generatedResult.meta.modelChoice}`)} · 
                        </span>
                      )}
                      {generatedResult.meta.model} · {generatedResult.meta.width}×{generatedResult.meta.height} · {formatTime(generatedResult.createdAt)}
                    </p>
                    {generatedResult.meta.seed && (
                      <p className="font-mono">seed: {generatedResult.meta.seed}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="aspect-square bg-muted/30 rounded-lg flex items-center justify-center border border-dashed border-border">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">{t("imageStudioV2.emptyStateTitle")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("imageStudioV2.emptyStateDesc")}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
