import React, { useState } from "react";
import { Download, Eye, Trash2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";

interface UserFile {
  id: string;
  title: string;
  tool: string;
  mime_type: string;
  size_bytes: number | null;
  created_at: string;
  signed_url?: string;
  bucket?: string;
  path?: string;
}

interface FileActionsSheetProps {
  file: UserFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function FileActionsSheet({ file, open, onOpenChange, onDeleted }: FileActionsSheetProps) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const t = (key: string) => {
    const labels: Record<string, Record<string, string>> = {
      uz: {
        actions: "Amallar",
        download: "Yuklab olish",
        preview: "Ko'rish",
        delete: "O'chirish",
        deleteConfirmTitle: "Fayl o'chirilsinmi?",
        deleteConfirmDesc: "Bu amalni qaytarib bo'lmaydi.",
        cancel: "Bekor qilish",
        confirm: "O'chirish",
        downloadSuccess: "Fayl yuklab olindi",
        deleteSuccess: "Fayl o'chirildi",
        error: "Xatolik yuz berdi",
      },
      en: {
        actions: "Actions",
        download: "Download",
        preview: "Preview",
        delete: "Delete",
        deleteConfirmTitle: "Delete this file?",
        deleteConfirmDesc: "This action cannot be undone.",
        cancel: "Cancel",
        confirm: "Delete",
        downloadSuccess: "File downloaded",
        deleteSuccess: "File deleted",
        error: "An error occurred",
      },
      ru: {
        actions: "Действия",
        download: "Скачать",
        preview: "Просмотр",
        delete: "Удалить",
        deleteConfirmTitle: "Удалить этот файл?",
        deleteConfirmDesc: "Это действие нельзя отменить.",
        cancel: "Отмена",
        confirm: "Удалить",
        downloadSuccess: "Файл скачан",
        deleteSuccess: "Файл удалён",
        error: "Произошла ошибка",
      },
      tr: {
        actions: "İşlemler",
        download: "İndir",
        preview: "Önizle",
        delete: "Sil",
        deleteConfirmTitle: "Bu dosya silinsin mi?",
        deleteConfirmDesc: "Bu işlem geri alınamaz.",
        cancel: "İptal",
        confirm: "Sil",
        downloadSuccess: "Dosya indirildi",
        deleteSuccess: "Dosya silindi",
        error: "Bir hata oluştu",
      },
    };
    return labels[language]?.[key] || labels.en[key] || key;
  };

  const handleDownload = async () => {
    if (!file?.signed_url) return;
    setDownloading(true);

    try {
      // Fetch the file as blob
      const response = await fetch(file.signed_url);
      if (!response.ok) throw new Error("Failed to fetch file");
      
      const blob = await response.blob();
      const filename = `${file.title}.pdf`;
      
      // Try Web Share API on mobile (iOS "Save to Files")
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: file.mime_type })] })) {
        const fileObj = new File([blob], filename, { type: file.mime_type });
        try {
          await navigator.share({
            files: [fileObj],
            title: file.title,
          });
          toast({ title: t("downloadSuccess") });
          onOpenChange(false);
          return;
        } catch (shareError) {
          // User cancelled or share failed, fall through to download
          if ((shareError as Error).name === "AbortError") {
            setDownloading(false);
            return;
          }
        }
      }

      // Fallback: Desktop-style download via anchor
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: t("downloadSuccess") });
      onOpenChange(false);
    } catch (error) {
      console.error("Download failed:", error);
      toast({ title: t("error"), variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handlePreview = () => {
    setShowPreview(true);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!file) return;
    setDeleting(true);

    try {
      // Delete from storage if we have bucket/path info
      // Files are in user-files bucket with path like {user_id}/{file_id}.pdf
      const { error: storageError } = await supabase.storage
        .from("user-files")
        .remove([file.path || `${file.id}.pdf`]);

      if (storageError) {
        console.warn("Storage deletion warning:", storageError);
        // Continue even if storage fails (file might already be deleted)
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("user_files")
        .delete()
        .eq("id", file.id);

      if (dbError) throw dbError;

      toast({ title: t("deleteSuccess") });
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      console.error("Delete failed:", error);
      toast({ title: t("error"), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (!file) return null;

  return (
    <>
      {/* Actions Drawer */}
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t("actions")}</DrawerTitle>
            <DrawerDescription className="truncate">{file.title}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              {t("download")}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={handlePreview}
            >
              <Eye className="h-5 w-5" />
              {t("preview")}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-5 w-5" />
              {t("delete")}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Drawer */}
      <Drawer open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t("deleteConfirmTitle")}</DrawerTitle>
            <DrawerDescription>{t("deleteConfirmDesc")}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {t("confirm")}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="truncate pr-8">{file.title}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={() => setShowPreview(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {file.signed_url && file.mime_type === "application/pdf" ? (
              <iframe
                src={file.signed_url}
                className="w-full h-[calc(85vh-60px)] border-0"
                title={file.title}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {language === "uz" ? "Ko'rishni iloji yo'q" : "Preview not available"}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
