import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, ArrowLeft, FileText } from 'lucide-react';
import { slugifyLocation, titleizeSlug } from '@/lib/location-slug';
import { SAVO_ORIGIN, buildTowTrucksBreadcrumb } from '@/lib/tow-trucks-jsonld';

type Tow = { id: string; name: string; address: string; phone: string; region: string };

// Region-specific intro paragraph. Falls back to a generic intro for unknown regions.
const REGION_INTROS: Record<string, { blurb: string; hubs: string }> = {
  auckland: {
    blurb: 'Auckland has the busiest towing market in New Zealand, with operators running 24/7 across the motorway network. Tow trucks tend to converge quickly on crash sites — particularly along SH1, SH16 and SH20 — so it pays to know which operator you want before you call.',
    hubs: 'Penrose, East Tāmaki, Albany, Henderson, Manukau and the North Shore',
  },
  wellington: {
    blurb: 'Wellington towing covers the city, Hutt Valley, Porirua and Kāpiti. Wind events, weather-related breakdowns and SH1 crashes through Ngauranga Gorge are the most common call-outs, and after-hours availability is strong across the region.',
    hubs: 'Petone, Lower Hutt, Porirua, Tawa and Kilbirnie',
  },
  canterbury: {
    blurb: 'Canterbury tow operators handle Christchurch city plus a wide rural footprint — Ashburton, Rangiora and the inland highways. Heavy recovery for trucks and farm vehicles is a regional speciality.',
    hubs: 'Sockburn, Hornby, Rangiora, Rolleston and central Christchurch',
  },
  waikato: {
    blurb: 'Waikato towing serves the SH1 and SH3 corridors plus a busy rural network around Hamilton, Cambridge, Te Awamutu and Morrinsville. Expect strong heavy-vehicle recovery capacity given the freight volumes through the region.',
    hubs: 'Te Rapa, Frankton, Cambridge and Hamilton East',
  },
  'bay-of-plenty': {
    blurb: 'Bay of Plenty operators cover Tauranga, Mount Maunganui, Pāpāmoa, Whakatāne and Rotorua-bound traffic. SH2 and SH29 crash response is a daily reality, so most operators run multiple trucks across the region.',
    hubs: 'Mount Maunganui industrial, Greerton, Pāpāmoa and Whakatāne',
  },
  otago: {
    blurb: 'Otago towing covers Dunedin, Mosgiel, Balclutha and the inland routes through Central Otago — Cromwell, Wānaka and Alexandra. Winter conditions drive a surge of breakdown call-outs from June through August.',
    hubs: 'South Dunedin, Green Island, Mosgiel and Cromwell',
  },
};

function regionIntro(name: string, slug: string, count: number): string {
  const r = REGION_INTROS[slug];
  if (r) {
    return `${r.blurb} We currently list ${count} towing operators serving ${name}. Remember: after a crash you choose your tow operator — not the first truck on scene. The biggest concentration of operators sits across ${r.hubs}.`;
  }
  return `Tow operators in ${name} handle accident recovery, breakdowns, repossessions and transport between workshops or yards. We currently list ${count} operators serving ${name}. After a crash you have the right to choose your tow operator and the destination — don't sign anything at the roadside without confirming storage fees and where your vehicle is going.`;
}

// Major NZ regions to cross-link from any region page.
const MAJOR_REGIONS = [
  'Auckland', 'Wellington', 'Canterbury', 'Waikato', 'Bay of Plenty',
  'Otago', 'Manawatu-Wanganui', 'Northland', 'Hawke\'s Bay', 'Southland',
];

const FAQ = (region: string) => [
  {
    q: `How much does a tow truck cost in ${region}?`,
    a: `Most ${region} operators charge a hook-up fee of $90–$150 plus $3–$6 per kilometre. After-hours and accident call-outs typically attract a 50–100% surcharge. Storage at the operator's yard usually runs $30–$60 per day until your vehicle is collected or moved to a panel shop.`,
  },
  {
    q: `Do I have to use the first tow truck on scene?`,
    a: `No. In New Zealand you can choose your own tow operator and the destination. Police only direct a tow when the vehicle is blocking the road or has been involved in a serious incident. If you have time, call an operator you trust or one approved by your insurer.`,
  },
  {
    q: `Will my insurance cover the tow?`,
    a: `If you have comprehensive cover, tow costs are usually included as part of the claim — minus your excess. Many insurers also offer 24/7 roadside assistance that dispatches a tow for breakdowns. Confirm with your insurer before authorising the tow so the destination matches their approved repairer network.`,
  },
  {
    q: `How long will the tow take to arrive in ${region}?`,
    a: `Urban response times in ${region} are typically 20–45 minutes. Rural call-outs and adverse weather can stretch that to 60–90 minutes. If the road is blocked, police usually dispatch the nearest available operator regardless of your preference.`,
  },
  {
    q: `What should I do before the tow truck arrives?`,
    a: `Capture photos of the vehicles, the scene and any damage from multiple angles. Collect the other driver's name, contact and insurance details, plus the registration of every vehicle involved. SAVO walks you through this step by step and packages it into a branded report you can send straight to your insurer and panel beater.`,
  },
];

