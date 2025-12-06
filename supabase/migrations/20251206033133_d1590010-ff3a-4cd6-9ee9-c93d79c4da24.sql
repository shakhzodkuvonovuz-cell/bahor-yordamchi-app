-- Add requester snapshot fields to space_join_requests
ALTER TABLE public.space_join_requests
ADD COLUMN IF NOT EXISTS requester_name text,
ADD COLUMN IF NOT EXISTS requester_avatar_url text;