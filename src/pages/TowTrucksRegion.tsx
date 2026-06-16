import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, ArrowLeft } from 'lucide-react';
import { slugifyLocation, titleizeSlug } from '@/lib/location-slug';

type Tow = { id: string; name: string; address: string; phone: string; region: string };

export default function TowTrucksRegion() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data: all = [], isLoading } = useQuery({
    queryKey: ['tow-companies-public'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tow_companies').select('id,name,address,phone,region').order('name');
      if (error) throw error;
      return data as Tow[];
    },
  });

  const matches = all.filter((t) => slugifyLocation(t.region) === slug);
  const regionName = matches[0]?.region ?? titleizeSlug(slug);
  const title = `Tow Trucks in ${regionName} — 24/7 Towing Operators`;
  const description = `${matches.length || 'Trusted'} tow truck operators serving ${regionName}, New Zealand. Compare contact details and call directly after an accident or breakdown.`;

  return (
    <AppLayout>
      <SEO title={title} description={description} path={`/tow-trucks/${slug}`} noIndex={!isLoading && matches.length === 0} />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Link to="/tow-trucks" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3 h-3" /> All regions
        </Link>
        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-3">Tow Trucks in {regionName}</h1>
          <p className="text-muted-foreground">
            {matches.length > 0
              ? `${matches.length} towing operators serving ${regionName}. Remember: after an accident, you choose your tow operator — not the first truck on scene.`
              : `We don't currently have tow operators listed for ${regionName}. Browse all regions on our main directory.`}
          </p>
        </header>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-3">
            {matches.map((t) => (
              <Card key={t.id} className="p-4">
                <h2 className="text-lg font-semibold text-foreground mb-1">{t.name}</h2>
                <div className="text-sm text-muted-foreground space-y-1">
                  {t.address && <p className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />{t.address}</p>}
                  {t.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><a className="hover:underline" href={`tel:${t.phone}`}>{t.phone}</a></p>}
                </div>
                {t.phone && (
                  <Button asChild size="sm" className="mt-3">
                    <a href={`tel:${t.phone}`}>Call now</a>
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}

        <section className="mt-10 prose prose-sm dark:prose-invert max-w-none">
          <h2>Your towing rights in New Zealand</h2>
          <p>
            After a crash or breakdown in {regionName}, you are entitled to choose where your vehicle is towed. Don't feel pressured to sign anything at the roadside — confirm the destination, the storage fees, and whether your insurer has a preferred salvage yard.
          </p>
          <h3>Capture the incident with SAVO</h3>
          <p>
            Use SAVO to record photos, location, and third-party details before the tow leaves — then send a complete report to your insurer in minutes. <Link to="/">Sign up free</Link>.
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
