import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

type Feed = { source: string; url: string }

const FEEDS: Feed[] = [
  { source: 'RNZ', url: 'https://www.rnz.co.nz/rss/national.xml' },
  { source: 'NZ Herald', url: 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/nz/?outputType=xml' },
]

// Only keep items that read like road/traffic incidents
const KEYWORDS = [
  'crash', 'collision', 'road closed', 'road closure', 'motorway', 'state highway',
  'sh1', 'sh 1', 'traffic', 'truck rolled', 'rolled', 'pile-up', 'pileup',
  'car accident', 'fatal crash', 'serious crash', 'slip', 'flooding', 'detour',
  'expressway', 'highway closed', 'lane closed', 'congestion', 'roadworks',
]

const REGIONS = [
  'Northland', 'Auckland', 'Waikato', 'Bay of Plenty', 'Gisborne', 'Hawke\u2019s Bay',
  'Hawke\'s Bay', 'Taranaki', 'Manawatu', 'Whanganui', 'Wellington', 'Tasman', 'Nelson',
  'Marlborough', 'West Coast', 'Canterbury', 'Christchurch', 'Otago', 'Dunedin',
  'Queenstown', 'Southland', 'Invercargill', 'Hamilton', 'Tauranga', 'Rotorua', 'Napier',
  'Palmerston North', 'New Plymouth', 'Whangarei',
]

function decode(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return match ? decode(match[1]) : ''
}

function categorise(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('fatal') || t.includes('serious crash')) return 'serious'
  if (t.includes('closed') || t.includes('closure') || t.includes('detour')) return 'closure'
  if (t.includes('flood') || t.includes('slip') || t.includes('snow') || t.includes('ice')) return 'weather'
  if (t.includes('roadworks')) return 'roadworks'
  return 'incident'
}

function detectRegion(text: string): string {
  const hit = REGIONS.find((r) => text.toLowerCase().includes(r.toLowerCase()))
  return hit || ''
}

async function parseFeed(feed: Feed) {
  const res = await fetch(feed.url, {
    headers: { 'User-Agent': 'SAVO-TrafficBot/1.0 (+https://www.savo.co.nz)' },
  })
  if (!res.ok) {
    console.error(`Feed failed [${res.status}] ${feed.source}`)
    return []
  }
  const xml = await res.text()
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || []
  const rows: Record<string, unknown>[] = []

  for (const item of items) {
    const title = tag(item, 'title')
    const summary = tag(item, 'description').slice(0, 600)
    const link = tag(item, 'link')
    const guid = tag(item, 'guid') || link
    const pubDate = tag(item, 'pubDate')
    if (!title || !link || !guid) continue

    const haystack = `${title} ${summary}`.toLowerCase()
    if (!KEYWORDS.some((k) => haystack.includes(k))) continue

    const published = pubDate ? new Date(pubDate) : new Date()
    rows.push({
      source: feed.source,
      source_url: link,
      guid,
      title,
      summary,
      region: detectRegion(`${title} ${summary}`),
      category: categorise(`${title} ${summary}`),
      published_at: (isNaN(published.getTime()) ? new Date() : published).toISOString(),
    })
  }
  return rows
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const results = await Promise.all(FEEDS.map((f) => parseFeed(f).catch(() => [])))
    const rows = results.flat()

    let inserted = 0
    if (rows.length) {
      const { error, count } = await supabase
        .from('traffic_alerts')
        .upsert(rows, { onConflict: 'guid', ignoreDuplicates: true, count: 'exact' })
      if (error) throw new Error(error.message)
      inserted = count ?? 0
    }

    // Trim anything older than 14 days to keep the feed tight
    await supabase
      .from('traffic_alerts')
      .delete()
      .lt('published_at', new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString())

    console.log(`Traffic poll complete: ${rows.length} matched, ${inserted} new`)
    return new Response(JSON.stringify({ success: true, matched: rows.length, inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('poll-traffic-alerts failed:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
