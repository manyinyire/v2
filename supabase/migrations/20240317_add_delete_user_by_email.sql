-- Create a function to delete a user by email
CREATE OR REPLACE FUNCTION public.delete_user_by_email(p_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  -- If user exists, delete from auth.users
  IF v_user_id IS NOT NULL THEN
    -- Delete associated data first
    DELETE FROM auth.sessions WHERE user_id = v_user_id;
    DELETE FROM auth.refresh_tokens WHERE user_id = v_user_id;
    DELETE FROM auth.mfa_factors WHERE user_id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;
END;
$$;
