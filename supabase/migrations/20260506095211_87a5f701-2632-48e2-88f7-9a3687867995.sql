
-- Add Fatema to the family
INSERT INTO public.family_members (family_id, user_id, role)
VALUES ('5cb23d6d-2d04-4150-8852-f96235ff7d07', 'b8d54030-9a3f-45cb-b3b6-b132caca2eb1', 'member')
ON CONFLICT (user_id) DO NOTHING;

-- Mark the invite as accepted
UPDATE public.family_invites
SET status = 'accepted',
    accepted_by = 'b8d54030-9a3f-45cb-b3b6-b132caca2eb1',
    accepted_at = now()
WHERE id = '516167a7-0b95-4810-a59b-ddee2295db6d';
