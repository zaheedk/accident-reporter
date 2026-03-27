import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, FileText, Plus, AlertTriangle, ChevronRight, ArrowUpRight, LogOut, User, Shield, Phone, Search, MapPin, X, MessageSquare, ArrowDownRight } from 'lucide-react';
import { getVehicles, getClaims } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Vehicle, ClaimReport } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatDistanceToNow } from 'date-fns';

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

  useEffect(() => {
    getVehicles().then(setVehicles);
    getClaims().then(setClaims);
    if (user) {
      supabase.from('profiles').select('avatar_url, display_name').eq('user_id', user.id).single().then(({ data }) => {
        if (data) {
          setAvatarUrl(data.avatar_url || '');
          setDisplayName(data.display_name || '');
        }
      });
    }
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
      }, () => { /* permission denied */ });
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

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t('dashboard.welcomeBack')}</p>
            <h1 className="text-[22px] font-extrabold text-foreground tracking-tight -mt-0.5">{firstName} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/profile">
              <Avatar className="w-10 h-10 ring-2 ring-primary/10 ring-offset-2 ring-offset-background">
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
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleOpenTowSheet} className="card-surface-elevated group hover:border-primary/20 transition-all text-left h-[140px] flex flex-col justify-between">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsla(152, 60%, 42%, 0.1)' }}>
              <Phone className="w-5 h-5" style={{ color: 'hsl(152, 60%, 42%)' }} strokeWidth={1.8} />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Call a tow truck</div>
              <div className="text-xs text-muted-foreground mt-0.5">24/7 emergency towing</div>
            </div>
          </button>

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
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link to="/vehicles" className="card-surface-elevated group hover:border-primary/20 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Car className="w-4.5 h-4.5 text-primary" strokeWidth={1.8} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </div>
            <div className="text-3xl font-extrabold tabular-nums text-foreground">{vehicles.length}</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">{t('dashboard.vehicles')}</div>
          </Link>
          <Link to="/claims" className="card-surface-elevated group hover:border-primary/20 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-4.5 h-4.5 text-primary" strokeWidth={1.8} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </div>
            <div className="text-3xl font-extrabold tabular-nums text-foreground">{claims.length}</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">{t('dashboard.reports')}</div>
          </Link>
        </div>

        <Link to="/vehicles/new" className="card-surface-elevated flex items-center gap-4 group hover:border-primary/20 transition-all">
          <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-foreground">{t('dashboard.addVehicle')}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{t('dashboard.registerGarage')}</div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" strokeWidth={1.5} />
        </Link>

        {isAdmin && (
          <Link to="/admin" className="card-surface-elevated flex items-center gap-4 group hover:border-primary/20 transition-all">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsla(152, 60%, 42%, 0.1)' }}>
              <Shield className="w-5 h-5" style={{ color: 'hsl(152, 60%, 42%)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground">{t('dashboard.adminOverview')}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t('dashboard.adminSubtitle')}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" strokeWidth={1.5} />
          </Link>
        )}
      </div>

      <Sheet open={towSheetOpen} onOpenChange={setTowSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
          <SheetHeader className="px-5 pt-5 pb-3">
            <SheetTitle className="text-left flex items-center gap-2">
              <Phone className="w-5 h-5" style={{ color: 'hsl(152, 60%, 42%)' }} />
              Tow Companies Near You
            </SheetTitle>
          </SheetHeader>
          <div className="px-5 pb-3">
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
          <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-2" style={{ maxHeight: 'calc(85vh - 160px)' }}>
            {displayedTowCompanies.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No tow companies found</div>
            ) : (
              displayedTowCompanies.map(tc => (
                <div key={tc.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/20 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{tc.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {tc.address}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{tc.phone}</div>
                    {getDistanceLabel(tc) && (
                      <div className="text-xs font-medium mt-0.5" style={{ color: 'hsl(152, 60%, 42%)' }}>{getDistanceLabel(tc)}</div>
                    )}
                  </div>
                  <a
                    href={`tel:${tc.phone.replace(/\s/g, '')}`}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white"
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
