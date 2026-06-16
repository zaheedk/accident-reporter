import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { MapPin, ArrowRight } from 'lucide-react';
import { slugifyLocation } from '@/lib/location-slug';

export default function TowTrucksIndex() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['tow-trucks-index'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tow_companies').select('region');
      if (error) throw error;
      return data as { region: string }[];
    },
  });

  const counts = new Map<string, number>();
  for (const r of data) if (r.region) counts.set(r.region, (counts.get(r.region) ?? 0) + 1);
  const regions = Array.from(counts.entries()).sort();

  return (
    <AppLayout>
      <SEO
        title="Tow Trucks NZ — 24/7 Towing Companies by Region"
        description="Find trusted tow truck operators across New Zealand. Browse 24/7 towing companies by region — Auckland, Wellington, Canterbury and more."
        path="/tow-trucks"
      />
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-3">Tow Trucks in New Zealand</h1>
          <p className="text-muted-foreground max-w-2xl">
            After an accident or breakdown, you have the right to choose your own tow operator. Browse trusted towing companies by region below.
          </p>
        </header>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading directory…</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {regions.map(([region, n]) => (
              <Link key={region} to={`/tow-trucks/${slugifyLocation(region)}`}>
                <Card className="p-3 hover:bg-accent transition-colors flex items-center justify-between text-sm">
                  <span className="text-foreground flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-primary" />{region}</span>
                  <span className="text-muted-foreground flex items-center gap-1">{n} <ArrowRight className="w-3 h-3" /></span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
