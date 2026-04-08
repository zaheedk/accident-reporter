import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, FileText, Plus, AlertTriangle, ChevronRight, ArrowUpRight, LogOut, User, Shield, Phone, Search, MapPin, X, MessageSquare, ArrowDownRight, FolderOpen } from 'lucide-react';
import { getVehicles, getClaims } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Vehicle, ClaimReport } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { user, signOut, isAdmin } = useAuth();
  const { t } = useTranslation();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [claims, setClaims] = useState<ClaimReport[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [towSheetOpen, setTowSheetOpen] = useState(false);
  const [towCompanies, setTowCompanies] = useState<any[]>([]);
  const [towSearch, setTowSearch] = useState('');
  const [userCity, setUserCity] = useState('');
  const [userRegion, setUserRegion] = useState('');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [insurerPhones, setInsurerPhones] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getVehicles(user.id),
      getClaims(user.id),
      supabase.from('profiles').select('avatar_url, display_name').eq('user_id', user.id).single(),
      supabase.from('insurance_companies').select('name, phone'),
    ]).then(([v, c, profileRes, insurerRes]) => {
      setVehicles(v);
      setClaims(c);
      if (profileRes.data) {
        setAvatarUrl(profileRes.data.avatar_url || '');
        setDisplayName(profileRes.data.display_name || '');
      }
      if (insurerRes.data) {
        const map: Record<string, string> = {};
        insurerRes.data.forEach((ic: any) => { if (ic.phone) map[ic.name] = ic.phone; });
        setInsurerPhones(map);
      }
    });
  }, [user]);

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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const geo = await res.json();
          const city = geo.address?.city || geo.address?.town || geo.address?.suburb || '';
          const region = geo.address?.state || geo.address?.region || '';
          setUserCity(city);
          setUserRegion(region);
        } catch { /* ignore */ }
      }, (err) => {
        if (err.code === 1) {
          toast.error('Location access denied. Please enable location permissions in your browser settings to see nearby tow companies.', { duration: 6000 });
        }
      });
    }
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

  // Filter by search term; if search is empty, try to match by detected region/city
  const getDisplayedTowCompanies = () => {
    if (towSearch) {
      const filtered = towCompanies.filter(tc =>
        tc.name.toLowerCase().includes(towSearch.toLowerCase()) ||
        tc.address.toLowerCase().includes(towSearch.toLowerCase())
      );
      return sortByDistance(filtered.length > 0 ? filtered : towCompanies);
    }
    // Auto-filter by detected location
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

  return (
    <AppLayout>
      <motion.div className="space-y-5" variants={stagger} initial="hidden" animate="visible">
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t('dashboard.welcomeBack')}</p>
            <h1 className="text-[22px] font-extrabold text-foreground tracking-tight -mt-0.5">{firstName} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/profile">
              <Avatar className="w-10 h-10 ring-2 ring-primary/10 ring-offset-2 ring-offset-background transition-transform hover:scale-105">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {displayName ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
            </Link>
            <button onClick={signOut} className="p-2 rounded-xl hover:bg-muted transition-colors" title={t('common.signOut')}>
              <LogOut className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
          </div>
        </motion.div>

        {/* Action cards */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
          <motion.button
            onClick={handleOpenTowSheet}
            whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
            whileTap={{ scale: 0.97 }}
            className="card-surface-elevated group hover:border-primary/20 transition-all text-left h-[140px] flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsla(152, 60%, 42%, 0.1)' }}>
              <Phone className="w-5 h-5" style={{ color: 'hsl(152, 60%, 42%)' }} strokeWidth={1.8} />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Call a tow truck</div>
              <div className="text-xs text-muted-foreground mt-0.5">24/7 emergency towing</div>
            </div>
          </motion.button>

          <motion.div
            whileHover={{ y: -2, boxShadow: '0 12px 32px hsla(213, 52%, 24%, 0.35)' }}
            whileTap={{ scale: 0.97 }}
          >
            <Link to="/claims/new" className="card-gradient block group h-[140px] flex flex-col justify-between">
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{t('dashboard.reportIncident')}</div>
                  <p className="text-xs text-white/70 mt-0.5">{t('dashboard.reportSubtitle')}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>

        {/* Insurance section */}
        {vehicles.filter(v => v.insuranceCompany).length > 0 && (
          <motion.div variants={fadeUp} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-[13px] font-semibold text-foreground">Your Insurance</span>
            </div>
            {vehicles.filter(v => v.insuranceCompany).map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.35 }}
                className="card-surface-elevated flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{v.insuranceCompany}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {v.year} {v.make} {v.model} · {v.regoNumber}
                  </div>
                  {v.insurancePolicyNumber && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Policy: <span className="font-mono font-medium text-foreground">{v.insurancePolicyNumber}</span>
                    </div>
                  )}
                </div>
                {insurerPhones[v.insuranceCompany] && (
                  <a
                    href={`tel:${insurerPhones[v.insuranceCompany].replace(/\s/g, '')}`}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-primary whitespace-nowrap transition-transform hover:scale-105 active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call
                  </a>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Stat cards */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
          <motion.div whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }} whileTap={{ scale: 0.97 }}>
            <Link to="/vehicles" className="card-surface-elevated group hover:border-primary/20 transition-all block relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-primary/5 blur-xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Car className="w-4.5 h-4.5 text-primary" strokeWidth={1.8} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div className="text-3xl font-extrabold tabular-nums text-foreground">{vehicles.length}</div>
                <div className="text-[13px] text-muted-foreground mt-0.5">{t('dashboard.vehicles')}</div>
              </div>
            </Link>
          </motion.div>
          <motion.div whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }} whileTap={{ scale: 0.97 }}>
            <Link to="/claims" className="card-surface-elevated group hover:border-primary/20 transition-all block relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-primary/5 blur-xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-4.5 h-4.5 text-primary" strokeWidth={1.8} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div className="text-3xl font-extrabold tabular-nums text-foreground">{claims.length}</div>
                <div className="text-[13px] text-muted-foreground mt-0.5">{t('dashboard.reports')}</div>
              </div>
            </Link>
          </motion.div>
        </motion.div>

        {/* Add vehicle */}
        <motion.div variants={fadeUp} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
          <Link to="/vehicles/new" className="card-surface-elevated flex items-center gap-4 group hover:border-primary/20 transition-all">
            <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
              <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground">{t('dashboard.addVehicle')}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t('dashboard.registerGarage')}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" strokeWidth={1.5} />
          </Link>
        </motion.div>

        {/* Document vault */}
        <motion.div variants={fadeUp} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
          <Link to="/documents" className="card-surface-elevated flex items-center gap-4 group hover:border-primary/20 transition-all">
            <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
              <FolderOpen className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground">Document Vault</div>
              <div className="text-xs text-muted-foreground mt-0.5">Store policies, licences & records</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" strokeWidth={1.5} />
          </Link>
        </motion.div>

        {recentMessages.length > 0 && (
          <motion.div variants={fadeUp} className="card-surface-elevated space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-[13px] font-semibold text-foreground">Recent Messages</span>
            </div>
            {recentMessages.map(msg => (
              <Link key={msg.id} to={`/claims/${msg.claim_id}`}
                className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-muted/50 transition-colors -mx-1">
                <ArrowDownRight className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${msg.direction === 'inbound' ? 'text-emerald-600' : 'text-primary'}`} />
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
          <motion.div variants={fadeUp} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
            <Link to="/admin" className="card-surface-elevated flex items-center gap-4 group hover:border-primary/20 transition-all">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsla(152, 60%, 42%, 0.1)' }}>
                <Shield className="w-5 h-5" style={{ color: 'hsl(152, 60%, 42%)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground">{t('dashboard.adminOverview')}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t('dashboard.adminSubtitle')}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" strokeWidth={1.5} />
            </Link>
          </motion.div>
        )}
      </motion.div>

      <Sheet open={towSheetOpen} onOpenChange={setTowSheetOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0 flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <SheetHeader className="px-5 pt-5 pb-3 shrink-0">
            <SheetTitle className="text-left flex items-center gap-2">
                <Phone className="w-5 h-5" style={{ color: 'hsl(152, 60%, 42%)' }} />
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
                <div key={tc.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/20 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{tc.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{tc.address}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{tc.phone}</div>
                    {getDistanceLabel(tc) && (
                      <div className="text-xs font-medium mt-0.5" style={{ color: 'hsl(152, 60%, 42%)' }}>{getDistanceLabel(tc)}</div>
                    )}
                  </div>
                  <a
                    href={`tel:${tc.phone.replace(/\s/g, '')}`}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white whitespace-nowrap"
                    style={{ backgroundColor: 'hsl(152, 60%, 42%)' }}
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
