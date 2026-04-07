ALTER TABLE public.claims ADD COLUMN at_fault text NOT NULL DEFAULT '';
ALTER TABLE public.claims ADD COLUMN courtesy_car_requested boolean NOT NULL DEFAULT false;