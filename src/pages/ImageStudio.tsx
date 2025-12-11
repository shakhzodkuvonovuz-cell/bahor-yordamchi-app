import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  Download, 
  MessageSquare, 
  Loader2, 
  Info, 
  ChevronDown,
  History,
  Image as ImageIcon,
  Camera,
  Palette,
  Paintbrush,
  Film,
  Layers,
  Settings2,
  X,
  Eye,
  RefreshCw,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n/LanguageProvider";
import { ImageLightbox } from "@/components/ImageLightbox";

// Style presets with icons and descriptions
const STYLE_PRESETS = [
  { id: "realistic", labelKey: "imageStudio.style.realistic", icon: Camera, color: "text-blue-500" },
  { id: "digital_art", labelKey: "imageStudio.style.digitalArt", icon: Palette, color: "text-purple-500" },
  { id: "illustration", labelKey: "imageStudio.style.illustration", icon: Paintbrush, color: "text-orange-500" },
  { id: "anime", labelKey: "imageStudio.style.anime", icon: Film, color: "text-pink-500" },
  { id: "minimal", labelKey: "imageStudio.style.minimal", icon: Layers, color: "text-slate-500" },
];

// Aspect ratios
const ASPECT_RATIOS = [
  { id: "1:1", label: "1:1", description: "imageStudio.aspect.square" },
  { id: "3:4", label: "3:4", description: "imageStudio.aspect.portrait" },
  { id: "4:3", label: "4:3", description: "imageStudio.aspect.landscape" },
  { id: "9:16", label: "9:16", description: "imageStudio.aspect.story" },
  { id: "16:9", label: "16:9", description: "imageStudio.aspect.wide" },
];

// Number of images options
const NUM_IMAGES_OPTIONS = [1, 2, 4];

interface GeneratedImage {
  id: string;
  url: string;
  prompt_uz: string;
  prompt_en: string;
  aspect_ratio: string;
  created_at: string;
  file_path: string;
  style_preset?: string;
}

interface UsageInfo {
  used: number;
  limit: number;
  isUnlimited: boolean;
}

