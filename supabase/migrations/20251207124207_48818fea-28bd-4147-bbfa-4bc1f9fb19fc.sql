-- Add icon_emoji and icon_color columns to spaces table for circle customization
ALTER TABLE public.spaces 
ADD COLUMN icon_emoji text DEFAULT '💬',
ADD COLUMN icon_color text DEFAULT NULL;

-- No RLS changes needed - existing policies already allow owner to create/update