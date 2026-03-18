
CREATE TABLE public.panel_shops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  google_rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  website TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Public directory, readable by anyone (no auth required)
ALTER TABLE public.panel_shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view panel shops"
ON public.panel_shops
FOR SELECT
TO public
USING (true);
