DO $$
DECLARE
  jayz_id uuid := '1614799a-55ca-495a-b41a-f510d4cefa11';
  jayz_creator uuid;
  beyonce_id uuid;
BEGIN
  SELECT created_by INTO jayz_creator FROM public.patients WHERE id = jayz_id;

  -- Update Jay-Z
  UPDATE public.patients SET
    date_of_birth = '1969-12-04',
    gender = 'Male',
    address = '123 Madison Avenue',
    city = 'New York',
    post_code = '10016',
    country = 'USA',
    email = 'shawn.carter@email.com',
    phone = '+1 212 555 0147',
    emergency_contact_name = 'Carter, Beyoncé',
    emergency_contact_phone = '+1 212 555 0192',
    insurance_provider = 'Aetna',
    insurance_number = 'AET-7734821',
    payer_same_as_patient = true,
    payer_name = NULL,
    billing_email = 'shawn.carter@email.com'
  WHERE id = jayz_id;

  -- Insert Beyoncé (only if not present)
  SELECT id INTO beyonce_id FROM public.patients WHERE full_name = 'Carter, Beyoncé' LIMIT 1;
  IF beyonce_id IS NULL THEN
    INSERT INTO public.patients (full_name, tier, created_by, created_at)
    VALUES ('Carter, Beyoncé', 'tier_1'::patient_tier, jayz_creator, '2026-02-18T09:11:41+00:00')
    RETURNING id INTO beyonce_id;
  END IF;

  -- Link as spouse both ways
  INSERT INTO public.patient_relationships (patient_id, related_patient_id, relationship_type, created_by)
  VALUES (jayz_id, beyonce_id, 'Spouse', jayz_creator)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.patient_relationships (patient_id, related_patient_id, relationship_type, created_by)
  VALUES (beyonce_id, jayz_id, 'Spouse', jayz_creator)
  ON CONFLICT DO NOTHING;
END $$;