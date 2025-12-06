import { useState, useEffect, useRef } from "react";
import { 
  Upload, FileText, Image, File, Trash2, Download, Eye, 
  Pin, PinOff, MoreVertical 
} from "lucide-react";
import { CircleTabSkeleton } from "./CircleTabSkeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, 
  DrawerFooter, DrawerClose 
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LanguageProvider";
import { toast } from "sonner";

interface SpaceFile {
  id: string;
  space_id: string;
  uploader_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  pinned: boolean;
  uploaderName?: string;
}

interface SpaceFilesTabProps {
  spaceId: string;
  isAdmin: boolean;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
];

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.txt";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="w-5 h-5 text-muted-foreground" />;
  if (mimeType.startsWith("image/")) return <Image className="w-5 h-5 text-blue-500" />;
  if (mimeType === "application/pdf") return <FileText className="w-5 h-5 text-red-500" />;
  if (mimeType.includes("word")) return <FileText className="w-5 h-5 text-blue-600" />;
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) 
    return <FileText className="w-5 h-5 text-green-600" />;
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) 
    return <FileText className="w-5 h-5 text-orange-500" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

function isPreviewable(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}

export default function SpaceFilesTab({ spaceId, isAdmin }: SpaceFilesTabProps) {
  const { user } = useAuth();
  const { language } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<SpaceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Preview modal
  const [previewFile, setPreviewFile] = useState<SpaceFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  // Delete confirmation
  const [deleteFile, setDeleteFile] = useState<SpaceFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("space_files")
        .select("*")
        .eq("space_id", spaceId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get uploader profiles
      const uploaderIds = [...new Set(data?.map((f) => f.uploader_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", uploaderIds);

      const profileMap = Object.fromEntries(
        (profiles || []).map((p) => [
          p.user_id,
          `${p.first_name || ""} ${p.last_name || ""}`.trim() || "User",
        ])
      );

      setFiles(
        (data || []).map((f) => ({
          ...f,
          uploaderName: profileMap[f.uploader_id] || "User",
        }))
      );
    } catch (err) {
      console.error("Error fetching files:", err);
      toast.error(language === "uz" ? "Xatolik yuz berdi" : "Error loading files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [spaceId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(language === "uz" ? "Bu fayl turi qo'llab-quvvatlanmaydi" : "File type not supported");
      return;
    }

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(language === "uz" ? "Fayl hajmi 10MB dan oshmasligi kerak" : "File size must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      const uuid = crypto.randomUUID();
      const storagePath = `spaces/${spaceId}/${user.id}/${uuid}-${file.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("space-files")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Insert DB record
      const { error: dbError } = await supabase.from("space_files").insert({
        space_id: spaceId,
        uploader_id: user.id,
        storage_path: storagePath,
        original_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      });

      if (dbError) throw dbError;

      toast.success(language === "uz" ? "Fayl yuklandi" : "File uploaded");
      fetchFiles();
    } catch (err) {
      console.error("Error uploading file:", err);
      toast.error(language === "uz" ? "Yuklashda xatolik" : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (file: SpaceFile) => {
    try {
      const { data, error } = await supabase.storage
        .from("space-files")
        .createSignedUrl(file.storage_path, 3600);

      if (error || !data?.signedUrl) throw error;

      // Fetch blob and download
      const response = await fetch(data.signedUrl);
      const blob = await response.blob();

      // Try Web Share API for mobile
      const shareFile = new window.File([blob], file.original_name, { 
        type: file.mime_type || "application/octet-stream" 
      });
      
      if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
        await navigator.share({ files: [shareFile] });
      } else {
        // Fallback: create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.original_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error downloading file:", err);
      toast.error(language === "uz" ? "Yuklab olishda xatolik" : "Download failed");
    }
  };

  const handlePreview = async (file: SpaceFile) => {
    try {
      const { data, error } = await supabase.storage
        .from("space-files")
        .createSignedUrl(file.storage_path, 3600);

      if (error || !data?.signedUrl) throw error;

      setPreviewUrl(data.signedUrl);
      setPreviewFile(file);
    } catch (err) {
      console.error("Error getting preview URL:", err);
      toast.error(language === "uz" ? "Xatolik yuz berdi" : "Error loading preview");
    }
  };

  const handleDelete = async () => {
    if (!deleteFile) return;

    setDeleting(true);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("space-files")
        .remove([deleteFile.storage_path]);

      if (storageError) throw storageError;

      // Delete DB record
      const { error: dbError } = await supabase
        .from("space_files")
        .delete()
        .eq("id", deleteFile.id);

      if (dbError) throw dbError;

      toast.success(language === "uz" ? "Fayl o'chirildi" : "File deleted");
      setDeleteFile(null);
      fetchFiles();
    } catch (err) {
      console.error("Error deleting file:", err);
      toast.error(language === "uz" ? "O'chirishda xatolik" : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleTogglePin = async (file: SpaceFile) => {
    try {
      const { error } = await supabase
        .from("space_files")
        .update({ pinned: !file.pinned })
        .eq("id", file.id);

      if (error) throw error;

      toast.success(file.pinned 
        ? (language === "uz" ? "Olib tashlandi" : "Unpinned")
        : (language === "uz" ? "Mahkamlandi" : "Pinned")
      );
      fetchFiles();
    } catch (err) {
      console.error("Error toggling pin:", err);
      toast.error(language === "uz" ? "Xatolik yuz berdi" : "Error");
    }
  };

  const canDelete = (file: SpaceFile) => file.uploader_id === user?.id || isAdmin;

  if (loading) {
    return <CircleTabSkeleton type="files" />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Upload Button */}
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          {uploading 
            ? (language === "uz" ? "Yuklanmoqda..." : "Uploading...")
            : (language === "uz" ? "Fayl yuklash" : "Upload file")
          }
        </Button>
      </div>

      {/* Files List */}
      {files.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{language === "uz" ? "Hali fayllar yo'q" : "No files yet"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {getFileIcon(file.mime_type)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {file.pinned && (
                    <Pin className="w-3 h-3 text-primary flex-shrink-0" />
                  )}
                  <p className="font-medium text-foreground truncate text-sm">
                    {file.original_name}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size_bytes)} · {file.uploaderName} · {new Date(file.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="flex-shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isPreviewable(file.mime_type) && (
                    <DropdownMenuItem onClick={() => handlePreview(file)}>
                      <Eye className="w-4 h-4 mr-2" />
                      {language === "uz" ? "Ko'rish" : "Preview"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleDownload(file)}>
                    <Download className="w-4 h-4 mr-2" />
                    {language === "uz" ? "Yuklab olish" : "Download"}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => handleTogglePin(file)}>
                      {file.pinned ? (
                        <>
                          <PinOff className="w-4 h-4 mr-2" />
                          {language === "uz" ? "Olib tashlash" : "Unpin"}
                        </>
                      ) : (
                        <>
                          <Pin className="w-4 h-4 mr-2" />
                          {language === "uz" ? "Mahkamlash" : "Pin"}
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  {canDelete(file) && (
                    <DropdownMenuItem 
                      onClick={() => setDeleteFile(file)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {language === "uz" ? "O'chirish" : "Delete"}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={() => { setPreviewFile(null); setPreviewUrl(""); }}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{previewFile?.original_name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewFile?.mime_type?.startsWith("image/") ? (
              <img
                src={previewUrl}
                alt={previewFile.original_name}
                className="max-w-full max-h-[70vh] mx-auto rounded-lg"
              />
            ) : previewFile?.mime_type === "application/pdf" ? (
              <iframe
                src={previewUrl}
                className="w-full h-[70vh] rounded-lg"
                title={previewFile.original_name}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Drawer */}
      <Drawer open={!!deleteFile} onOpenChange={(open) => !open && setDeleteFile(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {language === "uz" ? "Faylni o'chirish" : "Delete file"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <p className="text-muted-foreground text-sm">
              {language === "uz" 
                ? `"${deleteFile?.original_name}" faylini o'chirishni xohlaysizmi?`
                : `Are you sure you want to delete "${deleteFile?.original_name}"?`
              }
            </p>
          </div>
          <DrawerFooter className="flex-row gap-2">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1">
                {language === "uz" ? "Bekor qilish" : "Cancel"}
              </Button>
            </DrawerClose>
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting 
                ? (language === "uz" ? "O'chirilmoqda..." : "Deleting...")
                : (language === "uz" ? "O'chirish" : "Delete")
              }
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}