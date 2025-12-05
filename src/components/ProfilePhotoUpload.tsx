import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ProfilePhotoUploadProps {
  currentAvatarUrl: string | null;
  onPhotoUpdated: () => void;
}

export default function ProfilePhotoUpload({ currentAvatarUrl, onPhotoUpdated }: ProfilePhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('[Avatar] No file selected');
      return;
    }

    console.log('[Avatar] File selected:', file.name, file.type, file.size);

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Xatolik",
        description: "Rasm hajmi 5MB dan kichik bo'lishi kerak",
        variant: "destructive",
      });
      return;
    }

    // Validate file type - be more lenient for iOS which may report different MIME types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const isValidType = validTypes.includes(file.type) || file.type.startsWith('image/');
    
    if (!isValidType) {
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
      console.log('[Avatar] Starting upload...');
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('[Avatar] Auth error:', authError);
        throw new Error("Foydalanuvchi topilmadi");
      }

      console.log('[Avatar] User ID:', user.id);

      // Generate unique file path - always use jpg extension for simplicity
      const fileName = `avatar-${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;

      console.log('[Avatar] Uploading to path:', filePath);

      // Delete old avatar if exists (don't wait for it)
      if (currentAvatarUrl && currentAvatarUrl.includes('/avatars/')) {
        try {
          // Extract just the path after /avatars/
          const urlParts = currentAvatarUrl.split('/avatars/');
          if (urlParts[1]) {
            const oldPath = decodeURIComponent(urlParts[1].split('?')[0]); // Remove query params
            console.log('[Avatar] Deleting old avatar:', oldPath);
            await supabase.storage.from('avatars').remove([oldPath]);
          }
        } catch (e) {
          console.warn('[Avatar] Could not delete old avatar:', e);
          // Continue anyway
        }
      }

      // Upload new avatar
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('[Avatar] Upload error:', uploadError);
        throw new Error(uploadError.message);
      }

      console.log('[Avatar] Upload success:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('[Avatar] Public URL:', publicUrl);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[Avatar] Profile update error:', updateError);
        throw new Error(updateError.message);
      }

      console.log('[Avatar] Profile updated successfully');

      toast({
        title: "✅ Muvaffaqiyatli!",
        description: "Rasm yangilandi",
      });
      
      // Trigger parent refresh
      onPhotoUpdated();

    } catch (error: any) {
      console.error("[Avatar] Error uploading avatar:", error);
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

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[Avatar] Button clicked, opening file picker');
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* File input - iOS Safari compatible */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />

      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg z-10"
        disabled={uploading}
        onClick={handleClick}
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
