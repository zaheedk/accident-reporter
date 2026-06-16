import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Mail, Star, ExternalLink, ArrowLeft } from 'lucide-react';
import { slugifyLocation, titleizeSlug } from '@/lib/location-slug';

type Shop = {
  id: string; name: string; address: string; city: string; region: string;
  phone: string; email: string; google_rating: number; website: string;
};

export default function PanelBeatersLocation() {
  const { slug = '' } = useParams<{ slug: string }>();

  const { data: all = [], isLoading } = useQuery({
    queryKey: ['panel-shops-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_shops')
        .select('id,name,address,city,region,phone,email,google_rating,website')
        .gte('google_rating', 4.5)
        .order('google_rating', { ascending: false });
      if (error) throw error;
      return data as Shop[];
    },
  });

  // Match by city slug first, fall back to region slug.
  const cityMatches = all.filter((s) => slugifyLocation(s.city) === slug);
  const regionMatches = all.filter((s) => slugifyLocation(s.region) === slug);
  const isCity = cityMatches.length > 0;
  const shops = isCity ? cityMatches : regionMatches;
  const locationName = isCity
    ? cityMatches[0].city
    : regionMatches[0]?.region ?? titleizeSlug(slug);
  const locationType = isCity ? 'city' : 'region';
  const region = isCity ? cityMatches[0].region : locationName;

  const title = `Panel Beaters in ${locationName} — ${shops.length || 'Top-rated'} Collision Repair Shops`;
  const description = `Find ${shops.length || 'top-rated'} trusted panel beaters in ${locationName}${isCity ? `, ${region}` : ''}. Compare ratings, contact details and directions for collision repair, dent removal and crash repair specialists.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    numberOfItems: shops.length,
    itemListElement: shops.slice(0, 20).map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'AutoBodyShop',
        name: s.name,
        address: { '@type': 'PostalAddress', streetAddress: s.address, addressLocality: s.city, addressRegion: s.region, addressCountry: 'NZ' },
        telephone: s.phone || undefined,
        url: s.website || undefined,
        aggregateRating: s.google_rating ? { '@type': 'AggregateRating', ratingValue: s.google_rating, bestRating: 5 } : undefined,
      },
    })),
  };

  return (
    <AppLayout>
      <SEO title={title} description={description} path={`/panel-beaters/${slug}`} jsonLd={jsonLd} noIndex={!isLoading && shops.length === 0} />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Link to="/panel-beaters" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3 h-3" /> All locations
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
            Panel Beaters in {locationName}
          </h1>
          <p className="text-muted-foreground">
            {shops.length > 0
              ? `${shops.length} trusted collision repair specialists serving ${locationName}${isCity ? `, ${region}` : ''}. All shops listed have verified ratings of 4.5 stars or higher.`
              : `We don't currently have verified panel beaters listed for ${locationName}. Browse nearby regions on our main directory.`}
          </p>
        </header>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-3">
            {shops.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="text-lg font-semibold text-foreground">{s.name}</h2>
                  {s.google_rating ? (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" /> {s.google_rating}
                    </Badge>
                  ) : null}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />{s.address}, {s.city}</p>
                  {s.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><a className="hover:underline" href={`tel:${s.phone}`}>{s.phone}</a></p>}
                  {s.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /><a className="hover:underline" href={`mailto:${s.email}`}>{s.email}</a></p>}
                </div>
                <div className="flex gap-2 mt-3">
                  {s.website && (
                    <Button asChild variant="outline" size="sm">
                      <a href={s.website} target="_blank" rel="noopener noreferrer">
                        Visit site <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${s.address}, ${s.city}`)}`} target="_blank" rel="noopener noreferrer">
                      Directions
                    </a>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <section className="mt-10 prose prose-sm dark:prose-invert max-w-none">
          <h2>About panel beaters in {locationName}</h2>
          <p>
            Panel beaters in {locationName} handle collision repair, paintwork, dent removal and structural straightening for vehicles damaged in accidents. Choosing a reputable, well-rated workshop is critical for safe repairs and to protect your insurance claim — most insurers require quotes from approved repairers before authorising work.
          </p>
          <h3>How to choose the right repairer</h3>
          <ul>
            <li>Check Google reviews and confirm the rating is genuine.</li>
            <li>Ask whether the shop is an approved repairer for your insurer.</li>
            <li>Request a written quote that itemises parts and labour.</li>
            <li>Confirm the warranty offered on repairs and paintwork.</li>
          </ul>
          <h3>Lodge your claim faster with SAVO</h3>
          <p>
            SAVO helps New Zealand drivers capture accident details on the spot — photos, third-party info, location, and a branded report you can send straight to your insurer. <Link to="/">Get started for free</Link>.
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
