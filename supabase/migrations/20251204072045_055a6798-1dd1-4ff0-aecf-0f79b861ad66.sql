-- Fix search_path for normalize_preview function
CREATE OR REPLACE FUNCTION public.normalize_preview(content text, max_length int DEFAULT 140)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cleaned text;
BEGIN
  -- Remove markdown formatting
  cleaned := regexp_replace(content, '\*\*|__|~~|`{1,3}|#{1,6}\s*|>\s*|\[([^\]]+)\]\([^)]+\)', '\1', 'g');
  -- Remove multiple whitespace/newlines
  cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
  -- Trim
  cleaned := trim(cleaned);
  -- Truncate with ellipsis
  IF length(cleaned) > max_length THEN
    cleaned := left(cleaned, max_length - 3) || '...';
  END IF;
  RETURN cleaned;
END;
$$;