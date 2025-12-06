
-- Create a function to get space info by valid invite code
-- This allows non-members to see basic space info when they have a valid invite code
CREATE OR REPLACE FUNCTION public.get_space_by_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite space_invites%ROWTYPE;
  v_space spaces%ROWTYPE;
  v_owner_name text;
BEGIN
  -- Find the invite
  SELECT * INTO v_invite
  FROM space_invites
  WHERE code = UPPER(p_code)
    AND revoked = false;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invite_not_found');
  END IF;
  
  -- Get the space
  SELECT * INTO v_space
  FROM spaces
  WHERE id = v_invite.space_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'space_not_found');
  END IF;
  
  -- Get owner name
  SELECT COALESCE(
    NULLIF(TRIM(CONCAT(first_name, ' ', last_name)), ''),
    email,
    'Owner'
  ) INTO v_owner_name
  FROM profiles
  WHERE user_id = v_space.owner_id;
  
  RETURN jsonb_build_object(
    'id', v_space.id,
    'name', v_space.name,
    'template', v_space.template,
    'owner_name', v_owner_name,
    'invite_valid', true
  );
END;
$$;
