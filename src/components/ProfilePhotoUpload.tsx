import { useState, useRef } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n/LanguageProvider";
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
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
        title: t('common.error'),
        description: t('profilePhoto.sizeError'),
        variant: "destructive",
      });
      return;
    }

    // Validate file type - be more lenient for iOS which may report different MIME types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const isValidType = validTypes.includes(file.type) || file.type.startsWith('image/');
    
    if (!isValidType) {
      toast({
        title: t('common.error'),
        description: t('profilePhoto.typeError'),
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
        throw new Error(t('common.userNotFound'));
      }

      console.log('[Avatar] User ID:', user.id);

      // Generate unique file path - always use jpg extension for simplicity
      const fileName = `avatar-${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;

      console.log('[Avatar] Uploading to path:', filePath);

      // Delete old avatar if exists (don't wait for it)
      if (currentAvatarUrl && currentAvatarUrl.includes('/avatars/')) {
        try {
          const urlParts = currentAvatarUrl.split('/avatars/');
          if (urlParts[1]) {
            const oldPath = decodeURIComponent(urlParts[1].split('?')[0]);
            console.log('[Avatar] Deleting old avatar:', oldPath);
            await supabase.storage.from('avatars').remove([oldPath]);
          }
        } catch (e) {
          console.warn('[Avatar] Could not delete old avatar:', e);
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
        title: t('profilePhoto.uploadSuccess'),
        description: t('profilePhoto.photoUpdated'),
      });
      
      onPhotoUpdated();

    } catch (error: any) {
      console.error("[Avatar] Error uploading avatar:", error);
      toast({
        title: t('common.error'),
        description: error.message || t('profilePhoto.uploadFailed'),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const deletePhoto = async () => {
    if (!currentAvatarUrl || !currentAvatarUrl.includes('/avatars/')) {
      toast({
        title: t('common.info'),
        description: t('profilePhoto.noPhotoToDelete'),
      });
      return;
    }

    setDeleting(true);
    
    try {
      console.log('[Avatar] Starting delete...');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error(t('common.userNotFound'));
      }

      // Delete from storage
      const urlParts = currentAvatarUrl.split('/avatars/');
      if (urlParts[1]) {
        const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
        console.log('[Avatar] Deleting file:', filePath);
        
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([filePath]);

        if (deleteError) {
          console.error('[Avatar] Storage delete error:', deleteError);
          // Continue anyway - file might not exist
        }
      }

      // Clear avatar URL in profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[Avatar] Profile update error:', updateError);
        throw new Error(updateError.message);
      }

      console.log('[Avatar] Photo deleted successfully');

      toast({
        title: t('profilePhoto.deleteSuccess'),
        description: t('profilePhoto.photoDeleted'),
      });
      
      onPhotoUpdated();

    } catch (error: any) {
      console.error("[Avatar] Error deleting avatar:", error);
      toast({
        title: t('common.error'),
        description: error.message || t('profilePhoto.deleteFailed'),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleUploadClick = () => {
    console.log('[Avatar] Upload option clicked');
    fileInputRef.current?.click();
  };

  const isLoading = uploading || deleting;
  const hasPhoto = currentAvatarUrl && currentAvatarUrl.includes('/avatars/');

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isLoading}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg z-10"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleUploadClick}>
            <Camera className="w-4 h-4 mr-2" />
            {t('profilePhoto.uploadPhoto')}
          </DropdownMenuItem>
          {hasPhoto && (
            <DropdownMenuItem onClick={deletePhoto} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              {t('profilePhoto.deletePhoto')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}