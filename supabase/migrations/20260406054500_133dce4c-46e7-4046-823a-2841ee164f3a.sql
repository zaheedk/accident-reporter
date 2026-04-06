DROP POLICY "Anyone can view tow companies" ON public.tow_companies;
CREATE POLICY "Anyone can view tow companies" ON public.tow_companies FOR SELECT TO anon, authenticated USING (true);