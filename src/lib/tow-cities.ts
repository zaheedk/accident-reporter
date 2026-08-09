// City-level tow directory metadata.
// Pure module (no React / Supabase imports) so build-time scripts
// (generate-sitemap, prerender, validate-jsonld) can import it in Node.

export type TowCity = {
  slug: string;
  name: string;
  /** Region the city sits inside (must match tow_companies.region). */
  region: string;
  /** Lowercase substrings matched against tow_companies.address. */
  aliases: string[];
  /** Approximate city centre — used for the "near me" distance sort. */
  lat: number;
  lng: number;
  /** Local motorway / corridor context for the intro paragraph. */
  corridor: string;
  /** Suburbs where operators cluster. */
  suburbs: string;
};

/**
 * Ordered most-specific-first. `matchCity` returns the first hit, so
 * sub-cities (North Shore, Manukau, Waitakere) must precede Auckland.
 */
export const TOW_CITIES: TowCity[] = [
  {
    slug: 'north-shore',
    name: 'North Shore',
    region: 'Auckland',
    aliases: ['north shore', 'albany', 'takapuna', 'glenfield', 'rosedale', 'wairau', 'silverdale', 'browns bay', 'devonport'],
    lat: -36.7833, lng: 174.7500,
    corridor: 'the SH1 Northern Motorway and the Upper Harbour Highway',
    suburbs: 'Albany, Rosedale, Wairau Valley, Glenfield and Silverdale',
  },
  {
    slug: 'manukau',
    name: 'Manukau',
    region: 'Auckland',
    aliases: ['manukau', 'papatoetoe', 'otahuhu', 'ōtāhuhu', 'east tamaki', 'east tāmaki', 'wiri', 'takanini', 'papakura', 'botany', 'mangere', 'māngere'],
    lat: -36.9930, lng: 174.8790,
    corridor: 'the SH1 Southern Motorway and SH20 through Māngere',
    suburbs: 'Wiri, East Tāmaki, Papatoetoe, Māngere and Takanini',
  },
  {
    slug: 'waitakere',
    name: 'Waitākere',
    region: 'Auckland',
    aliases: ['waitakere', 'waitākere', 'henderson', 'new lynn', 'te atatu', 'te atatū', 'glen eden', 'kumeu', 'massey', 'swanson'],
    lat: -36.8850, lng: 174.6300,
    corridor: 'the SH16 Northwestern Motorway and Great North Road',
    suburbs: 'Henderson, New Lynn, Te Atatū, Massey and Kumeū',
  },
  {
    slug: 'auckland',
    name: 'Auckland',
    region: 'Auckland',
    aliases: ['auckland', 'penrose', 'mt wellington', 'mount wellington', 'onehunga', 'ellerslie', 'newmarket', 'grey lynn', 'avondale', 'panmure', 'cbd'],
    lat: -36.8485, lng: 174.7633,
    corridor: 'SH1, SH16 and SH20 through the central isthmus',
    suburbs: 'Penrose, Mt Wellington, Onehunga, Ellerslie and the CBD fringe',
  },
  {
    slug: 'hamilton',
    name: 'Hamilton',
    region: 'Waikato',
    aliases: ['hamilton', 'te rapa', 'frankton', 'hillcrest', 'chartwell', 'rototuna'],
    lat: -37.7870, lng: 175.2793,
    corridor: 'the Waikato Expressway (SH1) and SH3 to Te Awamutu',
    suburbs: 'Te Rapa, Frankton, Hamilton East and Chartwell',
  },
  {
    slug: 'tauranga',
    name: 'Tauranga',
    region: 'Bay of Plenty',
    aliases: ['tauranga', 'mount maunganui', 'mt maunganui', 'papamoa', 'pāpāmoa', 'greerton', 'bethlehem', 'te puke'],
    lat: -37.6878, lng: 176.1651,
    corridor: 'SH2, SH29 over the Kaimai Range and the Tauranga Eastern Link',
    suburbs: 'Mount Maunganui industrial, Greerton, Pāpāmoa and Bethlehem',
  },
  {
    slug: 'rotorua',
    name: 'Rotorua',
    region: 'Bay of Plenty',
    aliases: ['rotorua', 'ngongotaha', 'ngongotahā'],
    lat: -38.1368, lng: 176.2497,
    corridor: 'SH5 to Taupō and SH30 through the Bay',
    suburbs: 'Fenton Park, Ngongotahā and the industrial area off Old Taupo Road',
  },
  {
    slug: 'napier-hastings',
    name: 'Napier–Hastings',
    region: "Hawke's Bay",
    aliases: ['napier', 'hastings', 'havelock north', 'onekawa', 'ahuriri', 'flaxmere'],
    lat: -39.5000, lng: 176.8700,
    corridor: 'the Napier–Hastings expressway (SH2) and SH50',
    suburbs: 'Onekawa, Ahuriri, Whakatu and Hastings central',
  },
  {
    slug: 'palmerston-north',
    name: 'Palmerston North',
    region: 'Manawatu-Whanganui',
    aliases: ['palmerston north', 'feilding', 'ashhurst', 'longburn'],
    lat: -40.3523, lng: 175.6082,
    corridor: 'SH3, SH56 and the Manawatū Gorge route',
    suburbs: 'Kelvin Grove, Milson, Longburn and Feilding',
  },
  {
    slug: 'lower-hutt',
    name: 'Lower Hutt',
    region: 'Wellington',
    aliases: ['lower hutt', 'petone', 'upper hutt', 'seaview', 'naenae', 'wainuiomata', 'gracefield'],
    lat: -41.2170, lng: 174.9110,
    corridor: 'SH2 through the Hutt Valley and the Petone foreshore',
    suburbs: 'Seaview, Petone, Gracefield and Upper Hutt',
  },
  {
    slug: 'wellington',
    name: 'Wellington',
    region: 'Wellington',
    aliases: ['wellington', 'rongotai', 'kilbirnie', 'porirua', 'tawa', 'newtown', 'johnsonville', 'ngauranga', 'kapiti', 'kāpiti', 'paraparaumu'],
    lat: -41.2866, lng: 174.7756,
    corridor: 'SH1 through Ngauranga Gorge and the Terrace Tunnel',
    suburbs: 'Kilbirnie, Rongotai, Ngauranga, Tawa and Porirua',
  },
  {
    slug: 'christchurch',
    name: 'Christchurch',
    region: 'Canterbury',
    aliases: ['christchurch', 'sockburn', 'hornby', 'sydenham', 'addington', 'papanui', 'rolleston', 'woolston', 'bromley'],
    lat: -43.5321, lng: 172.6362,
    corridor: 'the Christchurch Northern and Southern Motorways (SH1) and SH73 west',
    suburbs: 'Sockburn, Hornby, Sydenham, Woolston and Rolleston',
  },
  {
    slug: 'dunedin',
    name: 'Dunedin',
    region: 'Otago',
    aliases: ['dunedin', 'mosgiel', 'green island', 'south dunedin', 'caversham'],
    lat: -45.8788, lng: 170.5028,
    corridor: 'SH1 over the Kilmog and the Southern Motorway to Mosgiel',
    suburbs: 'South Dunedin, Green Island, Caversham and Mosgiel',
  },
];

