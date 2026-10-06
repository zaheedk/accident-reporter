import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import ReplacementVehicleNote from '@/components/ReplacementVehicleNote';
import LegalDisclaimer from '@/components/LegalDisclaimer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Mail, Star, ExternalLink, ArrowLeft, Clock, Wrench, Scale } from 'lucide-react';
import { slugifyLocation } from '@/lib/location-slug';
import { SAVO_ORIGIN } from '@/lib/panel-beaters-jsonld';

type Shop = {
  id: string; name: string; address: string; city: string; region: string;
  phone: string; email: string; google_rating: number; website: string;
  opening_hours: string; services: string[]; photo_url: string; review_count: number; description: string;
};

export default function PanelShopDetail() {
  const { slug = '', shop: shopSlug = '' } = useParams<{ slug: string; shop: string }>();

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ['panel-shops-public-detail'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_shops')
        .select('id,name,address,city,region,phone,email,google_rating,website,opening_hours,services,photo_url,review_count,description')
        .gte('google_rating', 4.5)
        .order('google_rating', { ascending: false });
      if (error) throw error;
      return data as unknown as Shop[];
    },
  });

  const s = shops.find((x) => slugifyLocation(x.city) === slug && slugifyLocation(x.name) === shopSlug);
  const nearby = s ? shops.filter((x) => x.id !== s.id && x.city === s.city).slice(0, 4) : [];
  const path = `/panel-beaters/${slug}/${shopSlug}`;
  const url = `${SAVO_ORIGIN}${path}`;

  if (!isLoading && !s) {
    return (
      <AppLayout>
        <SEO title="Panel beater not found | SAVO" description="This workshop is no longer listed." path={path} noIndex />
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <p className="text-muted-foreground mb-4">We couldn't find this workshop.</p>
          <Button asChild variant="outline"><Link to={`/panel-beaters/${slug}`}>See panel beaters in this area</Link></Button>
        </div>
      </AppLayout>
    );
  }
  if (!s) return <AppLayout><div className="container mx-auto px-4 py-12 text-sm text-muted-foreground">Loading…</div></AppLayout>;

  const services = (s.services || []).filter(Boolean);
  const title = `${s.name} — Panel Beater in ${s.city} | Reviews, Hours & Contact`;
  const description = `${s.name} is a ${s.google_rating}★ rated panel beater at ${s.address}, ${s.city}. ${services.length ? `Services: ${services.slice(0, 3).join(', ')}. ` : ''}Contact details, hours and your rights when choosing a repairer.`;

  const business: Record<string, unknown> = {
    '@type': 'AutoBodyShop',
    '@id': `${url}#business`,
    name: s.name,
    url,
    address: { '@type': 'PostalAddress', streetAddress: s.address, addressLocality: s.city, addressRegion: s.region, addressCountry: 'NZ' },
  };
  if (s.phone) business.telephone = s.phone;
  if (s.email) business.email = s.email;
  if (s.website) business.sameAs = [s.website];
  if (s.photo_url) business.image = s.photo_url;
  if (s.description) business.description = s.description;
  if (services.length) business.knowsAbout = services;
  // Google requires a review count alongside the rating value.
  if (s.google_rating && s.review_count > 0) {
    business.aggregateRating = { '@type': 'AggregateRating', ratingValue: s.google_rating, reviewCount: s.review_count, bestRating: 5 };
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      business,
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SAVO_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Panel beaters', item: `${SAVO_ORIGIN}/panel-beaters` },
          { '@type': 'ListItem', position: 3, name: s.city, item: `${SAVO_ORIGIN}/panel-beaters/${slug}` },
          { '@type': 'ListItem', position: 4, name: s.name, item: url },
        ],
      },
    ],
  };

  const mapQuery = encodeURIComponent(`${s.name}, ${s.address}, ${s.city}, New Zealand`);

  return (
    <AppLayout>
      <SEO title={title} description={description} path={path} jsonLd={jsonLd} />
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Link to={`/panel-beaters/${slug}`} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3 h-3" /> Panel beaters in {s.city}
        </Link>

        {s.photo_url && (
          <img src={s.photo_url} alt={`${s.name} workshop in ${s.city}`} className="w-full h-56 object-cover rounded-2xl mb-6" loading="eager" />
        )}

        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-2">{s.name}</h1>
          <p className="text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>Panel beater in {s.city}, {s.region}</span>
            {s.google_rating ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> {s.google_rating}
                {s.review_count > 0 && <span className="text-muted-foreground">({s.review_count} Google reviews)</span>}
              </Badge>
            ) : null}
          </p>
        </header>

        {s.description && <p className="text-foreground mb-6">{s.description}</p>}

        <Card className="p-5 mb-6 space-y-3 text-sm">
          <p className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />{s.address}, {s.city}</p>
          {s.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /><a className="hover:underline" href={`tel:${s.phone}`}>{s.phone}</a></p>}
          {s.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /><a className="hover:underline" href={`mailto:${s.email}`}>{s.email}</a></p>}
          <p className="flex items-start gap-2"><Clock className="w-4 h-4 mt-0.5 text-primary" /><span className="whitespace-pre-line">{s.opening_hours || 'Opening hours not listed — call ahead to confirm.'}</span></p>
          <div className="flex flex-wrap gap-2 pt-2">
            {s.phone && <Button asChild size="sm"><a href={`tel:${s.phone}`}><Phone className="w-3 h-3 mr-1" /> Call</a></Button>}
            {s.website && <Button asChild size="sm" variant="outline"><a href={s.website} target="_blank" rel="noopener noreferrer">Website <ExternalLink className="w-3 h-3 ml-1" /></a></Button>}
            <Button asChild size="sm" variant="outline"><a href={`https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`} target="_blank" rel="noopener noreferrer">Directions</a></Button>
          </div>
        </Card>

        {services.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xl font-serif text-foreground mb-3 flex items-center gap-2"><Wrench className="w-4 h-4" /> Services</h2>
            <div className="flex flex-wrap gap-2">{services.map((x) => <Badge key={x} variant="outline">{x}</Badge>)}</div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-xl font-serif text-foreground mb-3">Location</h2>
          <iframe
            title={`Map of ${s.name}`}
            src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
            className="w-full h-64 rounded-2xl border border-border"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </section>

        <Card className="p-5 mb-8 border-primary/30 bg-primary/5">
          <h2 className="text-lg font-serif text-foreground mb-2 flex items-center gap-2"><Scale className="w-4 h-4" /> Your right to choose a repairer</h2>
          <p className="text-sm text-muted-foreground mb-3">
            In NZ your insurer may suggest an approved repairer, but many policies let you ask for a workshop of your choice. If you weren't at fault, the at-fault driver's insurer generally pays for repairs.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm"><Link to="/rights/choosing-repairer">Know your rights</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/fault-guide">Check who's at fault</Link></Button>
          </div>
        </Card>

        {nearby.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-3">Other panel beaters in {s.city}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {nearby.map((n) => (
                <Link key={n.id} to={`/panel-beaters/${slug}/${slugifyLocation(n.name)}`}>
                  <Card className="p-4 hover:border-primary/40 transition-colors">
                    <p className="font-semibold text-foreground">{n.name}</p>
                    <p className="text-xs text-muted-foreground">{n.address} · {n.google_rating}★</p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <ReplacementVehicleNote seed={shopSlug} />
        <div className="mt-8"><LegalDisclaimer /></div>
        <p className="text-xs text-muted-foreground mt-4">SAVO is not affiliated with {s.name}. Listing details come from public sources — contact the workshop to confirm.</p>
      </div>
    </AppLayout>
  );
}
