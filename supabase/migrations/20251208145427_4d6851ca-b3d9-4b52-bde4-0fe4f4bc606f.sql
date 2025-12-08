-- Remove the overly-permissive policies (service role bypasses RLS anyway)
DROP POLICY IF EXISTS "Service role can read tool_decisions" ON public.tool_decisions;
DROP POLICY IF EXISTS "Service role can insert tool_decisions" ON public.tool_decisions;

-- The "Users can read own tool_decisions" policy remains as the only SELECT policy
-- This ensures users can only see their own routing decisions