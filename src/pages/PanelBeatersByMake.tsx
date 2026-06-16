import { useQuery } from '@tanstack/react-query';
import { Link, useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Star, ExternalLink, ArrowLeft } from 'lucide-react';
import { getMakeBySlug, NZ_CAR_MAKES } from '@/lib/car-makes';

type Shop = {
  id: string; name: string; address: string; city: string; region: string;
  phone: string; google_rating: number; website: string;
};

export default function PanelBeatersByMake() {
  const { make: makeSlug = '' } = useParams<{ make: string }>();
  const make = getMakeBySlug(makeSlug);

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ['panel-shops-for-make'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_shops')
        .select('id,name,address,city,region,phone,google_rating,website')
        .gte('google_rating', 4.5)
        .order('google_rating', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Shop[];
    },
  });

  if (!make) return <Navigate to="/panel-beaters-for" replace />;

  const title = `${make.name} Panel Beaters NZ — Approved Collision Repair`;
  const description = `Find panel beaters experienced with ${make.name} vehicles in New Zealand. Approved collision repair for ${make.popularModels.slice(0, 3).join(', ')} and more — compare ratings and contact details.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${make.name} Panel Beating & Collision Repair`,
    areaServed: { '@type': 'Country', name: 'New Zealand' },
    provider: { '@type': 'Organization', name: 'SAVO' },
    description,
  };

  return (
    <AppLayout>
      <SEO title={title} description={description} path={`/panel-beaters-for/${make.slug}`} jsonLd={jsonLd} />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Link to="/panel-beaters-for" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3 h-3" /> All makes
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-3">{make.name} Panel Beaters in New Zealand</h1>
          <p className="text-muted-foreground">{make.blurb}</p>
        </header>

        <section className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Popular {make.name} models we cover</h2>
          <div className="flex flex-wrap gap-1.5">
            {make.popularModels.map((m) => (
              <Badge key={m} variant="secondary">{make.name} {m}</Badge>
            ))}
          </div>
        </section>

        <h2 className="text-xl font-semibold text-foreground mb-3">Top-rated panel beaters for {make.name}</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-3">
            {shops.slice(0, 12).map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-foreground">{s.name}</h3>
                  {s.google_rating ? (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" /> {s.google_rating}
                    </Badge>
                  ) : null}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />{s.address}, {s.city}, {s.region}</p>
                  {s.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><a className="hover:underline" href={`tel:${s.phone}`}>{s.phone}</a></p>}
                </div>
                {s.website && (
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <a href={s.website} target="_blank" rel="noopener noreferrer">
                      Visit site <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}

        <section className="mt-10 prose prose-sm dark:prose-invert max-w-none">
          <h2>Why choose a {make.name}-experienced panel beater?</h2>
          <p>
            Modern vehicles use a mix of high-strength steels, aluminium and bonded structures. {make.name} repairs increasingly require specialist tools, OEM parts and manufacturer-approved procedures — especially for ADAS calibration after windscreen or bumper damage.
          </p>
          <h3>Before booking your repair</h3>
          <ul>
            <li>Confirm the shop has experience with {make.name} models.</li>
            <li>Ask whether they're an approved repairer on your insurer's panel.</li>
            <li>Check the warranty offered on paintwork and structural repairs.</li>
            <li>Request OEM (genuine) {make.name} parts if your policy allows.</li>
          </ul>
          <h3>Lodge your {make.name} insurance claim with SAVO</h3>
          <p>
            <Link to="/">SAVO</Link> helps Kiwi drivers capture accident photos, third-party details and a complete branded report to send straight to the insurer — speeding up the path from crash to repair.
          </p>
          <h3>Browse other makes</h3>
          <div className="flex flex-wrap gap-1.5 not-prose">
            {NZ_CAR_MAKES.filter((m) => m.slug !== make.slug).map((m) => (
              <Link key={m.slug} to={`/panel-beaters-for/${m.slug}`}>
                <Badge variant="outline" className="hover:bg-accent">{m.name}</Badge>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
