import { useState, useEffect } from "react";
import { X, MessageSquare, FileText, Sparkles } from "lucide-react";
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
  }) => void;
  onCancel: () => void;
  sending: boolean;
}

export default function BahorContextPicker({
  spaceId,
  question,
  onSend,
  onCancel,
  sending,
}: BahorContextPickerProps) {
  const { language } = useTranslation();
  const [files, setFiles] = useState<SpaceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeMessages, setIncludeMessages] = useState(true);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

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
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleSend = () => {
    onSend({
      question,
      includeLastMessages: includeMessages,
      selectedFileIds,
    });
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return "📄";
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType === "application/pdf") return "📕";
    if (mimeType.includes("word")) return "📘";
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📗";
    if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📙";
    return "📄";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">
              {language === "uz" ? "Bahor konteksti" : "Bahor Context"}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Question Preview */}
        <div className="p-4 border-b border-border">
          <p className="text-xs text-muted-foreground mb-1">
            {language === "uz" ? "Savol:" : "Question:"}
          </p>
          <p className="text-sm text-foreground line-clamp-2">{question}</p>
        </div>

        {/* Context Options */}
        <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
          {/* Include Messages Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                {language === "uz"
                  ? "Oxirgi 30 ta xabarni qo'shish"
                  : "Include last 30 messages"}
              </span>
            </div>
            <Switch
              checked={includeMessages}
              onCheckedChange={setIncludeMessages}
            />
          </div>

          {/* File Selection */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                {language === "uz"
                  ? "Fayllarni tanlash"
                  : "Select files to use"}
              </span>
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground py-2">
                {language === "uz" ? "Yuklanmoqda..." : "Loading..."}
              </div>
            ) : files.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">
                {language === "uz"
                  ? "Hali fayllar yo'q"
                  : "No files available"}
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <label
                    key={file.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedFileIds.includes(file.id)}
                      onCheckedChange={() => toggleFile(file.id)}
                    />
                    <span className="text-base">{getFileIcon(file.mime_type)}</span>
                    <span className="text-sm text-foreground truncate flex-1">
                      {file.original_name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={sending}
          >
            {language === "uz" ? "Bekor qilish" : "Cancel"}
          </Button>
          <Button
            onClick={handleSend}
            className="flex-1 gap-2"
            disabled={sending}
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                {language === "uz" ? "Yuborilmoqda..." : "Sending..."}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {language === "uz" ? "Bahorga yuborish" : "Send to Bahor"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}