export default function ImageStudio() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [prompt, setPrompt] = useState("");
  const [stylePreset, setStylePreset] = useState("realistic");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [numImages, setNumImages] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [seed, setSeed] = useState("");
  const [qualityBoost, setQualityBoost] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [usage, setUsage] = useState<UsageInfo>({ used: 0, limit: 5, isUnlimited: false });
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  
  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // Send to chat modal
  const [sendToChatModal, setSendToChatModal] = useState<GeneratedImage | null>(null);

  const MAX_PROMPT_LENGTH = 500;

  // Fetch usage info using the proper entitlements endpoint that handles dev bypass
  const fetchUsage = useCallback(async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("image_generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", today);

      // Fetch from admin-entitlements which properly checks DEV_UNLIMITED_EMAILS
      const { data, error } = await supabase.functions.invoke("admin-entitlements?action=my-entitlement", {
        method: "GET",
      });

      const isDevBypass = data?.isDevBypass === true;
      const isPremium = data?.plan === "beta_premium" || data?.plan === "premium";
      const dailyLimit = isDevBypass ? -1 : (isPremium ? 20 : 5);

      setUsage({
        used: count ?? 0,
        limit: dailyLimit,
        isUnlimited: isDevBypass,
      });
    } catch (error) {
      console.error("Failed to fetch usage:", error);
    }
  }, [user]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("image_generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get signed URLs for each image
      const imagesWithUrls = await Promise.all(
        (data || []).map(async (img) => {
          const { data: urlData } = await supabase.storage
            .from("user-files")
            .createSignedUrl(img.file_path, 3600);
          return {
            id: img.id,
            url: urlData?.signedUrl || "",
            prompt_uz: img.prompt_uz,
            prompt_en: img.prompt_en,
            aspect_ratio: img.aspect_ratio,
            created_at: img.created_at,
            file_path: img.file_path,
            style_preset: (img as any).style_preset,
          };
        })
      );

      setHistoryImages(imagesWithUrls);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsage();
    fetchHistory();
  }, [fetchUsage, fetchHistory]);

  // Check if limit reached
  const isLimitReached = !usage.isUnlimited && usage.used >= usage.limit;
  const remainingImages = usage.isUnlimited ? -1 : Math.max(0, usage.limit - usage.used);

  // Handle generate
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ 
        title: t("imageStudio.error"), 
        description: t("imageStudio.enterPrompt"), 
        variant: "destructive" 
      });
      return;
    }

    if (isLimitReached) {
      toast({ 
        title: t("imageStudio.limitReached"), 
        description: t("imageStudio.limitReachedDesc"), 
        variant: "destructive" 
      });
      return;
    }

    // Check if we have enough quota for requested images
    if (!usage.isUnlimited && (usage.used + numImages) > usage.limit) {
      toast({ 
        title: t("imageStudio.error"), 
        description: t("imageStudio.notEnoughQuota"), 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    setGeneratedImages([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ 
          title: t("imageStudio.error"), 
          description: t("imageStudio.pleaseLogin"), 
          variant: "destructive" 
        });
        return;
      }

      const newImages: GeneratedImage[] = [];

      // Generate images sequentially (Fireworks doesn't support batch)
      for (let i = 0; i < numImages; i++) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fireworks-generate-image`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              prompt: prompt.trim(),
              aspectRatio,
              renderMode: stylePreset === "realistic" ? "photo" : "illustration",
              qualityBoost,
              stylePreset,
              seed: seed ? parseInt(seed, 10) : undefined,
            }),
          }
        );

        const result = await response.json();

        if (!result.ok) {
          if (result.type === "LIMIT_REACHED") {
            toast({ 
              title: t("imageStudio.limitReached"), 
              description: t("imageStudio.limitReachedDesc"), 
              variant: "destructive" 
            });
            break;
          }
          throw new Error(result.error || t("imageStudio.error"));
        }

        newImages.push({
          id: crypto.randomUUID(),
          url: result.image_url,
          prompt_uz: result.prompt_original,
          prompt_en: result.prompt_final,
          aspect_ratio: result.aspect_ratio,
          created_at: new Date().toISOString(),
          file_path: result.file_path,
          style_preset: stylePreset,
        });

        // Update UI with each new image
        setGeneratedImages([...newImages]);
      }

      if (newImages.length > 0) {
        toast({
          title: t("imageStudio.success"),
          description: t("imageStudio.imagesSaved", { count: newImages.length }),
        });
      }

      // Refresh usage and history
      await Promise.all([fetchUsage(), fetchHistory()]);
    } catch (error) {
      console.error("Image generation error:", error);
      toast({
        title: t("imageStudio.error"),
        description: error instanceof Error ? error.message : t("imageStudio.genericError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle download
  const handleDownload = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.download = `bahorai-image-${timestamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: t("imageStudio.downloadStarted") });
    } catch (error) {
      console.error("Download error:", error);
      window.open(image.url, "_blank");
    }
  };

  // Handle send to chat
  const handleSendToChat = async (image: GeneratedImage) => {
    try {
      // Navigate to general chat and attach the image
      const caption = `🎨 ${image.prompt_uz || "Bahor AI orqali yaratilgan rasm"}`;
      
      // Store in sessionStorage for the chat page to pick up
      sessionStorage.setItem("pending_chat_image", JSON.stringify({
        url: image.url,
        file_path: image.file_path,
        caption,
      }));
      
      toast({ title: t("imageStudio.sentToChat") });
      navigate("/chat/general?attach=image");
      setSendToChatModal(null);
    } catch (error) {
      console.error("Send to chat error:", error);
      toast({
        title: t("imageStudio.error"),
        description: t("imageStudio.sendToChatFailed"),
        variant: "destructive",
      });
    }
  };

  // Handle re-generate with same settings
  const handleRegenerate = (image: GeneratedImage) => {
    setPrompt(image.prompt_uz);
    setAspectRatio(image.aspect_ratio || "1:1");
    if (image.style_preset) setStylePreset(image.style_preset);
    setActiveTab("create");
    toast({ title: t("imageStudio.settingsLoaded") });
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("imageStudio.time.justNow");
    if (diffMins < 60) return t("imageStudio.time.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("imageStudio.time.hoursAgo", { count: diffHours });
    if (diffDays === 1) return t("imageStudio.time.yesterday");
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                {t("imageStudio.title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("imageStudio.subtitle")}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Daily limit pill */}
              <Badge 
                variant={isLimitReached ? "destructive" : "secondary"}
                className="text-sm py-1 px-3"
              >
                {usage.isUnlimited ? (
                  <span>{t("imageStudio.unlimited")}</span>
                ) : (
                  <span>{t("imageStudio.dailyUsage", { used: usage.used, limit: usage.limit })}</span>
                )}
              </Badge>
              
              {/* Info tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">{t("imageStudio.rules")}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{t("imageStudio.createNew")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Prompt input */}
                <div className="space-y-2">
                  <Label>{t("imageStudio.promptLabel")}</Label>
                  <Textarea
                    placeholder={t("imageStudio.promptPlaceholder")}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
                    rows={4}
                    className="resize-none"
                    disabled={loading}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t("imageStudio.promptHelper")}</span>
                    <span>{prompt.length}/{MAX_PROMPT_LENGTH}</span>
                  </div>
                </div>

                {/* Style presets */}
                <div className="space-y-2">
                  <Label>{t("imageStudio.styleLabel")}</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {STYLE_PRESETS.map((style) => {
                      const Icon = style.icon;
                      const isSelected = stylePreset === style.id;
                      return (
                        <button
                          key={style.id}
                          onClick={() => setStylePreset(style.id)}
                          disabled={loading}
                          className={`
                            flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all
                            ${isSelected 
                              ? "border-primary bg-primary/5 ring-1 ring-primary" 
                              : "border-border hover:border-primary/50 hover:bg-accent/50"
                            }
                          `}
                        >
                          <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : style.color}`} />
                          <span className="text-xs font-medium truncate w-full text-center">
                            {t(style.labelKey)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Aspect ratio */}
                <div className="space-y-2">
                  <Label>{t("imageStudio.aspectLabel")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {ASPECT_RATIOS.map((ratio) => (
                      <Button
                        key={ratio.id}
                        variant={aspectRatio === ratio.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAspectRatio(ratio.id)}
                        disabled={loading}
                        className="min-w-[60px]"
                      >
                        <span>{ratio.label}</span>
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t(ASPECT_RATIOS.find(r => r.id === aspectRatio)?.description || "")}
                  </p>
                </div>

                {/* Number of images */}
                <div className="space-y-2">
                  <Label>{t("imageStudio.numImagesLabel")}</Label>
                  <div className="flex gap-2">
                    {NUM_IMAGES_OPTIONS.map((num) => (
                      <Button
                        key={num}
                        variant={numImages === num ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNumImages(num)}
                        disabled={loading || (!usage.isUnlimited && usage.used + num > usage.limit)}
                        className="min-w-[50px]"
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Advanced settings */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4" />
                        {t("imageStudio.advancedSettings")}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>{t("imageStudio.seedLabel")}</Label>
                      <Input
                        type="number"
                        placeholder={t("imageStudio.seedPlaceholder")}
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("imageStudio.seedHelper")}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">{t("imageStudio.qualityBoost")}</Label>
                        <p className="text-xs text-muted-foreground">{t("imageStudio.qualityBoostDesc")}</p>
                      </div>
                      <Button
                        variant={qualityBoost ? "default" : "outline"}
                        size="sm"
                        onClick={() => setQualityBoost(!qualityBoost)}
                        disabled={loading}
                      >
                        {qualityBoost ? <Check className="w-4 h-4" /> : t("imageStudio.off")}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Generate button */}
                <Button
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim() || isLimitReached}
                  className="w-full h-12 text-base"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t("imageStudio.generating")}
                    </>
                  ) : isLimitReached ? (
                    t("imageStudio.limitReachedBtn")
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      {t("imageStudio.generateBtn")}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Results + History */}
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "history")}>
              <TabsList className="w-full">
                <TabsTrigger value="create" className="flex-1">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {t("imageStudio.tabCurrent")}
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1">
                  <History className="w-4 h-4 mr-2" />
                  {t("imageStudio.tabHistory")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="mt-4">
                {loading ? (
                  // Loading skeletons
                  <div className={`grid gap-4 ${numImages > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                    {Array.from({ length: numImages }).map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <div className="aspect-square bg-muted animate-pulse flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              {t("imageStudio.generatingProgress", { current: i + 1, total: numImages })}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : generatedImages.length > 0 ? (
                  // Generated images
                  <div className={`grid gap-4 ${generatedImages.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                    {generatedImages.map((image) => (
                      <Card key={image.id} className="overflow-hidden group">
                        <div className="relative">
                          <img
                            src={image.url}
                            alt={image.prompt_uz}
                            className="w-full aspect-square object-cover cursor-pointer"
                            onClick={() => setLightboxImage(image.url)}
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={() => setLightboxImage(image.url)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={() => handleDownload(image)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={() => setSendToChatModal(image)}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <CardContent className="p-3">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {image.prompt_uz}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  // Empty state
                  <Card className="border-dashed">
                    <CardContent className="py-16 text-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                      <h3 className="font-medium text-foreground mb-1">
                        {t("imageStudio.emptyStateTitle")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("imageStudio.emptyStateDesc")}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                {historyLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-square rounded-lg" />
                    ))}
                  </div>
                ) : historyImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {historyImages.map((image) => (
                      <Card key={image.id} className="overflow-hidden group cursor-pointer">
                        <div className="relative" onClick={() => setLightboxImage(image.url)}>
                          <img
                            src={image.url}
                            alt={image.prompt_uz}
                            className="w-full aspect-square object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                            <div className="flex gap-1">
                              <Button variant="secondary" size="icon" className="h-8 w-8">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); handleDownload(image); }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); handleRegenerate(image); }}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); setSendToChatModal(image); }}
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <p className="text-xs text-white/80">
                              {formatRelativeTime(image.created_at)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-16 text-center">
                      <History className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                      <h3 className="font-medium text-foreground mb-1">
                        {t("imageStudio.historyEmpty")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("imageStudio.historyEmptyDesc")}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage}
          alt="Generated image"
          onClose={() => setLightboxImage(null)}
        />
      )}

      {/* Send to Chat Modal */}
      <Dialog open={!!sendToChatModal} onOpenChange={() => setSendToChatModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("imageStudio.sendToChatTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {sendToChatModal && (
              <img
                src={sendToChatModal.url}
                alt="Preview"
                className="w-full aspect-square object-cover rounded-lg"
              />
            )}
            <p className="text-sm text-muted-foreground">
              {t("imageStudio.sendToChatDesc")}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSendToChatModal(null)}
              >
                {t("imageStudio.cancel")}
              </Button>
              <Button
                className="flex-1"
                onClick={() => sendToChatModal && handleSendToChat(sendToChatModal)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {t("imageStudio.sendBtn")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
