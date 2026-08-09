import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import ReplacementVehicleNote from '@/components/ReplacementVehicleNote';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowRight } from 'lucide-react';
import { slugifyLocation } from '@/lib/location-slug';
import { SAVO_ORIGIN } from '@/lib/panel-beaters-jsonld';

type Row = { city: string; region: string };

const FEATURED_CITIES = [
  'Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga',
  'Dunedin', 'Palmerston North', 'Napier', 'Nelson', 'Rotorua',
];

const FAQ = [
  {
    q: 'How do I choose a panel beater in New Zealand?',
    a: 'Start with your insurer\'s approved repairer network — choosing an approved shop usually means no excess on labour disputes and a faster claim. Outside the network, look for Google ratings of 4.5+, request quotes from two shops, and confirm the workshop has experience with your make. Our city pages list verified workshops with 4.5+ ratings.',
  },
  {
    q: 'Do I need three quotes for a panel beating insurance claim?',
    a: 'Not for most claims. NZ insurers typically accept a single quote from an approved repairer. Multiple quotes are only required when you pick a shop outside the insurer\'s panel or for higher-value claims where the insurer asks for them explicitly.',
  },
  {
    q: 'How much does panel beating cost in New Zealand?',
    a: 'Labour rates run $90–$140/hr depending on the city. Minor dent or scuff repair lands around $400–$900. Mid-sized collision repair (panel replacement + paint + blending) is typically $2,500–$7,000. Structural work, EV battery cases and European panels push higher.',
  },
  {
    q: 'How long do collision repairs take?',
    a: 'Simple cosmetic work: 2–4 working days. Mid-sized collision: 1–3 weeks. Structural straightening, suspension work or backordered parts (especially European and EV panels): 4–8 weeks.',
  },
];

export default function PanelBeatersIndex() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['panel-beaters-index'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_shops')
        .select('city, region')
        .gte('google_rating', 4.5);
      if (error) throw error;
      return data as Row[];
    },
  });

  const byRegion = new Map<string, Map<string, number>>();
  for (const r of data) {
    if (!r.region || !r.city) continue;
    if (!byRegion.has(r.region)) byRegion.set(r.region, new Map());
    const cities = byRegion.get(r.region)!;
    cities.set(r.city, (cities.get(r.city) ?? 0) + 1);
  }
  const regions = Array.from(byRegion.keys()).sort();
  const totalShops = data.length;
  const pageUrl = `${SAVO_ORIGIN}/panel-beaters`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#collection`,
        name: 'Panel Beaters in New Zealand',
        description: `Directory of ${totalShops || '200+'} verified panel beaters and collision repair shops across New Zealand by region and city.`,
        url: pageUrl,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SAVO_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Panel Beaters', item: pageUrl },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faq`,
        mainEntity: FAQ.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  return (
    <AppLayout>
      <SEO
        title="Panel Beaters NZ — Find Trusted Collision Repair Shops by City"
        description={`Browse ${totalShops || '200+'} verified panel beaters across New Zealand. Compare collision repair shops by city or region with ratings, contact details and instant quote requests.`}
        path="/panel-beaters"
        jsonLd={jsonLd}
      />
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-3">Panel Beaters in New Zealand</h1>
          <p className="text-muted-foreground max-w-2xl">
            We list {totalShops || '200+'} verified panel beaters across New Zealand — every shop carries a Google rating of 4.5 stars or higher. Pick your city or region to see ratings, contact details, insurer guidance and direct quote requests.
          </p>
        </header>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3">Featured cities</h2>
          <div className="flex flex-wrap gap-2">
            {FEATURED_CITIES.map((c) => (
              <Button key={c} asChild variant="outline" size="sm">
                <Link to={`/panel-beaters/${slugifyLocation(c)}`}>Panel beaters in {c}</Link>
              </Button>
            ))}
          </div>
        </section>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading directory…</p>
        ) : (
          <div className="space-y-8">
            {regions.map((region) => {
              const cities = Array.from(byRegion.get(region)!.entries()).sort();
              return (
                <section key={region}>
                  <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <Link to={`/panel-beaters/${slugifyLocation(region)}`} className="hover:underline">
                      {region}
                    </Link>
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {cities.map(([city, n]) => (
                      <Link key={city} to={`/panel-beaters/${slugifyLocation(city)}`}>
                        <Card className="p-3 hover:bg-accent transition-colors flex items-center justify-between text-sm">
                          <span className="text-foreground">{city}</span>
                          <span className="text-muted-foreground flex items-center gap-1">
                            {n} <ArrowRight className="w-3 h-3" />
                          </span>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <section className="mt-12">
          <h2 className="text-xl font-serif text-foreground mb-4">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <Card key={f.q} className="p-4">
                <h3 className="font-semibold text-foreground mb-1">{f.q}</h3>
                <p className="text-sm text-muted-foreground">{f.a}</p>
              </Card>
            ))}
          </div>
        </section>

        <ReplacementVehicleNote seed={'panel-beaters-hub'} />

        <section className="mt-10 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/tow-trucks">Tow trucks by region</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/panel-beaters-for/toyota">Panel beaters by vehicle make</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/blog">Claim guides &amp; resources</Link>
          </Button>
        </section>
      </div>
    </AppLayout>
  );
}
