import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import ReplacementVehicleNote from '@/components/ReplacementVehicleNote';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Mail, Star, ExternalLink, ArrowLeft, FileText } from 'lucide-react';
import { slugifyLocation, titleizeSlug } from '@/lib/location-slug';
import { SAVO_ORIGIN, buildPanelBeatersBreadcrumb } from '@/lib/panel-beaters-jsonld';

type Shop = {
  id: string; name: string; address: string; city: string; region: string;
  phone: string; email: string; google_rating: number; website: string;
};

// City-specific colour for the intro paragraph. Falls back to a generic intro for unknown cities.
const CITY_INTROS: Record<string, { blurb: string; insurers: string; suburbs: string }> = {
  auckland: {
    blurb: 'Auckland has the highest crash volume in New Zealand, and panel beaters here range from boutique European specialists in Parnell to high-volume insurer-approved shops in Penrose, Mt Wellington and East Tāmaki. Most jobs are insurance-funded, so turnaround depends as much on parts supply as on the workshop itself — popular Toyota, Mazda and Tesla panels frequently sit on backorder for 2–4 weeks.',
    insurers: 'AA Insurance, State, Tower, AMI, Vero and IAG all maintain approved repairer networks across Auckland',
    suburbs: 'Penrose, Mt Wellington, East Tāmaki, Albany, Henderson, Manukau, Onehunga and the North Shore',
  },
  wellington: {
    blurb: 'Wellington panel beaters cover the city centre, Hutt Valley and Porirua basin. The market is dominated by long-established family workshops, several of which have been on the same site for 40+ years. Wind-driven debris damage, low-speed parking knocks and weather-related claims are the most common jobs — full collision repairs are typically referred to Hutt Valley shops with the floor space for chassis straightening.',
    insurers: 'Tower, AA Insurance, State and AMI are the most common insurers handling Wellington claims',
    suburbs: 'Te Aro, Newtown, Kilbirnie, Petone, Lower Hutt, Upper Hutt, Porirua and Tawa',
  },
  christchurch: {
    blurb: 'Christchurch has more panel beaters per capita than any other NZ city — a legacy of the post-quake rebuild and the flat, sprawling geography that gives workshops cheap industrial land. Quotes here are typically 10–15% cheaper than Auckland for equivalent work, and most shops can offer same-week assessments.',
    insurers: 'AA Insurance, State, Tower, AMI and Vero all have multiple approved repairers in Christchurch',
    suburbs: 'Sockburn, Hornby, Addington, Sydenham, Bromley, Papanui and Riccarton',
  },
  hamilton: {
    blurb: 'Hamilton panel beaters serve the wider Waikato — Cambridge, Te Awamutu and Morrinsville drivers regularly travel in for insurance-approved work. The market is split between a handful of large insurer-network shops near Te Rapa and Frankton, and independent specialists handling classic restorations and modified vehicles.',
    insurers: 'AA Insurance, State, AMI and Tower dominate the Waikato approved-repairer lists',
    suburbs: 'Te Rapa, Frankton, Hamilton East, Chartwell and Pukete',
  },
  tauranga: {
    blurb: 'Tauranga is one of the fastest-growing collision repair markets in NZ, driven by population growth in Pāpāmoa and Mount Maunganui. Most workshops are clustered around Mount Maunganui industrial and Greerton, with capacity that hasn\'t quite kept pace with demand — booking a quote 1–2 weeks ahead is normal.',
    insurers: 'State, AA Insurance, Tower and AMI maintain approved networks in the Bay of Plenty',
    suburbs: 'Mount Maunganui, Pāpāmoa, Greerton, Tauriko and Bethlehem',
  },
  dunedin: {
    blurb: 'Dunedin panel beaters handle a mix of student-vehicle damage, hail and weather claims, and rural Otago work brought in from Mosgiel, Balclutha and beyond. The market is small and tightly held — most insurer-approved work goes to a handful of long-standing South Dunedin and Green Island shops.',
    insurers: 'AA Insurance, State, Tower and AMI are the main insurers approving repairs in Otago',
    suburbs: 'South Dunedin, Green Island, Mosgiel, North East Valley and Andersons Bay',
  },
  'palmerston-north': {
    blurb: 'Palmerston North panel beaters serve Manawatū, Feilding and the wider lower North Island farming belt. Rural and highway damage — stock, gravel and State Highway 1/3 collisions — make up a large share of work, alongside student and commuter fender-benders around Massey.',
    insurers: 'AA Insurance, State, AMI and Tower all hold approved repairers in Manawatū',
    suburbs: 'Kelvin Grove, Roslyn, Takaro, Terrace End and Feilding',
  },
  napier: {
    blurb: 'Napier and Hastings share one Hawke\'s Bay repair market, and drivers often cross between the two cities for insurer-approved work. Post-cyclone demand pushed booking times out, so getting an assessment booked early is worthwhile.',
    insurers: 'State, AA Insurance, Tower and AMI maintain approved networks in Hawke\'s Bay',
    suburbs: 'Onekawa, Pandora, Taradale, Hastings and Havelock North',
  },
  nelson: {
    blurb: 'Nelson panel beaters cover Nelson, Richmond and Tasman. With fewer shops than the bigger centres, popular workshops book up quickly, and parts for less common makes may need to come from Christchurch or the North Island.',
    insurers: 'AA Insurance, State, AMI and Tower are the main insurers approving repairs in Nelson Tasman',
    suburbs: 'Stoke, Annesbrook, Tahunanui, Richmond and Motueka',
  },
  'new-plymouth': {
    blurb: 'New Plymouth panel beaters serve the whole of Taranaki, from Waitara to Hāwera. Work is a mix of urban collisions, rural road damage and utes and 4WDs from the farming and energy sectors.',
    insurers: 'AA Insurance, State, AMI and Tower all approve repairers across Taranaki',
    suburbs: 'Bell Block, Fitzroy, Moturoa, Waiwhakaiho and Waitara',
  },
  rotorua: {
    blurb: 'Rotorua panel beaters handle a lot of visitor and rental-vehicle damage alongside local claims, plus State Highway 5 and 30 collisions. Geothermal air can be hard on paint and metal, so match paintwork carefully on older vehicles.',
    insurers: 'State, AA Insurance, AMI and Tower maintain approved repairers in Rotorua',
    suburbs: 'Fairy Springs, Ngongotahā, Western Heights and the Rotorua industrial area',
  },
  queenstown: {
    blurb: 'Queenstown panel beaters deal with high volumes of rental-car, winter-ice and alpine-road damage. The small local market means parts and paint often come from Dunedin or Christchurch, so allow extra time for repairs.',
    insurers: 'AA Insurance, State, AMI and Tower handle most Queenstown Lakes claims',
    suburbs: 'Frankton, Remarkables Park, Arrowtown and Cromwell',
  },
};

