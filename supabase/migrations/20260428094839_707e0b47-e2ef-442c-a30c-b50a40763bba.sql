-- Create demo user for Foundation Clinic
DO $$
DECLARE
  demo_user_id uuid;
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM auth.users WHERE email = 'demo@foundation.clinic';
  IF existing_id IS NULL THEN
    demo_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      demo_user_id, 'authenticated', 'authenticated',
      'demo@foundation.clinic',
      crypt('FoundationDemo2026', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Dr. Laine"}',
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), demo_user_id,
      jsonb_build_object('sub', demo_user_id::text, 'email', 'demo@foundation.clinic'),
      'email', demo_user_id::text, now(), now(), now());
  ELSE
    demo_user_id := existing_id;
  END IF;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (demo_user_id, 'Dr. Laine')
  ON CONFLICT (user_id) DO UPDATE SET full_name = 'Dr. Laine';

  INSERT INTO public.user_roles (user_id, role)
  VALUES (demo_user_id, 'doctor')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;