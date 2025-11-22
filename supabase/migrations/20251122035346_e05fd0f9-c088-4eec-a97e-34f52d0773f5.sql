-- Add plan and usage tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS messages_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE;

-- Add check constraint for plan values
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_plan_values 
CHECK (plan IN ('free', 'monthly', 'yearly'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Update existing rows to have default values
UPDATE public.profiles 
SET plan = 'free', 
    messages_today = 0, 
    daily_limit = 5,
    last_reset_date = CURRENT_DATE
WHERE plan IS NULL;