-- Drop old check constraint and create new one with all valid plan types
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_plan_values;

ALTER TABLE profiles ADD CONSTRAINT valid_plan_values 
  CHECK (plan IN ('free', 'beta_premium', 'dev_unlimited'));

-- Fix users with active trial but wrong plan
UPDATE profiles 
SET plan = 'beta_premium'
WHERE trial_expires_at > NOW() 
  AND plan = 'free'
  AND trial_started_at IS NOT NULL;