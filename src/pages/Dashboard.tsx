import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, FileText, Plus, AlertTriangle, ChevronRight, ArrowUpRight, LogOut, User, Shield, Phone, Search, MapPin, X, MessageSquare, ArrowDownRight, FolderOpen } from 'lucide-react';
import crashIcon from '@/assets/crash-icon.png';
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
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { user, signOut, isAdmin } = useAuth();
  
  const [towSheetOpen, setTowSheetOpen] = useState(false);
  const [towCompanies, setTowCompanies] = useState<any[]>([]);
  const [towSearch, setTowSearch] = useState('');
  const [userCity, setUserCity] = useState('');
  const [userRegion, setUserRegion] = useState('');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  const { data: vehicles = [], isLoading: vehiclesLoading } = useOfflineQuery<Vehicle[]>(
    ['vehicles', user?.id ?? ''],
    () => getVehicles(user!.id),
    { enabled: !!user }
  );

  const { data: claims = [], isLoading: claimsLoading } = useOfflineQuery<ClaimReport[]>(
    ['claims', user?.id ?? ''],
    () => getClaims(user!.id),
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

  const avatarUrl = profile?.avatar_url || '';
  const displayName = profile?.display_name || '';

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
      const byCity = towCompanies.filter(tc =>
        tc.address.toLowerCase().includes(userCity.toLowerCase())
      );
      if (byCity.length > 0) return sortByDistance(byCity);
      const byRegion = towCompanies.filter(tc =>
        tc.address.toLowerCase().includes(userRegion.toLowerCase())
      );
      if (byRegion.length > 0) return sortByDistance(byRegion);
    }
    return sortByDistance(towCompanies);
  };

  const displayedTowCompanies = getDisplayedTowCompanies();

  const firstName = displayName ? displayName.split(' ')[0] : 'there';

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
  const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } };

  const recentMessages: any[] = [];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <AppLayout>
      <div className="theme-dashboard-dark">
      <motion.div className="space-y-7" variants={stagger} initial="hidden" animate="visible">
        {/* Header — eyebrow + display name + avatar */}
        <motion.div variants={fadeUp} className="flex items-start justify-between gap-3 pt-1">
          <div className="min-w-0">
            <p className="eyebrow">{greeting}</p>
            <h1 className="display-heading mt-1.5 truncate">{firstName}.</h1>
          </div>
          <Link to="/profile" className="shrink-0">
            <Avatar className="w-12 h-12 ring-2 ring-border">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-muted text-foreground text-xs font-bold">
                {displayName ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : <User className="w-4 h-4" />}
              </AvatarFallback>
            </Avatar>
          </Link>
        </motion.div>

        {/* Vehicle cards rail — horizontal scroll */}
        {vehicles.length > 0 && (
          <motion.div variants={fadeUp} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="eyebrow">Vehicle cards</p>
              <Link to="/vehicles" className="text-[12px] font-semibold text-primary hover:opacity-80">See all</Link>
            </div>
            <div className="-mx-4 px-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <div className="flex gap-3 pb-1 w-max">
                {vehicles.map((v) => {
                  const insurerPhone = v.insuranceCompany ? insurerPhones[v.insuranceCompany] : '';
                  return (
                    <Link
                      key={v.id}
                      to="/vehicles"
                      className="w-[220px] shrink-0 rounded-2xl bg-card border border-border p-3 flex flex-col gap-2.5 transition-all active:scale-[0.98] hover:border-primary/40"
                    >
                      <div className="aspect-[16/10] rounded-xl bg-muted overflow-hidden flex items-center justify-center">
                        {v.photoUrl ? (
                          <img src={v.photoUrl} alt={`${v.make} ${v.model}`} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Car className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-foreground truncate">{v.year} {v.make}</div>
                        <div className="text-[11px] text-muted-foreground truncate uppercase tracking-wider mt-0.5">{v.regoNumber} · {v.model}</div>
                      </div>
                      {insurerPhone && (
                        <a
                          href={`tel:${insurerPhone.replace(/\s/g, '')}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground/80 hover:text-primary"
                        >
                          <Phone className="w-3 h-3" />
                          {insurerPhone}
                        </a>
                      )}
                    </Link>
                  );
                })}
                <Link
                  to="/vehicles/new"
                  className="w-[140px] shrink-0 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                >
                  <Plus className="w-6 h-6" strokeWidth={1.8} />
                  <span className="text-[11px] font-semibold">Add vehicle</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Hero action tiles */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
          <button
            onClick={handleOpenTowSheet}
            className="group relative overflow-hidden rounded-2xl bg-foreground text-background p-5 text-left transition-all active:scale-[0.98] min-h-[148px] flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-background/10 flex items-center justify-center">
              <Phone className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <div className="text-[15px] font-bold leading-tight">Call tow<br/>truck</div>
              <div className="text-[11px] text-background/60 mt-1.5 font-medium">24/7 emergency</div>
            </div>
          </button>
          <Link
            to="/claims/new"
            className="group relative overflow-hidden rounded-2xl bg-primary text-primary-foreground p-5 transition-all active:scale-[0.98] block min-h-[148px] flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <div className="text-[15px] font-bold leading-tight">Report<br/>incident</div>
              <div className="text-[11px] text-primary-foreground/75 mt-1.5 font-medium">File a claim</div>
            </div>
          </Link>
        </motion.div>

        {/* OVERVIEW */}
        <motion.div variants={fadeUp} className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="eyebrow">Overview</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/vehicles" className="card-soft group transition-all active:scale-[0.98] hover:border-foreground/25">
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <Car className="w-[18px] h-[18px] text-foreground" strokeWidth={2} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
              </div>
              {vehiclesLoading ? <Skeleton className="h-9 w-12" /> : (
                <div className="text-[34px] font-extrabold tabular-nums text-foreground leading-none tracking-tight">{vehicles.length}</div>
              )}
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mt-2">Vehicles</div>
            </Link>
            <Link to="/claims" className="card-soft group transition-all active:scale-[0.98] hover:border-foreground/25">
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <FileText className="w-[18px] h-[18px] text-foreground" strokeWidth={2} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
              </div>
              {claimsLoading ? <Skeleton className="h-9 w-12" /> : (
                <div className="text-[34px] font-extrabold tabular-nums text-foreground leading-none tracking-tight">{claims.length}</div>
              )}
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mt-2">Reports</div>
            </Link>
          </div>
        </motion.div>

        {/* Insurance section */}
        {vehicles.filter(v => v.insuranceCompany).length > 0 && (
          <motion.div variants={fadeUp} className="space-y-3">
            <p className="eyebrow px-1">Your insurance</p>
            <div className="space-y-2.5">
              {vehicles.filter(v => v.insuranceCompany).map((v) => (
                <div
                  key={v.id}
                  className="card-soft flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Shield className="w-[18px] h-[18px] text-foreground" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">{v.insuranceCompany}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {v.year} {v.make} {v.model} · {v.regoNumber}
                    </div>
                  </div>
                  {insurerPhones[v.insuranceCompany] && (
                    <a
                      href={`tel:${insurerPhones[v.insuranceCompany].replace(/\s/g, '')}`}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call
                    </a>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {recentMessages.length > 0 && (
          <motion.div variants={fadeUp} className="rounded-2xl bg-card border border-border p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-foreground" />
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Recent Messages</span>
            </div>
            {recentMessages.map(msg => (
              <Link key={msg.id} to={`/claims/${msg.claim_id}`}
                className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-muted/50 transition-colors -mx-1">
                <ArrowDownRight className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${msg.direction === 'inbound' ? 'text-primary' : 'text-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{msg.subject || '(No subject)'}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{msg.body?.slice(0, 80)}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {msg.direction === 'inbound' ? msg.from_email : 'You'} · {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 mt-1 shrink-0" />
              </Link>
            ))}
          </motion.div>
        )}

        {/* Admin */}
        {isAdmin && (
          <motion.div variants={fadeUp}>
            <Link to="/admin" className="rounded-2xl bg-card border border-border p-4 flex items-center gap-3 group hover:border-foreground/20 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-background" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">Admin Overview</div>
                <div className="text-xs text-muted-foreground mt-0.5">Manage users, vehicles & reports</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" strokeWidth={1.8} />
            </Link>
          </motion.div>
        )}
      </motion.div>
      </div>

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
