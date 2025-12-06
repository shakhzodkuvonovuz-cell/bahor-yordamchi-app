
-- ============================================
-- SPACES FOUNDATION: Tables + RLS + Functions
-- ============================================

-- 1) SPACES TABLE
CREATE TABLE public.spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  template text DEFAULT 'general' CHECK (template IN ('study', 'work', 'family', 'creator', 'biz', 'gaming', 'general')),
  goal text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) SPACE_MEMBERS TABLE
CREATE TABLE public.space_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(space_id, user_id)
);

-- 3) SPACE_INVITES TABLE
CREATE TABLE public.space_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  code text NOT NULL UNIQUE,
  revoked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 4) SPACE_JOIN_REQUESTS TABLE
CREATE TABLE public.space_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  invite_code text NOT NULL,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'blocked')),
  note text,
  created_at timestamptz DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  UNIQUE(space_id, requester_id)
);

-- 5) SPACE_MESSAGES TABLE
CREATE TABLE public.space_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'file', 'system', 'ai')),
  content text,
  file_id uuid,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- HELPER FUNCTIONS (Security Definer)
-- ============================================

-- Check if user is an active member of a space
CREATE OR REPLACE FUNCTION public.is_space_member(_space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_id = _space_id
      AND user_id = auth.uid()
      AND status = 'active'
  )
$$;

-- Check if user is owner or admin of a space
CREATE OR REPLACE FUNCTION public.is_space_admin(_space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_id = _space_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
  )
$$;

-- ============================================
-- AUTO-ADD OWNER AS MEMBER TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_space()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.space_members (space_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_space_created
  AFTER INSERT ON public.spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_space();

-- Updated_at trigger for spaces
CREATE TRIGGER update_spaces_updated_at
  BEFORE UPDATE ON public.spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: SPACES
-- ============================================

CREATE POLICY "Members can view their spaces"
  ON public.spaces FOR SELECT
  USING (public.is_space_member(id));

CREATE POLICY "Users can create spaces"
  ON public.spaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins can update spaces"
  ON public.spaces FOR UPDATE
  USING (public.is_space_admin(id));

CREATE POLICY "Owner can delete space"
  ON public.spaces FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================
-- RLS POLICIES: SPACE_MEMBERS
-- ============================================

CREATE POLICY "Members can view members of their spaces"
  ON public.space_members FOR SELECT
  USING (public.is_space_member(space_id));

CREATE POLICY "Admins can add members"
  ON public.space_members FOR INSERT
  WITH CHECK (public.is_space_admin(space_id));

CREATE POLICY "Admins can update members"
  ON public.space_members FOR UPDATE
  USING (public.is_space_admin(space_id));

CREATE POLICY "Admins can remove members"
  ON public.space_members FOR DELETE
  USING (public.is_space_admin(space_id));

-- ============================================
-- RLS POLICIES: SPACE_INVITES
-- ============================================

CREATE POLICY "Admins can view invites"
  ON public.space_invites FOR SELECT
  USING (public.is_space_admin(space_id));

CREATE POLICY "Admins can create invites"
  ON public.space_invites FOR INSERT
  WITH CHECK (public.is_space_admin(space_id) AND auth.uid() = created_by);

CREATE POLICY "Admins can revoke invites"
  ON public.space_invites FOR UPDATE
  USING (public.is_space_admin(space_id));

-- ============================================
-- RLS POLICIES: SPACE_JOIN_REQUESTS
-- ============================================

CREATE POLICY "Users can view their own requests"
  ON public.space_join_requests FOR SELECT
  USING (auth.uid() = requester_id);

CREATE POLICY "Admins can view requests for their spaces"
  ON public.space_join_requests FOR SELECT
  USING (public.is_space_admin(space_id));

CREATE POLICY "Authenticated users can create join requests"
  ON public.space_join_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Admins can review requests"
  ON public.space_join_requests FOR UPDATE
  USING (public.is_space_admin(space_id));

-- ============================================
-- RLS POLICIES: SPACE_MESSAGES
-- ============================================

CREATE POLICY "Members can view messages"
  ON public.space_messages FOR SELECT
  USING (public.is_space_member(space_id));

CREATE POLICY "Members can send messages"
  ON public.space_messages FOR INSERT
  WITH CHECK (public.is_space_member(space_id) AND auth.uid() = sender_id);

CREATE POLICY "Sender or admin can update messages"
  ON public.space_messages FOR UPDATE
  USING (auth.uid() = sender_id OR public.is_space_admin(space_id));

CREATE POLICY "Sender or admin can delete messages"
  ON public.space_messages FOR DELETE
  USING (auth.uid() = sender_id OR public.is_space_admin(space_id));

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_space_members_space_id ON public.space_members(space_id);
CREATE INDEX idx_space_members_user_id ON public.space_members(user_id);
CREATE INDEX idx_space_invites_code ON public.space_invites(code);
CREATE INDEX idx_space_join_requests_space_id ON public.space_join_requests(space_id);
CREATE INDEX idx_space_join_requests_requester_id ON public.space_join_requests(requester_id);
CREATE INDEX idx_space_messages_space_id ON public.space_messages(space_id);
CREATE INDEX idx_space_messages_created_at ON public.space_messages(space_id, created_at DESC);