export default function TowTrucksRegion() {
  const { slug = '' } = useParams<{ slug: string }>();

  const { data: all = [], isLoading } = useQuery({
    queryKey: ['tow-companies-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tow_companies')
        .select('id,name,address,phone,region')
        .order('name');
      if (error) throw error;
      return data as Tow[];
    },
  });

  const matches = all.filter((t) => slugifyLocation(t.region) === slug);
  const regionName = matches[0]?.region ?? titleizeSlug(slug);

  const topPicks = matches.slice(0, 5);
  const rest = matches.slice(5);

  const title = `Tow Trucks in ${regionName} — ${matches.length || 'Trusted'} 24/7 Towing Operators NZ (2026)`;
  const description = `Compare ${matches.length || 'trusted'} tow truck operators serving ${regionName}, New Zealand. Contact details, pricing guidance and your right to choose after an accident or breakdown.`;

  const faqs = FAQ(regionName);

  const ORIGIN = SAVO_ORIGIN;
  const pageUrl = `${ORIGIN}/tow-trucks/${slug}`;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#operators`,
        name: title,
        numberOfItems: matches.length,
        itemListElement: matches.slice(0, 20).map((t, i) => {
          const item: Record<string, unknown> = {
            '@type': 'AutomotiveBusiness',
            name: t.name,
            address: {
              '@type': 'PostalAddress',
              streetAddress: t.address,
              addressRegion: t.region,
              addressCountry: 'NZ',
            },
          };
          if (t.phone) item.telephone = t.phone;
          return { '@type': 'ListItem', position: i + 1, item };
        }),
      },
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faq`,
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      buildTowTrucksBreadcrumb(slug, regionName),
    ],
  };

  const renderTowCard = (t: Tow, opts?: { featured?: boolean }) => (
    <Card key={t.id} className={`p-4 ${opts?.featured ? 'border-primary/40' : ''}`}>
      <h3 className="text-lg font-semibold text-foreground mb-2">{t.name}</h3>
      <div className="text-sm text-muted-foreground space-y-1">
        {t.address && <p className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />{t.address}</p>}
        {t.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><a className="hover:underline" href={`tel:${t.phone}`}>{t.phone}</a></p>}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {t.phone && (
          <Button asChild size="sm">
            <a href={`tel:${t.phone}`}><Phone className="w-3 h-3 mr-1" /> Call now</a>
          </Button>
        )}
        {opts?.featured && (
          <Button asChild variant="outline" size="sm">
            <Link to="/auth">
              <FileText className="w-3 h-3 mr-1" /> Request a tow
            </Link>
          </Button>
        )}
        {t.address && (
          <Button asChild variant="outline" size="sm">
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(t.address)}`} target="_blank" rel="noopener noreferrer">
              Directions
            </a>
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <AppLayout>
      <SEO title={title} description={description} path={`/tow-trucks/${slug}`} jsonLd={jsonLd} noIndex={!isLoading && matches.length === 0} />
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

        {matches.length > 0 && (
          <section className="mb-8 prose prose-sm dark:prose-invert max-w-none">
            <p>{regionIntro(regionName, slug, matches.length)}</p>
          </section>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {topPicks.length > 0 && (
              <section className="mb-10">
                <h2 className="text-xl font-serif text-foreground mb-3">Featured operators in {regionName}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Call directly, or request a tow through SAVO — we'll package your location, photos and third-party details so the operator and your insurer have everything they need.
                </p>
                <div className="space-y-3">
                  {topPicks.map((t) => renderTowCard(t, { featured: true }))}
                </div>
              </section>
            )}

            {rest.length > 0 && (
              <section className="mb-10">
                <h2 className="text-xl font-serif text-foreground mb-3">Full directory ({rest.length} more)</h2>
                <div className="space-y-3">
                  {rest.map((t) => renderTowCard(t))}
                </div>
              </section>
            )}
          </>
        )}

        {matches.length > 0 && (
          <section className="mt-10 mb-10">
            <h2 className="text-xl font-serif text-foreground mb-4">Frequently asked questions</h2>
            <div className="space-y-4">
              {faqs.map((f) => (
                <Card key={f.q} className="p-4">
                  <h3 className="font-semibold text-foreground mb-1">{f.q}</h3>
                  <p className="text-sm text-muted-foreground">{f.a}</p>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 mb-10">
          <h2 className="text-xl font-serif text-foreground mb-3">Other regions</h2>
          <div className="flex flex-wrap gap-2">
            {MAJOR_REGIONS.filter((r) => slugifyLocation(r) !== slug).map((r) => (
              <Button key={r} asChild variant="outline" size="sm">
                <Link to={`/tow-trucks/${slugifyLocation(r)}`}>Tow trucks in {r}</Link>
              </Button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/panel-beaters/${slug}`}>Panel beaters in {regionName}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/blog">Claim guides &amp; resources</Link>
            </Button>
          </div>
        </section>

        <section className="mt-10 rounded-lg border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-xl font-serif text-foreground mb-2">Capture the incident with SAVO</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Record photos, GPS location and third-party details before the tow leaves the scene — then send a complete branded report to your insurer and panel beater in minutes.
          </p>
          <Button asChild>
            <Link to="/auth">Get started free</Link>
          </Button>
        </section>
      </div>
    </AppLayout>
  );
}
