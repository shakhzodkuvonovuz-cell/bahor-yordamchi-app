-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create spaces" ON public.spaces;

-- Create a PERMISSIVE INSERT policy (default is permissive when using CREATE POLICY)
CREATE POLICY "Users can create spaces" 
ON public.spaces 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = owner_id);