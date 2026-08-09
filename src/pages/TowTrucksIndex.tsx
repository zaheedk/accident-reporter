import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowRight, LocateFixed, Loader2 } from 'lucide-react';
import { slugifyLocation } from '@/lib/location-slug';
import { SAVO_ORIGIN } from '@/lib/tow-trucks-jsonld';
import { TOW_CITIES, matchCity, distanceKm } from '@/lib/tow-cities';
import ReplacementVehicleNote from '@/components/ReplacementVehicleNote';

const FEATURED_REGIONS = [
  'Auckland', 'Wellington', 'Canterbury', 'Waikato', 'Bay of Plenty',
  'Otago', 'Manawatu-Wanganui', 'Northland', "Hawke's Bay", 'Southland',
];

const FAQ = [
  {
    q: 'Do I have to use the tow truck the police call?',
    a: 'No. In New Zealand you have the right to choose your own tow operator and the destination, even when police are on scene. Police only direct the tow when the vehicle is blocking the road or part of a serious incident investigation.',
  },
  {
    q: 'How much does a tow truck cost in NZ?',
    a: 'Expect a hook-up fee of $90–$150 plus $3–$6 per kilometre. After-hours and accident call-outs typically carry a 50–100% surcharge. Storage at the operator\'s yard runs $30–$60 per day until the vehicle is moved to a panel shop or yard.',
  },
  {
    q: 'Will my insurance cover the tow?',
    a: 'Comprehensive policies usually include towing as part of the claim, minus your excess. Many insurers also offer 24/7 roadside assistance that dispatches a tow for breakdowns. Confirm with your insurer first so the destination matches their approved repairer network.',
  },
  {
    q: 'How fast will a tow truck arrive?',
    a: 'Urban response times are 20–45 minutes in most main centres. Rural and adverse-weather call-outs stretch to 60–90 minutes. If the road is blocked, police dispatch the nearest operator regardless of your preference.',
  },
];

type Row = { region: string; address: string };

export default function TowTrucksIndex() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['tow-trucks-index'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tow_companies').select('region,address');
      if (error) throw error;
      return data as Row[];
    },
  });

  const counts = new Map<string, number>();
  const cityCounts = new Map<string, number>();
  for (const r of data) {
    if (r.region) counts.set(r.region, (counts.get(r.region) ?? 0) + 1);
    const c = matchCity(r.address, r.region);
    if (c) cityCounts.set(c.slug, (cityCounts.get(c.slug) ?? 0) + 1);
  }
  const regions = Array.from(counts.entries()).sort();
  const totalOps = data.length;
  const pageUrl = `${SAVO_ORIGIN}/tow-trucks`;

  const cities = TOW_CITIES.map((c) => ({ ...c, count: cityCounts.get(c.slug) ?? 0 })).filter((c) => c.count > 0);
  const sortedCities = coords
    ? [...cities].sort(
        (a, b) => distanceKm(coords.lat, coords.lng, a.lat, a.lng) - distanceKm(coords.lat, coords.lng, b.lat, b.lng)
      )
    : cities;

  const findNearMe = () => {
    setLocError('');
    if (!('geolocation' in navigator)) {
      setLocError('Your browser does not support location lookup.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocError('We could not get your location. Pick your city below instead.');
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#collection`,
        name: 'Tow Trucks in New Zealand',
        description: `Directory of ${totalOps || 'trusted'} 24/7 tow truck operators across New Zealand, organised by city and region.`,
        url: pageUrl,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SAVO_ORIGIN}/tow-trucks/{search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SAVO_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Tow Trucks', item: pageUrl },
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
        title="Tow Trucks NZ — 24/7 Towing Companies Near You"
        description={`Find trusted tow truck operators across New Zealand. Browse ${totalOps || '24/7'} towing companies by city and region — Auckland, Wellington, Christchurch and more.`}
        path="/tow-trucks"
        jsonLd={jsonLd}
      />
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-3">Tow Trucks in New Zealand</h1>
          <p className="text-muted-foreground max-w-2xl">
            After an accident or breakdown, you have the right to choose your own tow operator and where your vehicle is taken. We list {totalOps || 'trusted'} towing companies across {regions.length || 'every'} NZ {regions.length === 1 ? 'region' : 'regions'} — pick your city below for 24/7 contact details.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={findNearMe} disabled={locating}>
              {locating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LocateFixed className="w-4 h-4 mr-2" />}
              Find tow trucks near me
            </Button>
            {coords && <span className="text-sm text-muted-foreground">Sorted by distance from you.</span>}
            {locError && <span className="text-sm text-destructive">{locError}</span>}
          </div>
        </header>

        {sortedCities.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              {coords ? 'Closest cities to you' : 'Towing by city'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {sortedCities.map((c) => (
                <Link key={c.slug} to={`/tow-trucks/${c.slug}`}>
                  <Card className="p-3 hover:bg-accent transition-colors flex items-center justify-between text-sm">
                    <span className="text-foreground flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      {c.name}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      {coords ? `${Math.round(distanceKm(coords.lat, coords.lng, c.lat, c.lng))} km` : c.count}
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3">Featured regions</h2>
          <div className="flex flex-wrap gap-2">
            {FEATURED_REGIONS.map((r) => (
              <Button key={r} asChild variant="outline" size="sm">
                <Link to={`/tow-trucks/${slugifyLocation(r)}`}>Tow trucks in {r}</Link>
              </Button>
            ))}
          </div>
        </section>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading directory…</p>
        ) : (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">All regions</h2>
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
          </section>
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

        <ReplacementVehicleNote seed="tow-trucks-hub" />

        <section className="mt-10 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/panel-beaters">Panel beaters by city</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/blog/towing-rights-nz-choosing-tow-company">Your towing rights in NZ</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/blog">Claim guides &amp; resources</Link>
          </Button>
        </section>
      </div>
    </AppLayout>
  );
}
