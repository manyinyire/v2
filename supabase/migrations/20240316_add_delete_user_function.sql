-- Create function to delete users by email
CREATE OR REPLACE FUNCTION delete_user_by_email(p_email TEXT)
RETURNS void AS $$
BEGIN
  -- Delete from auth.users
  DELETE FROM auth.users WHERE email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
