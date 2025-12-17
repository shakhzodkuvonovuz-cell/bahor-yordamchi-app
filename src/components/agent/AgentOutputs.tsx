import { useState } from "react";
import { 
  Copy, FileDown, Save, Loader2, Check, ExternalLink, 
  Bot, Image, Download, ZoomIn, FileText, Table, Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AiResponseRenderer } from "@/components/ai/AiResponseRenderer";
import { downloadPDF } from "@/lib/pdfGenerator";
import { useTranslation } from "@/i18n/LanguageProvider";

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  goal?: string;
  sources?: any[];
}

interface GeneratedImage {
  url: string;
  stepIndex: number;
  stepTitle: string;
}

interface AgentRun {
  id: string;
  goal: string;
  status: string;
  final_output?: string | null;
  sources?: any;
  created_at: string;
}

interface AgentOutputsProps {
  currentRun: AgentRun | null;
  conversationHistory: ConversationTurn[];
  generatedImages: GeneratedImage[];
  userId: string;
  stepsCount: number;
  onSourceClick?: (source: any) => void;
}

export function AgentOutputs({
  currentRun,
  conversationHistory,
  generatedImages,
  userId,
  stepsCount,
  onSourceClick,
}: AgentOutputsProps) {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"document" | "table" | "code">("document");

  const handleCopyResult = () => {
    if (currentRun?.final_output) {
      navigator.clipboard.writeText(currentRun.final_output);
      toast.success(t('agent.copiedToClipboard'));
    }
  };

  const handleExportPDF = async () => {
    if (!currentRun?.final_output) return;
    
    try {
      toast.loading(t('agent.pdfPreparing'));
      
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
      toast.success(t('agent.pdfDownloaded'));
    } catch (error) {
      console.error("PDF export error:", error);
      toast.dismiss();
      toast.error(t('agent.pdfError'));
    }
  };

  const handleSaveToFiles = async () => {
    if (!currentRun?.final_output || !userId || isSaving) return;

    setIsSaving(true);
    try {
      const dateStr = new Date().toLocaleDateString("uz-UZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).replace(/\//g, "-");
      
      const mdContent = `# ${currentRun.goal}\n\n*${new Date().toLocaleString("uz-UZ")}*\n\n---\n\n${currentRun.final_output}`;
      
      const blob = new Blob([mdContent], { type: "text/markdown" });
      const fileName = `agent-${dateStr}-${currentRun.id.slice(0, 8)}.md`;
      const storagePath = `${userId}/agent-results/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(storagePath, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("user_files")
        .insert({
          user_id: userId,
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
            steps_count: stepsCount,
            images_count: generatedImages.length,
          },
        });

      if (dbError) throw dbError;

      toast.success(t('agent.savedToFiles'));
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(t('agent.saveError'));
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
      toast.success(t('agent.imageDownloaded'));
    } catch (error) {
      console.error("Download error:", error);
      toast.error(t('agent.downloadError'));
    }
  };

  // Extract tables and code blocks from content
  const hasTable = currentRun?.final_output?.includes("|");
  const hasCode = currentRun?.final_output?.includes("```");

  return (
    <div className="space-y-4">
      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="space-y-3">
          {conversationHistory.map((turn, i) => (
            <div 
              key={i}
              className={`rounded-lg p-3 text-sm ${
                turn.role === "user" 
                  ? "bg-primary/10 border border-primary/20 ml-8" 
                  : "bg-muted/50 border border-border/50 mr-4"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {turn.role === "user" ? (
                  <>
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-[10px] font-medium">{t('agent.outputs.you')}</span>
                    </div>
                    <span className="text-xs font-medium text-primary">{t('agent.outputs.question')}</span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <span className="text-xs font-medium">Bahor AI</span>
                    {turn.sources && turn.sources.length > 0 && (
                      <Badge variant="outline" className="text-[9px] h-4">
                        {turn.sources.length} {t('agent.outputs.source')}
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
            <span className="text-sm font-medium">{t('agent.outputs.generatedImages')}</span>
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

      {/* Final Output */}
      {currentRun?.final_output ? (
        <div className="space-y-4">
          {/* Header with actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1 text-[10px] bg-green-500/10 text-green-600">
                <Check className="h-2.5 w-2.5" />
                {t('agent.status.ready')}
              </Badge>
              {currentRun.sources && (currentRun.sources as any[]).length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {(currentRun.sources as any[]).length} {t('agent.outputs.source')}
                </Badge>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleCopyResult} className="gap-1 h-7 text-xs">
                <Copy className="h-3 w-3" />
                {t('agent.outputs.copy')}
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
                {isSaving ? t('agent.outputs.saving') : t('agent.outputs.save')}
              </Button>
            </div>
          </div>

          {/* Output View Tabs */}
          {(hasTable || hasCode) && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="h-7">
                <TabsTrigger value="document" className="text-[10px] gap-1 h-6">
                  <FileText className="h-3 w-3" />
                  {t('agent.outputs.document')}
                </TabsTrigger>
                {hasTable && (
                  <TabsTrigger value="table" className="text-[10px] gap-1 h-6">
                    <Table className="h-3 w-3" />
                    {t('agent.outputs.table')}
                  </TabsTrigger>
                )}
                {hasCode && (
                  <TabsTrigger value="code" className="text-[10px] gap-1 h-6">
                    <Code className="h-3 w-3" />
                    {t('agent.outputs.code')}
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          )}
          
          {/* Research Paper Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm bg-muted/30 rounded-lg p-4 border border-border/50">
            <AiResponseRenderer content={currentRun.final_output} />
          </div>
          
          {/* Sources Section */}
          {currentRun.sources && (currentRun.sources as any[]).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ExternalLink className="h-3 w-3" />
                {t('agent.sources')}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(currentRun.sources as any[]).slice(0, 8).map((source, i) => (
                  <button
                    key={i}
                    onClick={() => onSourceClick?.(source)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-full bg-muted hover:bg-muted/80 transition-colors truncate max-w-[200px]"
                  >
                    <span className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-medium shrink-0">
                      {i + 1}
                    </span>
                    <span className="truncate">{source.title || new URL(source.url).hostname}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : generatedImages.length === 0 && conversationHistory.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-xs">{t('agent.outputs.resultsWillShow')}</p>
        </div>
      ) : null}

      {/* Image Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/90 border-0">
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Full size"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}