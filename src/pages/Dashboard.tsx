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
/** Dark premium garage card — car icon, name, rego and soonest-expiry pill. */
function VehicleCard({
  vehicle,
  index,
  onTap,
  insurerPhones,
}: {
  vehicle: Vehicle;
  index: number;
  onTap: (v: Vehicle, kind: RingKind) => void;
  insurerPhones: Record<string, string>;
}) {
  const expiries: { kind: RingKind; label: string; days: number | null }[] = [
    { kind: 'WOF', label: 'WOF', days: daysUntil(vehicle.wofExpiry) },
    { kind: 'Rego', label: 'Rego', days: daysUntil(vehicle.regoExpiry) },
    { kind: 'Ins', label: 'Insurance', days: daysUntil(vehicle.insuranceExpiry) },
  ];
  const soonest = expiries
    .filter(e => e.days !== null)
    .sort((a, b) => (a.days! - b.days!))[0] ?? null;

  const pill = soonest === null
    ? { text: 'Add expiries', dot: 'bg-muted-foreground/50', cls: 'text-muted-foreground' }
    : soonest.days! < 0
      ? { text: `${soonest.label} overdue ${Math.abs(soonest.days!)}d`, dot: 'bg-red-400', cls: 'text-red-300' }
      : soonest.days! === 0
        ? { text: `${soonest.label} due today`, dot: 'bg-amber-400', cls: 'text-amber-300' }
        : soonest.days! <= 30
          ? { text: `${soonest.label} due in ${soonest.days}d`, dot: 'bg-amber-400', cls: 'text-amber-300' }
          : { text: `${soonest.label} due in ${soonest.days}d`, dot: 'bg-emerald-400', cls: 'text-emerald-300' };

  // Alternate subtle accent glow per card
  const glow = index % 2 === 0 ? 'bg-primary/30' : 'bg-accent/30';
  const insurerPhone = vehicle.insuranceCompany ? insurerPhones[vehicle.insuranceCompany] : null;

  return (
    <button
      onClick={() => onTap(vehicle, soonest?.kind ?? 'WOF')}
      className="relative shrink-0 w-[188px] rounded-3xl bg-foreground text-background p-3 text-left overflow-hidden active:scale-[0.97] transition-transform"
    >
      <div aria-hidden="true" className={`pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl ${glow}`} />
      <div className="relative flex items-start gap-3">
        <span className="shrink-0 w-11 h-11 rounded-2xl bg-background/10 flex items-center justify-center overflow-hidden">
          {vehicle.photoUrl ? (
            <img src={vehicle.photoUrl} alt={`${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <Car className="w-5 h-5 text-primary" strokeWidth={1.8} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="min-w-0">
            <div className="text-[14px] font-bold truncate tracking-[-0.01em]">{vehicle.make} {vehicle.model}</div>
            <div className="text-[11px] text-background/50 tabular-nums mt-0.5">{vehicle.regoNumber}</div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-background/10 px-2.5 py-1 text-[10px] font-semibold ${pill.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} />
          {pill.text}
        </span>
        {insurerPhone ? (
          <a
            href={`tel:${insurerPhone}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center active:scale-90 transition-transform"
            aria-label={`Call ${vehicle.insuranceCompany}`}
          >
            <Phone className="w-3 h-3" strokeWidth={2.2} />
          </a>
        ) : (
          <span className="text-background/40 text-base leading-none tracking-widest">···</span>
        )}
      </div>
    </button>
  );
}



export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  const [towSheetOpen, setTowSheetOpen] = useState(false);
  const [vehicleAction, setVehicleAction] = useState<{ vehicle: Vehicle; ring: RingKind } | null>(null);
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

  /** Smart expiry alerts — overdue or due within 30 days, soonest first. */
  const expiryAlerts = useMemo(() => {
    const items: { vehicle: Vehicle; kind: RingKind; label: string; days: number }[] = [];
    vehicles.forEach(v => {
      ([
        ['WOF', 'WOF', v.wofExpiry],
        ['Rego', 'Rego', v.regoExpiry],
        ['Ins', 'Insurance', v.insuranceExpiry],
      ] as [RingKind, string, string | undefined][]).forEach(([kind, label, date]) => {
        const d = daysUntil(date);
        if (d !== null && d <= 30) items.push({ vehicle: v, kind, label, days: d });
      });
    });
    return items.sort((a, b) => a.days - b.days);
  }, [vehicles]);



  const avatarUrl = profile?.avatar_url || '';
  const displayName = profile?.display_name || '';
  const firstName = displayName ? displayName.split(' ')[0] : 'there';

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
              <ActivityPanel />
              <ProfilePanel />
            </motion.aside>

            {/* Main column */}
            <div className="space-y-6">
              {/* Smart expiry alert banner */}
              {expiryAlerts.length > 0 && (() => {
                const top = expiryAlerts[0];
                const overdue = top.days < 0;
                return (
                  <motion.div
                    variants={fadeUp}
                    className={`rounded-2xl border p-4 ${overdue ? 'border-destructive/30 bg-destructive/[0.06]' : 'border-amber-500/30 bg-amber-500/[0.08]'}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${overdue ? 'bg-destructive/15 text-destructive' : 'bg-amber-500/15 text-amber-600'}`}>
                        <CalendarClock className="w-4.5 h-4.5" strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold text-foreground tracking-[-0.01em]">
                          {top.vehicle.regoNumber} · {top.label}{' '}
                          {overdue
                            ? `overdue by ${Math.abs(top.days)} day${Math.abs(top.days) === 1 ? '' : 's'}`
                            : top.days === 0
                              ? 'due today'
                              : `due in ${top.days} day${top.days === 1 ? '' : 's'}`}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          {expiryAlerts.length > 1
                            ? `${expiryAlerts.length - 1} other item${expiryAlerts.length - 1 === 1 ? '' : 's'} need attention soon.`
                            : 'Keep your vehicle road legal and covered.'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Link
                            to={`/vehicles/${top.vehicle.slug || top.vehicle.id}/edit`}
                            className="inline-flex items-center gap-1 rounded-full bg-foreground text-background px-3 py-1.5 text-[12px] font-semibold active:scale-[0.97] transition-transform"
                          >
                            Update {top.label} <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                          {expiryAlerts.length > 1 && (
                            <Link to="/vehicles" className="text-[12px] font-semibold text-accent">
                              View all
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}



              {/* Mobile emergency actions — big standalone circles with text inside */}
              <motion.div variants={fadeUp} className="md:hidden">
                <div className="flex items-center justify-center gap-12">
                  <button
                    onClick={() => setAccidentSheetOpen(true)}
                    className="relative flex flex-col items-center justify-center w-[120px] h-[120px] rounded-full bg-foreground text-background active:scale-[0.96] transition-transform shadow-lg shadow-foreground/15"
                  >
                    <span aria-hidden="true" className="absolute inset-2 rounded-full border border-primary/40" />
                    <span aria-hidden="true" className="absolute inset-4 rounded-full bg-primary/10" />
                    <span className="relative flex flex-col items-center justify-center text-center px-3">
                      <AlertTriangle className="w-6 h-6 text-primary mb-1" strokeWidth={2} />
                      <span className="text-[11px] font-bold leading-tight">Had an<br />accident?</span>
                    </span>
                  </button>
                  <a
                    href="tel:111"
                    className="relative flex flex-col items-center justify-center w-[120px] h-[120px] rounded-full bg-foreground text-background active:scale-[0.96] transition-transform shadow-lg shadow-foreground/15"
                  >
                    <span aria-hidden="true" className="absolute inset-2 rounded-full border border-accent/40" />
                    <span aria-hidden="true" className="absolute inset-4 rounded-full bg-accent/10" />
                    <span className="relative flex flex-col items-center justify-center text-center px-3">
                      <Shield className="w-6 h-6 text-accent mb-1" strokeWidth={2} />
                      <span className="text-[13px] font-bold leading-tight">111</span>
                      <span className="text-[10px] text-background/60 leading-tight mt-0.5">Call police</span>
                    </span>
                  </a>
                </div>
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

                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {vehicles.map((v, i) => (
                      <VehicleCard
                        key={v.id}
                        vehicle={v}
                        index={i}
                        insurerPhones={insurerPhones}
                        onTap={(veh, kind) => setVehicleAction({ vehicle: veh, ring: kind })}
                      />
                    ))}
                    <Link
                      to="/vehicles/new"
                      className="shrink-0 w-[120px] rounded-3xl border-2 border-dashed border-primary/30 bg-primary/[0.04] flex flex-col items-center justify-center gap-2 text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Plus className="w-6 h-6" strokeWidth={2} />
                      <span className="text-[12px] font-semibold">Add</span>
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


              {/* Family quick card */}
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

              <motion.div variants={fadeUp} className="md:hidden space-y-3">
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
            </div>
          </div>
        </motion.div>
      </div>

      {/* Vehicle ring action popup */}
      <Sheet open={!!vehicleAction} onOpenChange={(open) => { if (!open) setVehicleAction(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl p-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {vehicleAction && (() => {
            const v = vehicleAction.vehicle;
            const phone = v.insuranceCompany ? insurerPhones[v.insuranceCompany] : '';
            const ringDefs: { kind: RingKind; label: string; date?: string; days: number | null }[] = [
              { kind: 'WOF', label: 'WOF', date: v.wofExpiry, days: daysUntil(v.wofExpiry) },
              { kind: 'Rego', label: 'Rego', date: v.regoExpiry, days: daysUntil(v.regoExpiry) },
              { kind: 'Ins', label: 'Insurance', date: v.insuranceExpiry, days: daysUntil(v.insuranceExpiry) },
            ];
            return (
              <div className="px-5 pt-5 pb-6">
                <SheetHeader className="text-left">
                  <SheetTitle className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Car className="w-5 h-5" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[17px] font-extrabold tracking-[-0.02em] tabular-nums truncate">{v.regoNumber}</span>
                      <span className="block text-[12px] font-normal text-muted-foreground truncate">{v.year} {v.make} {v.model}</span>
                    </span>
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-4 rounded-2xl bg-muted/50 divide-y divide-border overflow-hidden">
                  {ringDefs.map(({ kind, label, date, days }) => (
                    <div key={kind} className={`flex items-center gap-3 px-4 py-3 ${vehicleAction.ring === kind ? 'bg-primary/[0.06]' : ''}`}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ringColor(days, RING_META[kind].color) }} />
                      <span className="flex-1 text-[13px] font-semibold text-foreground">{label}</span>
                      <span className="text-[12px] text-muted-foreground tabular-nums">{date || 'Not set'}</span>
                      <span className={`text-[12px] font-semibold tabular-nums ${days !== null && days < 0 ? 'text-destructive' : days !== null && days <= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                        {ringSummary(days)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <Link
                    to={`/vehicles/${v.slug || v.id}/edit`}
                    onClick={() => setVehicleAction(null)}
                    className="w-full h-11 rounded-full bg-foreground text-background text-[13px] font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <Wrench className="w-4 h-4" strokeWidth={2.2} /> Edit vehicle
                  </Link>
                  <Link
                    to={`/claims/new?vehicleId=${v.id}`}
                    onClick={() => setVehicleAction(null)}
                    className="w-full h-11 rounded-full bg-destructive/10 text-destructive text-[13px] font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  >
                    <AlertTriangle className="w-4 h-4" strokeWidth={2.2} /> Report incident
                  </Link>
                  {phone ? (
                    <a
                      href={`tel:${phone.replace(/\s/g, '')}`}
                      className="w-full h-11 rounded-full bg-primary/10 text-primary text-[13px] font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                    >
                      <Phone className="w-4 h-4" strokeWidth={2.2} /> Call {v.insuranceCompany}
                    </a>
                  ) : (
                    <Link
                      to={`/vehicles/${v.slug || v.id}/edit`}
                      onClick={() => setVehicleAction(null)}
                      className="w-full h-11 rounded-full bg-primary/10 text-primary text-[13px] font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                    >
                      <Plus className="w-4 h-4" strokeWidth={2.2} /> Add insurer
                    </Link>
                  )}
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

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