function cityIntro(name: string, slug: string, count: number): string {
  const c = CITY_INTROS[slug];
  if (c) {
    return `${c.blurb} We currently list ${count} verified panel beaters in ${name} with Google ratings of 4.5 stars or higher. ${c.insurers}, so before authorising work it pays to confirm your shop is on your insurer's panel. The biggest concentration of workshops sits across ${c.suburbs}.`;
  }
  return `Panel beaters in ${name} handle the full range of collision repair, paintwork, dent removal and structural straightening. We currently list ${count} verified workshops in ${name} with Google ratings of 4.5 stars or higher. Most insurance-funded repairs require quotes from approved repairers, so confirm with your insurer before authorising work. Independent shops also handle private-pay jobs, classic restorations and modifications.`;
}

// Major NZ cities to cross-link from any city page.
const MAJOR_CITIES = [
  'Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga',
  'Dunedin', 'Palmerston North', 'Napier', 'Nelson', 'Rotorua',
];

const FAQ = (city: string) => [
  {
    q: `How much do panel beaters cost in ${city}?`,
    a: `Most ${city} panel beaters charge between $90 and $140 per labour hour. A minor dent or scuff repair typically runs $400–$900, while a moderate collision repair (panel replacement, paint, blending) commonly lands between $2,500 and $7,000 depending on parts and paint area.`,
  },
  {
    q: `Do I need three quotes for an insurance claim?`,
    a: `Not always. Most NZ insurers accept a single quote from an approved repairer on their network. You only need multiple quotes when you choose a shop outside the insurer's panel, or for higher-value claims where the insurer requests them.`,
  },
  {
    q: `Will my insurance cover the repair?`,
    a: `If you have comprehensive cover and you weren't at fault, the repair is usually covered minus your excess. Third-party-only policies cover damage to other people's cars, not yours. SAVO can help you lodge the claim with the right evidence — photos, third-party details and a branded report.`,
  },
  {
    q: `How long do collision repairs take in ${city}?`,
    a: `Simple cosmetic repairs take 2–4 working days. Mid-sized collision work usually runs 1–3 weeks. Anything involving structural straightening, suspension work or backordered parts (especially European and EV panels) can stretch to 4–8 weeks.`,
  },
  {
    q: `What if my car is undriveable after a crash?`,
    a: `Most ${city} panel beaters arrange towing direct to the workshop. You can also browse SAVO's tow-truck directory and dispatch one yourself, then have the shop handle storage and assessment.`,
  },
];

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
  const region = isCity ? cityMatches[0].region : locationName;

  const topPicks = shops.slice(0, 5);
  const rest = shops.slice(5);
  // Thin city pages (<3 shops) get padded with nearby same-region workshops so
  // the page stays genuinely useful instead of a near-empty listing.
  const nearby = isCity && shops.length < 3
    ? all.filter((s) => s.region === region && slugifyLocation(s.city) !== slug).slice(0, 6)
    : [];
  const tow_slug = slug; // mirror city slug for tow directory cross-link

  const title = `Best Panel Beaters in ${locationName} — ${shops.length || 'Top-rated'} Collision Repair Shops NZ (2026)`;
  const description = `Compare ${shops.length || 'top-rated'} trusted panel beaters in ${locationName}${isCity ? `, ${region}` : ''}. Reviews, pricing, insurer approvals and instant quote requests for collision repair and dent removal.`;

  const faqs = FAQ(locationName);

  // Must match SEO canonical origin so Breadcrumb URLs resolve to the indexed pages.
  const ORIGIN = SAVO_ORIGIN;
  const pageUrl = `${ORIGIN}/panel-beaters/${slug}`;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#shops`,
        name: title,
        numberOfItems: shops.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: shops.slice(0, 20).map((s, i) => {
          const item: Record<string, unknown> = {
            '@type': 'AutoBodyShop',
            name: s.name,
            address: {
              '@type': 'PostalAddress',
              streetAddress: s.address,
              addressLocality: s.city,
              addressRegion: s.region,
              addressCountry: 'NZ',
            },
          };
          if (s.phone) item.telephone = s.phone;
          if (s.website) item.url = s.website;
          // Intentionally omit aggregateRating: Google requires reviewCount/ratingCount
          // alongside ratingValue, which we don't store. Including a partial rating
          // triggers Search Console warnings.
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
      buildPanelBeatersBreadcrumb(slug, locationName),
    ],
  };

  const renderShopCard = (s: Shop, opts?: { featured?: boolean }) => (
    <Card key={s.id} className={`p-4 ${opts?.featured ? 'border-primary/40' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-lg font-semibold text-foreground">{s.name}</h3>
        {s.google_rating ? (
          <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
            <Star className="w-3 h-3 fill-current" /> {s.google_rating}
          </Badge>
        ) : null}
      </div>
      <div className="text-sm text-muted-foreground space-y-1">
        <p className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />{s.address}, {s.city}</p>
        {s.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><a className="hover:underline" href={`tel:${s.phone}`}>{s.phone}</a></p>}
        {s.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /><a className="hover:underline" href={`mailto:${s.email}`}>{s.email}</a></p>}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {opts?.featured && (
          <Button asChild size="sm">
            <Link to="/auth">
              <FileText className="w-3 h-3 mr-1" /> Request a quote
            </Link>
          </Button>
        )}
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
  );

  return (
    <AppLayout>
      <SEO title={title} description={description} path={`/panel-beaters/${slug}`} jsonLd={jsonLd} noIndex={!isLoading && shops.length === 0} />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Link to="/panel-beaters" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3 h-3" /> All locations
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
            Best Panel Beaters in {locationName}
          </h1>
          <p className="text-muted-foreground">
            {shops.length > 0
              ? `${shops.length} verified collision repair specialists serving ${locationName}${isCity ? `, ${region}` : ''}. All shops listed have Google ratings of 4.5 stars or higher.`
              : `We don't currently have verified panel beaters listed for ${locationName}. Browse nearby regions on our main directory.`}
          </p>
        </header>

        {shops.length > 0 && (
          <section className="mb-8 prose prose-sm dark:prose-invert max-w-none">
            <p>{cityIntro(locationName, slug, shops.length)}</p>
          </section>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {topPicks.length > 0 && (
              <section className="mb-10">
                <h2 className="text-xl font-serif text-foreground mb-3">Top picks in {locationName}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Our highest-rated workshops in {locationName}. Request a quote and SAVO will package your accident photos, third-party details and report for the shop in one go.
                </p>
                <div className="space-y-3">
                  {topPicks.map((s) => renderShopCard(s, { featured: true }))}
                </div>
              </section>
            )}

            {rest.length > 0 && (
              <section className="mb-10">
                <h2 className="text-xl font-serif text-foreground mb-3">Full directory ({rest.length} more)</h2>
                <div className="space-y-3">
                  {rest.map((s) => renderShopCard(s))}
                </div>
              </section>
            )}
            {nearby.length > 0 && (
              <section className="mb-10">
                <h2 className="text-xl font-serif text-foreground mb-3">More panel beaters near {locationName}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Highly rated workshops elsewhere in {region} that regularly take work from {locationName} drivers.
                </p>
                <div className="space-y-3">
                  {nearby.map((s) => renderShopCard(s))}
                </div>
              </section>
            )}
          </>
        )}

        {shops.length > 0 && (
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
          <h2 className="text-xl font-serif text-foreground mb-3">Other cities</h2>
          <div className="flex flex-wrap gap-2">
            {MAJOR_CITIES.filter((c) => slugifyLocation(c) !== slug).map((c) => (
              <Button key={c} asChild variant="outline" size="sm">
                <Link to={`/panel-beaters/${slugifyLocation(c)}`}>Panel beaters in {c}</Link>
              </Button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/tow-trucks/${tow_slug}`}>Tow trucks in {locationName}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/blog">Claim guides &amp; resources</Link>
            </Button>
          </div>
        </section>

        <ReplacementVehicleNote seed={slug} />

        <section className="mt-10 rounded-lg border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-xl font-serif text-foreground mb-2">Lodge your claim faster with SAVO</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Capture accident details on the spot — photos, third-party info, location, and a branded report you can send straight to your insurer and your chosen panel beater in {locationName}.
          </p>
          <Button asChild>
            <Link to="/auth">Get started free</Link>
          </Button>
        </section>
      </div>
    </AppLayout>
  );
}
