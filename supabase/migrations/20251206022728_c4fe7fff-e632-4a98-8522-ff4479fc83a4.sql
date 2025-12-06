-- First, ensure the trigger exists to auto-add owner as space_member
DROP TRIGGER IF EXISTS on_space_created ON public.spaces;

CREATE TRIGGER on_space_created
  AFTER INSERT ON public.spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_space();

-- Drop all existing spaces policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can create spaces" ON public.spaces;
DROP POLICY IF EXISTS "Members can view their spaces" ON public.spaces;
DROP POLICY IF EXISTS "Admins can update spaces" ON public.spaces;
DROP POLICY IF EXISTS "Owner can delete space" ON public.spaces;

-- INSERT: authenticated users can insert if they set owner_id = their own id
CREATE POLICY "Users can create spaces" 
ON public.spaces 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- SELECT: users can see spaces they own OR are members of
CREATE POLICY "Users can view their spaces" 
ON public.spaces 
FOR SELECT 
TO authenticated
USING (auth.uid() = owner_id OR is_space_member(id));

-- UPDATE: only owner can update
CREATE POLICY "Owner can update space" 
ON public.spaces 
FOR UPDATE 
TO authenticated
USING (auth.uid() = owner_id);

-- DELETE: only owner can delete
CREATE POLICY "Owner can delete space" 
ON public.spaces 
FOR DELETE 
TO authenticated
USING (auth.uid() = owner_id);