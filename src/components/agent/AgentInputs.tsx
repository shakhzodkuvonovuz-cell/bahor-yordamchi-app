import { useState, useCallback } from "react";
import { 
  Upload, File, Link2, StickyNote, X, Loader2, Plus 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AgentFile {
  id: string;
  filename: string;
  mime_type?: string;
  size_bytes?: number;
  extraction_status: string;
  storage_path: string;
  extracted_text?: string;
}

interface AgentInputsProps {
  userId: string;
  files: AgentFile[];
  setFiles: React.Dispatch<React.SetStateAction<AgentFile[]>>;
  links: string[];
  setLinks: React.Dispatch<React.SetStateAction<string[]>>;
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  disabled?: boolean;
}

export function AgentInputs({
  userId,
  files,
  setFiles,
  links,
  setLinks,
  notes,
  setNotes,
  disabled = false,
}: AgentInputsProps) {
  const [newLink, setNewLink] = useState("");
  const [activeTab, setActiveTab] = useState("files");

  const handleFileUpload = useCallback(async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || !userId) return;

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
      const storagePath = `${userId}/agent/${tempId}-${file.name}`;

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
        const { error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        const { data: fileRecord, error: dbError } = await supabase
          .from("agent_files")
          .insert({
            user_id: userId,
            storage_path: storagePath,
            filename: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            extraction_status: "pending",
          })
          .select()
          .single();

        if (dbError) throw dbError;

        setFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? { ...f, id: fileRecord.id, extraction_status: "pending" }
              : f
          )
        );

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
  }, [userId, setFiles]);

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

  const totalInputs = files.length + links.length + (notes.trim() ? 1 : 0);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-3 w-full h-8">
        <TabsTrigger value="files" className="text-[11px] gap-1 h-7" disabled={disabled}>
          <File className="h-3 w-3" />
          <span className="hidden sm:inline">Fayllar</span>
          {files.length > 0 && <Badge variant="secondary" className="h-3.5 w-3.5 p-0 text-[9px] justify-center">{files.length}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="links" className="text-[11px] gap-1 h-7" disabled={disabled}>
          <Link2 className="h-3 w-3" />
          <span className="hidden sm:inline">Havolalar</span>
          {links.length > 0 && <Badge variant="secondary" className="h-3.5 w-3.5 p-0 text-[9px] justify-center">{links.length}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="notes" className="text-[11px] gap-1 h-7" disabled={disabled}>
          <StickyNote className="h-3 w-3" />
          <span className="hidden sm:inline">Eslatmalar</span>
        </TabsTrigger>
      </TabsList>

      <div className="mt-2 min-h-[100px]">
        <TabsContent value="files" className="mt-0 space-y-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              disabled={disabled}
              onClick={() => document.getElementById("agent-file-input")?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Fayl yuklash
            </Button>
            <input
              id="agent-file-input"
              type="file"
              accept=".pdf,.docx,.doc,.txt,.csv,.md,.jpg,.jpeg,.png,.webp"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
              disabled={disabled}
            />
            <span className="text-[10px] text-muted-foreground">
              PDF, DOCX, TXT, CSV, Rasmlar
            </span>
          </div>

          {files.length > 0 && (
            <div className="space-y-1.5 max-h-[120px] overflow-auto">
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
                    disabled={disabled}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="links" className="mt-0 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="https://..."
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
              className="flex-1 h-8 text-xs"
              disabled={disabled}
            />
            <Button onClick={handleAddLink} size="sm" className="h-8 text-xs" disabled={disabled}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {links.length > 0 && (
            <div className="space-y-1.5 max-h-[100px] overflow-auto">
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-muted/50">
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs truncate flex-1">{link}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-0">
          <Textarea
            placeholder="Qo'shimcha ma'lumotlar, talablar, yoki kontekst..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[80px] resize-none text-xs"
            disabled={disabled}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
