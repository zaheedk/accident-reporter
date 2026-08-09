// Pure region intro copy for /tow-trucks/{region}. Imported by the page and by build-time scripts.

// Region-specific intro paragraph. Falls back to a generic intro for unknown regions.
export const REGION_INTROS: Record<string, { blurb: string; hubs: string }> = {
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

export function regionIntro(name: string, slug: string, count: number): string {
  const r = REGION_INTROS[slug];
  if (r) {
    return `${r.blurb} We currently list ${count} towing operators serving ${name}. Remember: after a crash you choose your tow operator — not the first truck on scene. The biggest concentration of operators sits across ${r.hubs}.`;
  }
  return `Tow operators in ${name} handle accident recovery, breakdowns, repossessions and transport between workshops or yards. We currently list ${count} operators serving ${name}. After a crash you have the right to choose your tow operator and the destination — don't sign anything at the roadside without confirming storage fees and where your vehicle is going.`;
}

