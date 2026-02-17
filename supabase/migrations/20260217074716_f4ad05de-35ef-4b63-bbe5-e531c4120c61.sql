
-- Roles enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('doctor', 'nurse');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  insurance_provider TEXT,
  insurance_number TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read patients" ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Doctors can update patients" ON public.patients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Doctors can delete patients" ON public.patients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'doctor'));

-- Patient health categories
CREATE TABLE public.patient_health_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'normal',
  summary TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, category)
);
ALTER TABLE public.patient_health_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read health categories" ON public.patient_health_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert health categories" ON public.patient_health_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update health categories" ON public.patient_health_categories FOR UPDATE TO authenticated USING (true);

-- Appointments
CREATE TYPE public.appointment_type AS ENUM ('consultation', 'follow_up', 'procedure', 'check_up', 'urgent');

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  appointment_type appointment_type NOT NULL DEFAULT 'consultation',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read appointments" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "Authenticated can update appointments" ON public.appointments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete appointments" ON public.appointments FOR DELETE TO authenticated USING (auth.uid() = provider_id OR public.has_role(auth.uid(), 'doctor'));

-- Tasks
CREATE TYPE public.task_category AS ENUM ('clinical_review', 'client_communication', 'care_coordination', 'documentation_reporting');
CREATE TYPE public.task_priority AS ENUM ('urgent', 'high', 'medium', 'low');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done');

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category task_category NOT NULL,
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'todo',
  assigned_to UUID REFERENCES auth.users(id),
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  due_date DATE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'doctor'));

-- Clinical hours
CREATE TYPE public.patient_tier AS ENUM ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'children', 'onboarding', 'acute', 'case_management');

CREATE TABLE public.clinical_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  patient_tier patient_tier NOT NULL,
  hours NUMERIC(4,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clinical_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own clinical hours" ON public.clinical_hours FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clinical hours" ON public.clinical_hours FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clinical hours" ON public.clinical_hours FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clinical hours" ON public.clinical_hours FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Personal notes
CREATE TABLE public.personal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.personal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notes" ON public.personal_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.personal_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.personal_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.personal_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Visit notes
CREATE TABLE public.visit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES auth.users(id) NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint TEXT,
  notes TEXT,
  vitals JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read visit notes" ON public.visit_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert visit notes" ON public.visit_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "Authenticated can update visit notes" ON public.visit_notes FOR UPDATE TO authenticated USING (auth.uid() = provider_id OR public.has_role(auth.uid(), 'doctor'));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_personal_notes_updated_at BEFORE UPDATE ON public.personal_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
