import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Car, Plus, AlertTriangle, ChevronRight, User, Shield, Phone, Search, MapPin, X, MessageSquare, FileWarning, ShieldAlert, CalendarClock, ArrowUpRight, Activity, FileText, Wrench, Truck, BookOpen, Lightbulb, Star, Users, Ambulance, Camera, Zap } from 'lucide-react';
import { getVehicles, getClaims } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Vehicle, ClaimReport } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { blogArticles } from '@/lib/blog-data';

function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function StatusDot({ days }: { days: number | null }) {
  const tone =
    days === null ? 'bg-muted-foreground/40' :
    days < 0 ? 'bg-destructive' :
    days <= 30 ? 'bg-amber-500' :
    'bg-emerald-500';
  return <span className={`w-1.5 h-1.5 rounded-full ${tone}`} />;
}

type RingKind = 'WOF' | 'Rego' | 'Ins';

const RING_META: Record<RingKind, { color: string; windowDays: number }> = {
  WOF: { color: 'hsl(var(--primary))', windowDays: 365 },
  Rego: { color: 'hsl(38 92% 50%)', windowDays: 365 },
  Ins: { color: 'hsl(152 60% 42%)', windowDays: 365 },
};

function ringColor(days: number | null, base: string): string {
  if (days === null) return 'hsl(var(--muted-foreground) / 0.3)';
  if (days < 0) return 'hsl(var(--destructive))';
  if (days <= 30) return 'hsl(38 92% 50%)';
  return base;
}

function ringSummary(days: number | null): string {
  if (days === null) return 'Not set';
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return 'Due today';
  return `${days} days left`;
}

