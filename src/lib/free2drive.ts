import { supabase } from '@/integrations/supabase/client';

export const F2D_PHONE = '0800 024 100';
export const F2D_TEL = 'tel:0800024100';

/** Tracked Free 2 Drive application link; `source` identifies the SAVO page. */
export const f2dApplyUrl = (source: string) =>
  `https://www.free2drive.co.nz/apply?utm_source=savo&utm_medium=referral&utm_campaign=booking&utm_content=${encodeURIComponent(source)}`;

/** Fire-and-forget click log so admins can count referrals per page. */
export function logF2DClick(source: string, action: 'apply' | 'call') {
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      await supabase.from('partner_referral_clicks' as any).insert({
        source: source.slice(0, 80),
        action,
        user_id: data.session?.user.id ?? null,
      });
    } catch { /* never block navigation */ }
  })();
}
