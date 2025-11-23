import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

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

    uploadPhoto(file);
  };

  const uploadPhoto = (file: File) => {
    setUploading(true);
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const dataUrl = e.target?.result as string;
        
        // Save to localStorage
        localStorage.setItem("bahorai_user_avatar", dataUrl);
        
        toast({
          title: "✅ Muvaffaqiyatli!",
          description: "Profil rasmi yangilandi",
        });
        
        // Trigger parent refresh
        onPhotoUpdated();
      } catch (error: any) {
        console.error("Error saving avatar:", error);
        toast({
          title: "Xatolik",
          description: "Rasm saqlanmadi",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    
    reader.onerror = () => {
      toast({
        title: "Xatolik",
        description: "Rasm o'qilmadi",
        variant: "destructive",
      });
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    
    reader.readAsDataURL(file);
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
