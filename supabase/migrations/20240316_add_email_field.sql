-- Add email field to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create a function to sync email from auth.users
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_profiles
    SET email = NEW.email
    WHERE user_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync email from auth.users
DROP TRIGGER IF EXISTS sync_user_email_trigger ON auth.users;
CREATE TRIGGER sync_user_email_trigger
    AFTER INSERT OR UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_email();

-- Sync existing emails
UPDATE public.user_profiles
SET email = au.email
FROM auth.users au
WHERE user_profiles.user_id = au.id
AND user_profiles.email IS NULL;
