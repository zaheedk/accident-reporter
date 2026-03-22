import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, FileText, Plus, AlertTriangle, ChevronRight, Clock, ArrowUpRight, LogOut, User, Users, Shield, Phone, Search, MapPin, X } from 'lucide-react';
import { getVehicles, getClaims } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Vehicle, ClaimReport } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

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

  const handleOpenTowSheet = () => {
    setTowSheetOpen(true);
    supabase.from('tow_companies').select('*').then(({ data }) => {
      if (data) setTowCompanies(data);
    });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const geo = await res.json();
          const city = geo.address?.city || geo.address?.town || geo.address?.suburb || '';
          setUserCity(city);
          setTowSearch(city);
        } catch { /* ignore */ }
      }, () => { /* permission denied */ });
    }
  };

  const filteredTowCompanies = towCompanies.filter(tc =>
    tc.name.toLowerCase().includes(towSearch.toLowerCase()) ||
    tc.address.toLowerCase().includes(towSearch.toLowerCase())
  );

  const drafts = claims.filter(c => c.status === 'draft');
  const submitted = claims.filter(c => c.status === 'submitted');
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

        <button onClick={handleOpenTowSheet} className="w-full block card-surface-elevated group hover:border-primary/20 transition-all text-left">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsla(152, 60%, 42%, 0.1)' }}>
              <Phone className="w-5 h-5" style={{ color: 'hsl(152, 60%, 42%)' }} strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground">Call a tow truck</div>
              <div className="text-xs text-muted-foreground mt-0.5">24/7 emergency towing assistance</div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
          </div>
        </button>

        <Link to="/claims/new" className="card-gradient block group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-white/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="text-lg font-bold text-white">{t('dashboard.reportIncident')}</div>
            <p className="text-sm text-white/70 mt-1">{t('dashboard.reportSubtitle')}</p>
          </div>
        </Link>

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

        {drafts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-warning" style={{ backgroundColor: 'hsl(38, 92%, 50%)' }} />
              <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.drafts')}</h2>
            </div>
            <div className="space-y-2">
              {drafts.map(claim => (
                <Link key={claim.id} to={`/claims/${claim.id}/edit`}
                  className="card-surface flex items-center justify-between group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'hsla(38, 92%, 50%, 0.1)' }}>
                      <Clock className="w-4 h-4" strokeWidth={1.8} style={{ color: 'hsl(38, 92%, 50%)' }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{claim.incidentLocation || t('dashboard.untitledReport')}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{claim.incidentDate || t('dashboard.noDateSet')}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" strokeWidth={1.5} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {submitted.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'hsl(152, 60%, 42%)' }} />
              <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">{t('common.submitted')}</h2>
            </div>
            <div className="space-y-2">
              {submitted.slice(0, 5).map(claim => (
                <Link key={claim.id} to={`/claims/${claim.id}`}
                  className="card-surface flex items-center justify-between group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" strokeWidth={1.8} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{claim.incidentLocation || t('dashboard.report')}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{claim.incidentDate}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" strokeWidth={1.5} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
