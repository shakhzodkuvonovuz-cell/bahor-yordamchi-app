import { useState } from "react";
import { Download, Trash2, AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DataManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DataManagementModal({ open, onOpenChange }: DataManagementModalProps) {
  const { language } = useTranslation();
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const labels = {
    title: language === "uz" ? "Ma'lumotlarni boshqarish" : "Data Management",
    export: language === "uz" ? "Ma'lumotlarni eksport qilish" : "Export Data",
    exportDesc: language === "uz" ? "Profil va suhbat tarixingizni JSON formatida yuklab oling" : "Download your profile and chat history as JSON",
    delete: language === "uz" ? "Ma'lumotlarni o'chirish" : "Delete Data",
    deleteDesc: language === "uz" ? "Barcha suhbatlar va ma'lumotlaringiz o'chiriladi" : "Delete all your chats and data",
    deleteWarning: language === "uz" 
      ? "Diqqat! Bu amalni qaytarib bo'lmaydi. Barcha suhbatlaringiz va ma'lumotlaringiz butunlay o'chiriladi."
      : "Warning! This action cannot be undone. All your chats and data will be permanently deleted.",
    confirmDelete: language === "uz" ? "Ha, o'chirish" : "Yes, delete",
    cancel: language === "uz" ? "Bekor qilish" : "Cancel",
    exporting: language === "uz" ? "Eksport qilinmoqda..." : "Exporting...",
    exportSuccess: language === "uz" ? "Ma'lumotlar yuklab olindi" : "Data exported",
    deleteSuccess: language === "uz" ? "Ma'lumotlar o'chirildi" : "Data deleted",
    error: language === "uz" ? "Xatolik yuz berdi" : "An error occurred",
  };

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);

    try {
      // Fetch user's threads
      const { data: threads } = await supabase
        .from("chat_threads")
        .select("*")
        .eq("user_id", user.id);

      // Fetch user's messages
      const { data: messages } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id);

      const exportData = {
        exportedAt: new Date().toISOString(),
        profile: {
          email: user.email,
          firstName: profile?.first_name,
          lastName: profile?.last_name,
          phone: profile?.phone,
          plan: profile?.plan,
          createdAt: profile?.created_at,
        },
        threads: threads || [],
        messages: messages || [],
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bahorai-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ description: labels.exportSuccess });
    } catch (error) {
      console.error("Export error:", error);
      toast({ description: labels.error, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);

    try {
      // Delete messages first (foreign key constraint)
      await supabase
        .from("chat_messages")
        .delete()
        .eq("user_id", user.id);

      // Delete threads
      await supabase
        .from("chat_threads")
        .delete()
        .eq("user_id", user.id);

      // Delete attachments
      await supabase
        .from("chat_attachments")
        .delete()
        .eq("user_id", user.id);

      // Clear local storage chat data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("bahorai_chat")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      toast({ description: labels.deleteSuccess });
      setShowDeleteConfirm(false);
      onOpenChange(false);

      // Optionally sign out after deletion
      // await signOut();
    } catch (error) {
      console.error("Delete error:", error);
      toast({ description: labels.error, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
        </DialogHeader>

        {showDeleteConfirm ? (
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{labels.deleteWarning}</p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
                disabled={deleting}
              >
                {labels.cancel}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="flex-1"
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {labels.confirmDelete}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Export */}
            <div className="p-4 bg-card border border-border/40 rounded-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium text-foreground">{labels.export}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{labels.exportDesc}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Delete */}
            <div className="p-4 bg-card border border-destructive/20 rounded-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium text-foreground">{labels.delete}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{labels.deleteDesc}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
