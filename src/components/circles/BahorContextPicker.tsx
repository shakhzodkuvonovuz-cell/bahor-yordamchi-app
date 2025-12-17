import { useState, useEffect } from "react";
import { X, MessageSquare, FileText, Sparkles, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n/LanguageProvider";

interface SpaceFile {
  id: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number | null;
}

interface BahorContextPickerProps {
  spaceId: string;
  question: string;
  onSend: (payload: {
    question: string;
    includeLastMessages: boolean;
    selectedFileIds: string[];
    searchWeb: boolean;
  }) => void;
  onCancel: () => void;
  sending: boolean;
}

// Detect if question wants web search
function wantsWebSearch(question: string): boolean {
  const q = question.toLowerCase();
  return /search|web|yangilik|news|google|qidir|internetdan|webdan/.test(q);
}

export default function BahorContextPicker({
  spaceId,
  question,
  onSend,
  onCancel,
  sending,
}: BahorContextPickerProps) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<SpaceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeMessages, setIncludeMessages] = useState(true);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [searchWeb, setSearchWeb] = useState(() => wantsWebSearch(question));

  useEffect(() => {
    fetchFiles();
  }, [spaceId]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from("space_files")
        .select("id, original_name, mime_type, size_bytes")
        .eq("space_id", spaceId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setFiles(data || []);
    } catch (err) {
      console.error("Error fetching files:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = (fileId: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const handleSend = () => {
    onSend({ question, includeLastMessages: includeMessages, selectedFileIds, searchWeb });
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return "📄";
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType === "application/pdf") return "📕";
    if (mimeType.includes("word")) return "📘";
    return "📄";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">
              {t('bahorContext.title')}
            </h3>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <p className="text-xs text-muted-foreground mb-1">{t('bahorContext.question')}</p>
          <p className="text-sm text-foreground line-clamp-2">{question}</p>
        </div>

        <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                {t('bahorContext.includeMessages')}
              </span>
            </div>
            <Switch checked={includeMessages} onCheckedChange={setIncludeMessages} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                {t('bahorContext.searchWeb')}
              </span>
            </div>
            <Switch checked={searchWeb} onCheckedChange={setSearchWeb} />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                {t('bahorContext.selectFiles')}
              </span>
            </div>
            {loading ? (
              <div className="text-sm text-muted-foreground py-2">{t('common.loading')}</div>
            ) : files.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">{t('common.noFiles')}</div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <label key={file.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors">
                    <Checkbox checked={selectedFileIds.includes(file.id)} onCheckedChange={() => toggleFile(file.id)} />
                    <span className="text-base">{getFileIcon(file.mime_type)}</span>
                    <span className="text-sm text-foreground truncate flex-1">{file.original_name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1" disabled={sending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSend} className="flex-1 gap-2" disabled={sending}>
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                {t('common.sending')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t('common.send')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
