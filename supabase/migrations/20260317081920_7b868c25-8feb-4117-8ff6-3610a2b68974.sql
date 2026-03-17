
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year TEXT NOT NULL DEFAULT '',
  make TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  rego_number TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  wof_expiry TEXT NOT NULL DEFAULT '',
  rego_expiry TEXT NOT NULL DEFAULT '',
  finance_arrangement BOOLEAN NOT NULL DEFAULT false,
  finance_details TEXT DEFAULT '',
  modified BOOLEAN NOT NULL DEFAULT false,
  modification_details TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vehicles" ON public.vehicles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own vehicles" ON public.vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vehicles" ON public.vehicles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vehicles" ON public.vehicles FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create claims table
CREATE TABLE public.claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  incident_date TEXT NOT NULL DEFAULT '',
  incident_time TEXT NOT NULL DEFAULT '',
  incident_location TEXT NOT NULL DEFAULT '',
  vehicle_usage TEXT NOT NULL DEFAULT '',
  journey_details TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  vehicle_id TEXT NOT NULL DEFAULT '',
  speed_before_braking TEXT NOT NULL DEFAULT '',
  third_parties JSONB NOT NULL DEFAULT '[]',
  other_property_damage TEXT NOT NULL DEFAULT '',
  other_property_owner TEXT NOT NULL DEFAULT '',
  witnesses JSONB NOT NULL DEFAULT '[]',
  police_attended BOOLEAN NOT NULL DEFAULT false,
  police_officer_details TEXT NOT NULL DEFAULT '',
  anyone_hurt BOOLEAN NOT NULL DEFAULT false,
  injury_details TEXT NOT NULL DEFAULT '',
  weather_condition TEXT NOT NULL DEFAULT '',
  road_condition TEXT NOT NULL DEFAULT '',
  driver_consumed_substance BOOLEAN NOT NULL DEFAULT false,
  substance_details TEXT NOT NULL DEFAULT '',
  blame_description TEXT NOT NULL DEFAULT '',
  liability_admitted BOOLEAN NOT NULL DEFAULT false,
  liability_details TEXT NOT NULL DEFAULT '',
  damage_description TEXT NOT NULL DEFAULT '',
  vehicle_towed BOOLEAN NOT NULL DEFAULT false,
  towing_company TEXT NOT NULL DEFAULT '',
  repairer_name TEXT NOT NULL DEFAULT '',
  repairer_phone TEXT NOT NULL DEFAULT '',
  repairer_address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own claims" ON public.claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own claims" ON public.claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own claims" ON public.claims FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own claims" ON public.claims FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
