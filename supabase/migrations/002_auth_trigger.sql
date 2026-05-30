-- Trigger function to run when a user is created in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- 1. Create a new organization for the user
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(new.raw_user_meta_data->>'company_name', 'My Organization'))
  RETURNING id INTO new_org_id;

  -- 2. Create the profile for the user, linking to the organization
  INSERT INTO public.profiles (id, org_id, full_name, email, role)
  VALUES (
    new.id,
    new_org_id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New Member'),
    new.email,
    'owner'
  );

  -- 3. Create default user settings
  INSERT INTO public.user_settings (user_id, org_id, default_model)
  VALUES (
    new.id,
    new_org_id,
    'google/gemini-2.5-flash'
  );

  -- 4. Create default ICP definition
  INSERT INTO public.icp_definitions (org_id, name, criteria, is_default)
  VALUES (
    new_org_id,
    'Standard Service ICP',
    '{"industries":[],"company_sizes":[],"locations":[],"job_titles":[]}'::jsonb,
    TRUE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
