-- Allow authenticated users to read profiles for spaces/member display
-- This is safe because profiles only contain display info (name, avatar), no sensitive data

CREATE POLICY "Authenticated users can read profiles for display"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Drop the old restrictive policy that only allowed reading own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;