/** Circular vehicle dial: three concentric tappable rings (WOF outer → Ins inner). */
function VehicleDial({
  vehicle,
  rings,
  onRingTap,
}: {
  vehicle: Vehicle;
  rings: { kind: RingKind; days: number | null }[];
  onRingTap: (v: Vehicle, kind: RingKind) => void;
}) {
  const SIZE = 168;
  const C = SIZE / 2;
  const RADII = [70, 56, 42];
  const worst = rings.reduce<number | null>((acc, r) => {
    if (r.days === null) return acc;
    return acc === null || r.days < acc ? r.days : acc;
  }, null);
  const overdue = worst !== null && worst < 0;
  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full -rotate-90">
        {rings.map(({ kind, days }, i) => {
          const r = RADII[i];
          const circ = 2 * Math.PI * r;
          const meta = RING_META[kind];
          const pct = days === null ? 0 : Math.max(0, Math.min(1, days / meta.windowDays));
          const fill = days !== null && days < 0 ? 1 : pct;
          return (
            <g key={kind}>
              {/* track */}
              <circle cx={C} cy={C} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
              {/* progress */}
              <circle
                cx={C} cy={C} r={r} fill="none"
                stroke={ringColor(days, meta.color)}
                strokeWidth="7" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={circ * (1 - fill)}
                className="transition-[stroke-dashoffset] duration-700"
              />
              {/* wide invisible hit target */}
              <circle
                cx={C} cy={C} r={r} fill="none" stroke="transparent" strokeWidth="18"
                className="cursor-pointer"
                onClick={() => onRingTap(vehicle, kind)}
              >
                <title>{kind} — {ringSummary(days)}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <button
        onClick={() => onRingTap(vehicle, rings.find(r => r.days !== null)?.kind ?? 'WOF')}
        className="absolute rounded-full bg-card flex flex-col items-center justify-center text-center overflow-hidden border border-border/60 active:scale-[0.97] transition-transform"
        style={{ left: C - 33, top: C - 33, width: 66, height: 66 }}
      >
        {vehicle.photoUrl ? (
          <img src={vehicle.photoUrl} alt={`${vehicle.make} ${vehicle.model}`} className="absolute inset-0 w-full h-full object-cover opacity-25" loading="lazy" />
        ) : null}
        <span className="relative text-[13px] font-extrabold tracking-[-0.02em] tabular-nums text-foreground leading-none">
          {vehicle.regoNumber}
        </span>
        <span className={`relative mt-1 text-[8px] font-bold uppercase tracking-[0.14em] ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
          {overdue ? 'Action due' : 'All good'}
        </span>
      </button>
    </div>
  );
}



export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  const [towSheetOpen, setTowSheetOpen] = useState(false);
  const [accidentSheetOpen, setAccidentSheetOpen] = useState(false);
  const [towCompanies, setTowCompanies] = useState<any[]>([]);
  const [towSearch, setTowSearch] = useState('');
  const [userCity, setUserCity] = useState('');
  const [userRegion, setUserRegion] = useState('');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  const { data: allVehicles = [] } = useOfflineQuery<Vehicle[]>(
    ['vehicles', user?.id ?? ''],
    () => getVehicles(user!.id),
    { enabled: !!user }
  );
  const vehicles = allVehicles.filter(v => v.isActive !== false);

  const { data: claims = [] } = useOfflineQuery<ClaimReport[]>(
    ['claims', user?.id ?? ''],
    () => getClaims(user!.id),
    { enabled: !!user }
  );

  const { data: familyInfo } = useOfflineQuery<{ inFamily: boolean; isHead: boolean; memberCount: number }>(
    ['family-info', user?.id ?? ''],
    async () => {
      if (!user) return { inFamily: false, isHead: false, memberCount: 0 };
      const { data: m } = await supabase
        .from('family_members').select('family_id, role').eq('user_id', user.id).maybeSingle();
      if (!m) return { inFamily: false, isHead: false, memberCount: 0 };
      const { count } = await supabase
        .from('family_members').select('*', { count: 'exact', head: true }).eq('family_id', m.family_id);
      return { inFamily: true, isHead: m.role === 'head', memberCount: count ?? 1 };
    },
    { enabled: !!user }
  );

  const { data: profile } = useOfflineQuery(
    ['profile', user?.id ?? ''],
    async () => {
      const { data } = await supabase.from('profiles').select('avatar_url, display_name').eq('user_id', user!.id).single();
      return data;
    },
    { enabled: !!user }
  );

  const { data: insurerPhones = {} } = useOfflineQuery<Record<string, string>>(
    ['insurer-phones'],
    async () => {
      const { data } = await supabase.from('insurance_companies').select('name, phone');
      const map: Record<string, string> = {};
      data?.forEach((ic: any) => { if (ic.phone) map[ic.name] = ic.phone; });
      return map;
    },
    { enabled: !!user }
  );

  const { data: recentDocuments = [] } = useOfflineQuery<any[]>(
    ['recent-documents', user?.id ?? ''],
    async () => {
      const { data } = await supabase
        .from('user_documents')
        .select('id, file_name, category, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    { enabled: !!user }
  );

  const { data: nearbyShops = [] } = useOfflineQuery<any[]>(
    ['top-panel-shops'],
    async () => {
      const { data } = await supabase
        .from('panel_shops')
        .select('id, name, city, region, phone, google_rating')
        .gte('google_rating', 4.7)
        .order('google_rating', { ascending: false })
        .limit(4);
      return data || [];
    },
    { enabled: !!user }
  );

  const featuredArticles = useMemo(() => blogArticles.slice(0, 2), []);

  const avatarUrl = profile?.avatar_url || '';
  const displayName = profile?.display_name || '';
  const firstName = displayName ? displayName.split(' ')[0] : 'there';

  // Upcoming expiries from vehicle WOF/Rego/Insurance
  const upcomingExpiries = useMemo(() => {
    const items: { vehicleId: string; slug?: string; rego: string; label: string; date: string; days: number }[] = [];
    vehicles.forEach(v => {
      const fields: [string, string | undefined][] = [
        ['WOF', v.wofExpiry],
        ['Rego', v.regoExpiry],
        ['Insurance', v.insuranceExpiry],
      ];
      fields.forEach(([label, date]) => {
        const d = daysUntil(date);
        if (d !== null && d <= 60) {
          items.push({ vehicleId: v.id, slug: v.slug, rego: v.regoNumber, label, date: date!, days: d });
        }
      });
    });
    return items.sort((a, b) => a.days - b.days).slice(0, 5);
  }, [vehicles]);

  // Recent activity from claims
  const recentActivity = useMemo(() => {
    return [...claims]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 4);
  }, [claims]);

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleOpenTowSheet = () => {
    setTowSheetOpen(true);
    setTowSearch('');
    supabase.from('tow_companies').select('*').then(({ data }) => {
      if (data) setTowCompanies(data);
    });
    import('@/lib/geolocation').then(({ getCurrentPosition }) => {
      getCurrentPosition({ timeout: 10000 }).then(async ({ latitude, longitude }) => {
        setUserLat(latitude);
        setUserLng(longitude);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const geo = await res.json();
          const city = geo.address?.city || geo.address?.town || geo.address?.suburb || '';
          const region = geo.address?.state || geo.address?.region || '';
          setUserCity(city);
          setUserRegion(region);
        } catch { /* ignore */ }
      }).catch((err: Error) => {
        if (err.message.includes('denied')) {
          toast.error('Location access denied. Please enable location permissions to see nearby tow companies.', { duration: 6000 });
        }
      });
    });
  };

  const sortByDistance = (list: any[]) => {
    if (userLat == null || userLng == null) return list;
    return [...list].sort((a, b) => {
      const distA = (a.latitude && a.longitude) ? haversineDistance(userLat, userLng, a.latitude, a.longitude) : Infinity;
      const distB = (b.latitude && b.longitude) ? haversineDistance(userLat, userLng, b.latitude, b.longitude) : Infinity;
      return distA - distB;
    });
  };

  const getDistanceLabel = (tc: any) => {
    if (userLat == null || userLng == null || !tc.latitude || !tc.longitude) return null;
    const d = haversineDistance(userLat, userLng, tc.latitude, tc.longitude);
    return d < 1 ? `${Math.round(d * 1000)}m away` : `${Math.round(d)}km away`;
  };

  const getDisplayedTowCompanies = () => {
    if (towSearch) {
      const filtered = towCompanies.filter(tc =>
        tc.name.toLowerCase().includes(towSearch.toLowerCase()) ||
        tc.address.toLowerCase().includes(towSearch.toLowerCase())
      );
      return sortByDistance(filtered.length > 0 ? filtered : towCompanies);
    }
    if (userCity || userRegion) {
      const byCity = towCompanies.filter(tc => tc.address.toLowerCase().includes(userCity.toLowerCase()));
      if (byCity.length > 0) return sortByDistance(byCity);
      const byRegion = towCompanies.filter(tc => tc.address.toLowerCase().includes(userRegion.toLowerCase()));
      if (byRegion.length > 0) return sortByDistance(byRegion);
    }
    return sortByDistance(towCompanies);
  };

  const displayedTowCompanies = getDisplayedTowCompanies();

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
  const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } } };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  // Sidebar — quick actions for tablet/desktop
  const QuickActions = () => (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <div className="px-3.5 pt-3 pb-2 text-[11px] font-medium text-muted-foreground">Quick actions</div>
      <div className="divide-y divide-border">
        <button
          onClick={handleOpenTowSheet}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors text-left"
        >
          <div className="w-7 h-7 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0">
            <Phone className="w-3.5 h-3.5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-foreground">Call tow truck</div>
            <div className="text-[11px] text-muted-foreground">24/7 nearby companies</div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
        </button>
        <a href="tel:111" className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <Shield className="w-3.5 h-3.5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-foreground">Call police</div>
            <div className="text-[11px] text-muted-foreground">Emergency 111</div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
        </a>
        <Link to="/claims/new" className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-foreground">Report incident</div>
            <div className="text-[11px] text-muted-foreground">Start a new claim</div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
        </Link>
        <Link to="/vehicles/new" className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-foreground">Add vehicle</div>
            <div className="text-[11px] text-muted-foreground">Speeds up reporting</div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
        </Link>
      </div>
    </div>
  );

  const UpcomingPanel = () => (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <div className="px-3.5 pt-3 pb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">Upcoming expiries</span>
        <Link to="/vehicles" className="text-[11px] font-medium text-accent hover:opacity-80">All</Link>
      </div>
      {upcomingExpiries.length === 0 ? (
        <div className="px-3.5 pb-3.5 text-[12px] text-muted-foreground">Nothing due in the next 60 days.</div>
      ) : (
        <div className="divide-y divide-border">
          {upcomingExpiries.map((it, i) => (
            <Link
              key={i}
              to={`/vehicles/${it.slug || it.vehicleId}/edit`}
              className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors"
            >
              <StatusDot days={it.days} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-foreground truncate">
                  <span className="opacity-60">{it.label}</span> · {it.rego}
                </div>
                <div className="text-[11px] text-muted-foreground tabular-nums">{it.date}</div>
              </div>
              <span className={`text-[12px] font-medium tabular-nums ${
                it.days < 0 ? 'text-destructive' : it.days <= 30 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'
              }`}>
                {it.days < 0 ? `${Math.abs(it.days)}d over` : it.days === 0 ? 'today' : `${it.days}d`}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const ActivityPanel = () => (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <div className="px-3.5 pt-3 pb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">Recent activity</span>
        <Link to="/claims" className="text-[11px] font-medium text-accent hover:opacity-80">All</Link>
      </div>
      {recentActivity.length === 0 ? (
        <div className="px-3.5 pb-3.5 text-[12px] text-muted-foreground">No claims yet.</div>
      ) : (
        <div className="divide-y divide-border">
          {recentActivity.map(c => (
            <Link key={c.id} to={`/claims/${(c as any).reportNumber || c.id}`} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors">
              <Activity className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" strokeWidth={2} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-foreground truncate">
                  {c.userClaimNumber
                    ? `#${c.userClaimNumber}`
                    : (c as any).reportNumber
                      ? `#${(c as any).reportNumber}`
                      : (c.status === 'draft' ? 'Draft' : 'Report')}
                  {' '}<span className="opacity-70 capitalize">· {c.status === 'draft' ? 'draft' : 'submitted'}</span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {(() => {
                    const raw = c.updatedAt || c.createdAt;
                    const d = raw ? new Date(raw) : null;
                    return d && !isNaN(d.getTime())
                      ? formatDistanceToNow(d, { addSuffix: true })
                      : '—';
                  })()}
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const ProfilePanel = () => (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <Link to="/profile" className="flex items-center gap-3 px-3.5 py-3 hover:bg-muted/50 transition-colors">
        <Avatar className="w-9 h-9">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="bg-muted text-foreground text-[11px] font-semibold">
            {displayName ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : <User className="w-4 h-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-foreground truncate">{displayName || 'Your profile'}</div>
          <div className="text-[11px] text-muted-foreground truncate">View & edit details</div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
      </Link>
      {isAdmin && (
        <Link to="/admin" className="flex items-center gap-3 px-3.5 py-2.5 border-t border-border hover:bg-muted/50 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0">
            <Shield className="w-3.5 h-3.5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-foreground">Admin overview</div>
            <div className="text-[11px] text-muted-foreground">Users, vehicles, reports</div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
        </Link>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="theme-dashboard relative">
        <motion.div className="relative space-y-6 md:space-y-8 md:-mt-5" variants={stagger} initial="hidden" animate="visible">
          {/* Mobile-only header */}
          <motion.div variants={fadeUp} className="relative flex items-start justify-between gap-3 pt-2 md:hidden">
            <div className="signal-arc pointer-events-none absolute -top-8 -right-16 w-44 h-44 opacity-95" aria-hidden="true" />
            <div className="min-w-0 relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{greeting}, {firstName}</p>
              <h1 className="text-[32px] leading-[1.05] font-extrabold text-foreground tracking-[-0.03em] mt-2">
                What needs<br />your attention?
              </h1>
            </div>
            <Link to="/profile" className="shrink-0">
              <Avatar className="w-11 h-11 ring-1 ring-border">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-muted text-foreground text-[11px] font-semibold">
                  {displayName ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
            </Link>
          </motion.div>

          {/* Body — sidebar + main on tablet+ */}
          <div className="md:grid md:grid-cols-[260px_1fr] md:gap-6 lg:grid-cols-[280px_1fr] lg:gap-8 space-y-6 md:space-y-0">
            {/* Left rail — tablet & desktop only; greeting moves into this column to fill the empty space */}
            <motion.aside variants={fadeUp} className="hidden md:block space-y-4">
              <div>
                <p className="text-[12px] text-muted-foreground">{greeting}</p>
                <h1 className="text-[24px] leading-tight font-semibold text-foreground tracking-[-0.02em] truncate mt-1">
                  {firstName}.
                </h1>
              </div>
              <QuickActions />
              <UpcomingPanel />
              <ActivityPanel />
              <ProfilePanel />
            </motion.aside>

            {/* Main column */}
            <div className="space-y-6">
              {/* Mobile hero action tiles — kept as-is for mobile */}
              <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 md:hidden">
                <button
                  onClick={() => setAccidentSheetOpen(true)}
                  className="rounded-2xl bg-foreground text-background p-5 text-left transition-all active:scale-[0.98] min-h-[140px] flex flex-col justify-between"
                >
                  <div className="w-10 h-10 rounded-xl bg-background/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold leading-tight">Had<br/>accident?</div>
                    <div className="text-[11px] text-background/60 mt-1.5">Tow or report now</div>
                  </div>
                </button>
                <a href="tel:111" className="rounded-2xl text-destructive-foreground p-5 transition-all active:scale-[0.98] flex flex-col justify-between min-h-[140px] bg-accent">
                  <div className="w-10 h-10 rounded-xl bg-destructive-foreground/15 flex items-center justify-center">
                    <Shield className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold leading-tight">Call<br/>police</div>
                    <div className="text-[11px] text-destructive-foreground/75 mt-1.5">Emergency 111</div>
                  </div>
                </a>
              </motion.div>

              {/* Vehicle cards — Apple/Linear flat thumbnails */}
              {vehicles.length > 0 && (
                <motion.div variants={fadeUp} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[15px] font-semibold text-foreground tracking-[-0.01em]">Your vehicles</h2>
                    <Link to="/vehicles" className="text-[12px] font-medium text-accent hover:opacity-80 inline-flex items-center gap-0.5">
                      See all <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {vehicles.map(v => {
                      const insurerPhone = v.insuranceCompany ? insurerPhones[v.insuranceCompany] : '';
                      const rings = [
                        { label: 'WOF', d: daysUntil(v.wofExpiry) },
                        { label: 'Rego', d: daysUntil(v.regoExpiry) },
                        { label: 'Ins', d: daysUntil(v.insuranceExpiry) },
                      ];
                      const worst = rings.reduce<number | null>((acc, r) => {
                        if (r.d === null) return acc;
                        return acc === null || r.d < acc ? r.d : acc;
                      }, null);
                      const alert = worst !== null && worst <= 30;
                      return (
                        <div
                          key={v.id}
                          className={`relative rounded-3xl bg-card border p-4 overflow-hidden transition-all ${alert ? 'border-destructive/30' : 'border-border/70'}`}
                        >
                          <div
                            aria-hidden="true"
                            className={`pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl ${alert ? 'bg-destructive/10' : 'bg-primary/10'}`}
                          />
                          <Link to={`/vehicles/${v.slug || v.id}/edit`} className="relative flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 overflow-hidden flex items-center justify-center shrink-0">
                              {v.photoUrl ? (
                                <img src={v.photoUrl} alt={`${v.make} ${v.model}`} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <Car className="w-5 h-5 text-primary" strokeWidth={1.8} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[16px] font-extrabold text-foreground truncate tracking-[-0.02em] tabular-nums">{v.regoNumber}</div>
                              <div className="text-[12px] text-muted-foreground truncate">{v.year} {v.make} {v.model}</div>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </Link>

                          <div className="relative grid grid-cols-3 gap-2 mt-4">
                            {rings.map(({ label, d }) => (
                              <Link
                                key={label}
                                to={`/vehicles/${v.slug || v.id}/edit`}
                                className="flex flex-col items-center gap-1.5 rounded-2xl py-2.5 hover:bg-muted/50 active:scale-[0.97] transition-all"
                              >
                                <ExpiryRing days={d} />
                                <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${d !== null && d < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  {d !== null && d < 0 ? `${label} over` : label}
                                </span>
                              </Link>
                            ))}
                          </div>

                          <div className="relative flex gap-2 mt-3">
                            <Link
                              to={`/claims/new?vehicleId=${v.id}`}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-foreground text-background text-[12px] font-semibold active:scale-[0.98] transition-transform"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.2} /> Report
                            </Link>
                            {insurerPhone ? (
                              <a
                                href={`tel:${insurerPhone.replace(/\s/g, '')}`}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-primary/10 text-primary text-[12px] font-semibold active:scale-[0.98] transition-transform"
                              >
                                <Phone className="w-3.5 h-3.5" strokeWidth={2.2} /> Insurer
                              </a>
                            ) : (
                              <Link
                                to={`/vehicles/${v.slug || v.id}/edit`}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-muted text-muted-foreground text-[12px] font-semibold active:scale-[0.98] transition-transform"
                              >
                                <Plus className="w-3.5 h-3.5" strokeWidth={2.2} /> Insurer
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <Link
                      to="/vehicles/new"
                      className="rounded-3xl border border-dashed border-primary/30 bg-primary/[0.04] flex flex-col items-center justify-center gap-2 py-8 text-primary hover:bg-primary/10 transition-colors min-h-[140px]"
                    >
                      <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Plus className="w-5 h-5" strokeWidth={2} />
                      </span>
                      <span className="text-[12px] font-semibold">Add vehicle</span>
                    </Link>
                  </div>
                </motion.div>
              )}

              {vehicles.length === 0 && (
                <motion.div variants={fadeUp} className="rounded-xl bg-card border border-border p-10 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground mx-auto mb-4 flex items-center justify-center">
                    <Car className="w-6 h-6" strokeWidth={1.6} />
                  </div>
                  <p className="text-[15px] font-semibold text-foreground">No vehicles yet</p>
                  <p className="text-[13px] text-muted-foreground mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                    Add your vehicles to speed up incident reporting.
                  </p>
                  <Link
                    to="/vehicles/new"
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 mt-4 text-[13px] font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    <Plus className="w-4 h-4" strokeWidth={2.2} /> Add vehicle
                  </Link>
                </motion.div>
              )}

              {/* Tablet/Desktop-only widgets to fill space */}
              <motion.div variants={fadeUp} className="hidden md:grid md:grid-cols-2 gap-4">
                {/* Document vault snapshot */}
                <div className="rounded-xl bg-card border border-border overflow-hidden flex flex-col">
                  <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                      <span className="text-[12px] font-medium text-foreground">Document vault</span>
                    </div>
                    <Link to="/documents" className="text-[11px] font-medium text-accent hover:opacity-80">All</Link>
                  </div>
                  {recentDocuments.length === 0 ? (
                    <div className="px-4 pb-4 pt-1 flex-1 flex flex-col items-center justify-center text-center">
                      <p className="text-[12px] text-muted-foreground leading-relaxed max-w-[220px]">
                        Keep your license, insurance & registration safe and accessible anytime.
                      </p>
                      <Link
                        to="/documents"
                        className="inline-flex items-center gap-1.5 h-8 px-3 mt-3 text-[12px] font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.2} /> Upload
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-border flex-1">
                      {recentDocuments.map((d) => (
                        <Link
                          key={d.id}
                          to="/documents"
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5" strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-foreground truncate">{d.file_name || 'Document'}</div>
                            <div className="text-[11px] text-muted-foreground capitalize truncate">
                              {d.category || 'Other'}
                              {(() => {
                                const dt = d.created_at ? new Date(d.created_at) : null;
                                return dt && !isNaN(dt.getTime())
                                  ? ` · ${formatDistanceToNow(dt, { addSuffix: true })}`
                                  : '';
                              })()}
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nearby services — panel shops + tow */}
                <div className="rounded-xl bg-card border border-border overflow-hidden flex flex-col">
                  <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                      <span className="text-[12px] font-medium text-foreground">Top-rated panel shops</span>
                    </div>
                    <Link to="/panel-shops" className="text-[11px] font-medium text-accent hover:opacity-80">All</Link>
                  </div>
                  {nearbyShops.length === 0 ? (
                    <div className="px-4 pb-4 text-[12px] text-muted-foreground">Loading…</div>
                  ) : (
                    <div className="divide-y divide-border flex-1">
                      {nearbyShops.slice(0, 3).map((s) => (
                        <Link
                          key={s.id}
                          to="/panel-shops"
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                            <Wrench className="w-3.5 h-3.5" strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-foreground truncate">{s.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{s.city}{s.region ? ` · ${s.region}` : ''}</div>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground/70 tabular-nums shrink-0">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" strokeWidth={0} />
                            {Number(s.google_rating).toFixed(1)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={handleOpenTowSheet}
                    className="flex items-center gap-2 px-4 py-2.5 border-t border-border text-[12px] font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Truck className="w-3.5 h-3.5" strokeWidth={2} /> Need a tow truck?
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 ml-auto" />
                  </button>
                </div>
              </motion.div>

              {/* Tips & blog highlights — full width on tablet/desktop */}
              <motion.div variants={fadeUp} className="hidden md:block">
                <div className="rounded-xl bg-card border border-border overflow-hidden">
                  <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                      <span className="text-[12px] font-medium text-foreground">Tips & guides</span>
                    </div>
                    <Link to="/blog" className="text-[11px] font-medium text-accent hover:opacity-80">All articles</Link>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
                    {featuredArticles.map((a) => (
                      <Link
                        key={a.slug}
                        to={`/blog/${a.slug}`}
                        className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors group"
                      >
                        <img
                          src={a.heroImage}
                          alt={a.title}
                          loading="lazy"
                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                            <BookOpen className="w-3 h-3" strokeWidth={2} />
                            <span>{a.readTime}</span>
                          </div>
                          <div className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                            {a.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {a.excerpt}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </motion.div>


              <motion.div variants={fadeUp} className="md:hidden space-y-3">
                {upcomingExpiries.length > 0 && (
                  <div className="rounded-xl bg-card border border-border overflow-hidden">
                    <div className="px-3.5 pt-3 pb-2 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-muted-foreground">Upcoming expiries</span>
                      <Link to="/vehicles" className="text-[11px] font-medium text-accent">All</Link>
                    </div>
                    <div className="divide-y divide-border">
                      {upcomingExpiries.slice(0, 3).map((it, i) => (
                        <Link key={i} to={`/vehicles/${it.slug || it.vehicleId}/edit`} className="flex items-center gap-3 px-3.5 py-2.5">
                          <StatusDot days={it.days} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-foreground truncate">
                              <span className="opacity-60">{it.label}</span> · {it.rego}
                            </div>
                          </div>
                          <span className={`text-[12px] font-medium tabular-nums ${
                            it.days < 0 ? 'text-destructive' : it.days <= 30 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'
                          }`}>
                            {it.days < 0 ? `${Math.abs(it.days)}d over` : it.days === 0 ? 'today' : `${it.days}d`}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {isAdmin && (
                  <Link to="/admin" className="rounded-xl bg-card border border-border p-4 flex items-center gap-3 hover:border-foreground/20 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4 text-background" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-foreground">Admin overview</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Manage users, vehicles & reports</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" strokeWidth={1.8} />
                  </Link>
                )}
              </motion.div>

              {/* Family quick card — bottom of main column */}
              <motion.div variants={fadeUp}>
                <Link
                  to="/family"
                  className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-foreground/20 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-foreground tracking-[-0.01em]">
                      {familyInfo?.inFamily ? 'Your family' : 'Invite your family'}
                    </div>
                    <div className="text-[12px] text-muted-foreground truncate">
                      {familyInfo?.inFamily
                        ? `${familyInfo.memberCount} member${familyInfo.memberCount === 1 ? '' : 's'} · share vehicles & reports`
                        : 'Share vehicles, reports and reminders with your household'}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      <Sheet open={accidentSheetOpen} onOpenChange={setAccidentSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <SheetHeader className="px-5 pt-5 pb-2">
            <SheetTitle className="text-left flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-foreground" />
              Had an accident?
            </SheetTitle>
            <p className="text-[13px] text-muted-foreground text-left">What would you like to do first?</p>
          </SheetHeader>
          <div className="px-5 pb-6 pt-3 space-y-2.5">
            <Link
              to="/claims/quick-capture"
              onClick={() => setAccidentSheetOpen(false)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white text-left active:scale-[0.99] transition-transform shadow-lg shadow-orange-500/20"
            >
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" strokeWidth={2.2} fill="currentColor" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold leading-tight flex items-center gap-1.5 flex-wrap">
                  Quick capture
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/20 font-bold">Recommended</span>
                </div>
                <div className="text-[12px] text-white/90 mt-0.5">Guided photos · auto GPS &amp; time</div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/80 shrink-0" />
            </Link>
            <a
              href="tel:111"
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-600 text-white text-left active:scale-[0.99] transition-transform"
            >
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Ambulance className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold leading-tight">Call an ambulance</div>
                <div className="text-[12px] text-white/80 mt-0.5">Emergency services — dial 111</div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/70 shrink-0" />
            </a>
            <button
              onClick={handleOpenTowSheet}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-foreground text-background text-left active:scale-[0.99] transition-transform"
            >
              <div className="w-11 h-11 rounded-xl bg-background/10 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold leading-tight">Call a tow truck</div>
                <div className="text-[12px] text-background/60 mt-0.5">See nearby 24/7 tow companies</div>
              </div>
              <ChevronRight className="w-5 h-5 text-background/60 shrink-0" />
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={towSheetOpen} onOpenChange={setTowSheetOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0 flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <SheetHeader className="px-5 pt-5 pb-3 shrink-0">
            <SheetTitle className="text-left flex items-center gap-2">
              <Phone className="w-5 h-5 text-foreground" />
              Tow Companies Near You
            </SheetTitle>
          </SheetHeader>
          <div className="px-5 pb-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or location..."
                value={towSearch}
                onChange={e => setTowSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {towSearch && (
                <button onClick={() => setTowSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            {userCity && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>Detected location: {userCity}</span>
              </div>
            )}
          </div>
          <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-2">
            {displayedTowCompanies.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No tow companies found</div>
            ) : (
              displayedTowCompanies.map(tc => (
                <div key={tc.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-foreground/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{tc.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{tc.address}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{tc.phone}</div>
                    {getDistanceLabel(tc) && (
                      <div className="text-xs font-medium text-primary mt-0.5">{getDistanceLabel(tc)}</div>
                    )}
                  </div>
                  <a
                    href={`tel:${tc.phone.replace(/\s/g, '')}`}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-foreground text-background whitespace-nowrap hover:bg-foreground/90 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call
                  </a>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