const BY_SLUG = new Map(TOW_CITIES.map((c) => [c.slug, c]));

export function getTowCity(slug: string): TowCity | undefined {
  return BY_SLUG.get(slug);
}

export function isTowCitySlug(slug: string): boolean {
  return BY_SLUG.has(slug);
}

/** Resolve which listed city an operator belongs to, from its address + region. */
export function matchCity(address: string | null | undefined, region?: string | null): TowCity | undefined {
  const hay = (address || '').toLowerCase();
  if (!hay) return undefined;
  for (const city of TOW_CITIES) {
    if (region && city.region !== region) continue;
    if (city.aliases.some((a) => hay.includes(a))) return city;
  }
  return undefined;
}

/** Cities that sit inside a given region. */
export function citiesInRegion(region: string): TowCity[] {
  return TOW_CITIES.filter((c) => c.region === region);
}

/** City-specific intro paragraph for /tow-trucks/{city}. */
export function cityIntro(city: TowCity, count: number): string {
  return `Tow operators in ${city.name} work ${city.corridor} around the clock, covering crash recovery, breakdowns, EV transport and moves between workshops and storage yards. We currently list ${count} ${count === 1 ? 'operator' : 'operators'} serving ${city.name}, with the biggest concentration around ${city.suburbs}. After a crash you choose the tow operator and the destination — not the first truck on scene — so confirm the hook-up fee, the per-kilometre rate and where your vehicle is being stored before you sign anything.`;
}

/** Haversine distance in km. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
