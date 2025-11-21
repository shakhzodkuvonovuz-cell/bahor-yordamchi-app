import { useState, useRef } from "react";
import { Camera, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProfilePhotoUploadProps {
  currentAvatarUrl: string | null;
  onPhotoUpdated: () => void;
}

export default function ProfilePhotoUpload({ currentAvatarUrl, onPhotoUpdated }: ProfilePhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      toast({
        title: "Xatolik",
        description: "Rasm hajmi 3MB dan kichik bo'lishi kerak",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Xatolik",
        description: "Faqat rasm yuklash mumkin",
        variant: "destructive",
      });
      return;
    }

    await uploadPhoto(file);
  };

  const uploadPhoto = async (file: File) => {

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Delete old avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "✅ Muvaffaqiyatli!",
        description: "Profil rasmi yangilandi",
      });

      onPhotoUpdated();
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Xatolik",
        description: error.message || "Rasm yuklanmadi",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />

      <Button
        variant="ghost"
        size="icon"
        className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Camera className="w-4 h-4" />
        )}
      </Button>
    </>
  );
}
