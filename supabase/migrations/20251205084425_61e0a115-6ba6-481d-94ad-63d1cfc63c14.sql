-- Update sync_plan_limits to handle beta_premium plan
CREATE OR REPLACE FUNCTION public.sync_plan_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Sync daily_limit when plan changes
  IF NEW.plan = 'free' THEN
    NEW.daily_limit := 5;
  ELSIF NEW.plan = 'beta_premium' THEN
    NEW.daily_limit := 10;
  ELSIF NEW.plan = 'premium' OR NEW.plan = 'monthly' THEN
    NEW.daily_limit := 200;
  ELSIF NEW.plan = 'ultra' OR NEW.plan = 'yearly' THEN
    NEW.daily_limit := 500;
  ELSIF NEW.plan = 'dev_unlimited' THEN
    NEW.daily_limit := -1;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Also fix existing beta_premium users who have wrong daily_limit
UPDATE profiles 
SET daily_limit = 10 
WHERE plan = 'beta_premium' AND daily_limit != 10;