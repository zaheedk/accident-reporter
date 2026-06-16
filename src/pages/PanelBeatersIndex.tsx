import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { MapPin, ArrowRight } from 'lucide-react';
import { slugifyLocation } from '@/lib/location-slug';

type Row = { city: string; region: string };

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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Panel Beaters in New Zealand',
    description: 'Directory of trusted panel beaters and collision repair shops across New Zealand by region and city.',
  };

  return (
    <AppLayout>
      <SEO
        title="Panel Beaters NZ — Find Trusted Collision Repair Shops"
        description="Browse 200+ rated panel beaters across New Zealand. Find approved collision repair shops by city or region — Auckland, Wellington, Christchurch and more."
        path="/panel-beaters"
        jsonLd={jsonLd}
      />
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-3">Panel Beaters in New Zealand</h1>
          <p className="text-muted-foreground max-w-2xl">
            Browse trusted, highly-rated panel beaters and collision repair shops across New Zealand. Pick your region or city to see local options with ratings, contact details and directions.
          </p>
        </header>

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
      </div>
    </AppLayout>
  );
}
