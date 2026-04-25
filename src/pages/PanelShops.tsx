import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import SEO from '@/components/SEO';
import PanelShopForm from '@/components/PanelShopForm';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Phone, Mail, Star, ExternalLink, Plus, Pencil, Trash2, Navigation, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useNearbySort } from '@/hooks/use-nearby-sort';

type PanelShop = {
  id: string; name: string; address: string; city: string; region: string;
  phone: string; email: string; google_rating: number; website: string;
  latitude?: number | null; longitude?: number | null;
};

export default function PanelShops() {
  const { isAdmin, session } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [formOpen, setFormOpen] = useState(false);
  const [editShop, setEditShop] = useState<PanelShop | null>(null);
  const [deleteShop, setDeleteShop] = useState<PanelShop | null>(null);
  const { nearbyActive, locating, toggleNearby, getDistance, formatDistance, sortByDistance, filterByRadius } = useNearbySort();

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ['panel-shops'],
    queryFn: async () => {
      const { data, error } = await supabase.from('panel_shops').select('*').gte('google_rating', 4.5).order('google_rating', { ascending: false });
      if (error) throw error;
      return data as PanelShop[];
    },
  });

  const regions = ['All', ...Array.from(new Set(shops.map(s => s.region))).sort()];

  const filtered = shops.filter(shop => {
    const matchesSearch = shop.name.toLowerCase().includes(search.toLowerCase()) ||
      shop.city.toLowerCase().includes(search.toLowerCase()) ||
      shop.address.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = selectedRegion === 'All' || shop.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  const displayed = nearbyActive ? sortByDistance(filterByRadius(filtered, 25)) : filtered;

  const handleAdd = async (data: Omit<PanelShop, 'id'>) => {
    const { latitude, longitude, ...insertData } = data;
    const { error } = await supabase.from('panel_shops').insert(insertData);
    if (error) { toast.error('Failed to add shop'); throw error; }
    toast.success('Shop added');
    queryClient.invalidateQueries({ queryKey: ['panel-shops'] });
  };

  const handleEdit = async (data: Omit<PanelShop, 'id'>) => {
    if (!editShop) return;
    const { latitude, longitude, ...updateData } = data;
    const { error } = await supabase.from('panel_shops').update(updateData).eq('id', editShop.id);
    if (error) { toast.error('Failed to update shop'); throw error; }
    toast.success('Shop updated');
    setEditShop(null);
    queryClient.invalidateQueries({ queryKey: ['panel-shops'] });
  };

  const handleDelete = async () => {
    if (!deleteShop) return;
    const { error } = await supabase.from('panel_shops').delete().eq('id', deleteShop.id);
    if (error) { toast.error('Failed to delete shop'); return; }
    toast.success('Shop deleted');
    setDeleteShop(null);
    queryClient.invalidateQueries({ queryKey: ['panel-shops'] });
  };

  return (
    <AppLayout>
      <SEO
        title="Panel Beaters Directory NZ — Find Trusted Repair Shops | SAVO"
        description="Browse over 200 highly rated panel beaters across New Zealand. Find local collision repair specialists by region, get directions and contact details fast."
        path="/panel-shops"
      />
      <div className="theme-garage relative">
        <div className="relative space-y-7">
        {/* Header — Apple/Linear: back arrow + large display title */}
        <div className="flex items-end justify-between gap-3 pt-2">
          <div className="flex items-start gap-2 min-w-0">
            <Link
              to={session ? '/dashboard' : '/'}
              aria-label="Back"
              className="w-9 h-9 -ml-1 mt-1 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-[18px] h-[18px]" strokeWidth={2} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-[28px] leading-tight font-semibold text-foreground tracking-[-0.02em] truncate">
                Panel Shops
              </h1>
              <p className="text-[13px] text-muted-foreground tabular-nums mt-1">
                Top-rated NZ panel beaters · 4.5+ rating
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setEditShop(null); setFormOpen(true); }}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all flex-shrink-0"
            >
              <Plus className="w-4 h-4" strokeWidth={2.2} /> Add
            </button>
          )}
        </div>

        {/* Search + Near me */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
            <input
              placeholder="Search by name, city…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-card text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-foreground/30 transition-colors"
            />
          </div>
          <button
            onClick={toggleNearby}
            disabled={locating}
            className={`shrink-0 inline-flex items-center gap-1.5 h-11 px-3.5 rounded-xl text-[13px] font-medium transition-all ${
              nearbyActive
                ? 'bg-foreground text-background border border-foreground'
                : 'bg-card border border-border text-foreground hover:border-foreground/30'
            } disabled:opacity-50`}
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" strokeWidth={2} />}
            Near me
          </button>
        </div>

        {/* Region filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {regions.map(region => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap border transition-colors ${
                selectedRegion === region
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border hover:border-foreground/20 hover:text-foreground'
              }`}
            >
              {region}
            </button>
          ))}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="card-soft text-center py-12">
            <p className="text-[15px] font-semibold text-foreground tracking-tight">No panel shops found</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different region or search term</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayed.map(shop => {
              const dist = getDistance(shop.latitude ?? null, shop.longitude ?? null);
              const distLabel = formatDistance(dist);
              return (
                <div key={shop.id} className="rounded-2xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[15px] font-semibold text-foreground leading-tight tracking-tight">{shop.name}</h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/60 text-foreground/80 tabular-nums">
                            <Star className="w-3 h-3 fill-current text-amber-500" strokeWidth={0} />
                            {Number(shop.google_rating).toFixed(1)}
                          </span>
                          {isAdmin && (
                            <>
                              <button onClick={() => { setEditShop(shop); setFormOpen(true); }} className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setDeleteShop(shop)} className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5 text-[12px] text-muted-foreground">
                        <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={1.75} /><span>{shop.address}, {shop.city}</span></div>
                        {shop.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} /><a href={`tel:${shop.phone}`} className="text-foreground font-medium underline-offset-2 hover:underline">{shop.phone}</a></div>}
                        {shop.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} /><a href={`mailto:${shop.email}`} className="text-foreground font-medium underline-offset-2 hover:underline truncate">{shop.email}</a></div>}
                        {shop.website && <div className="flex items-center gap-2"><ExternalLink className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} /><a href={shop.website} target="_blank" rel="noopener noreferrer" className="text-foreground font-medium underline-offset-2 hover:underline truncate">Website</a></div>}
                        {nearbyActive && distLabel && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                            <Navigation className="w-3 h-3" strokeWidth={2} />
                            <span className="tabular-nums">{distLabel}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {shop.phone && (
                      <a
                        href={`tel:${shop.phone}`}
                        aria-label={`Call ${shop.name}`}
                        className="shrink-0 self-center w-10 h-10 rounded-full bg-foreground text-background inline-flex items-center justify-center hover:opacity-90 active:scale-[0.98] transition-all"
                      >
                        <Phone className="w-4 h-4" strokeWidth={2} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center pt-2 tabular-nums">
          {displayed.length} shop{displayed.length !== 1 ? 's' : ''} found
        </p>
        </div>
      </div>

      <PanelShopForm open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditShop(null); }} shop={editShop} onSave={editShop ? handleEdit : handleAdd} />

      <AlertDialog open={!!deleteShop} onOpenChange={(open) => !open && setDeleteShop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete panel shop?</AlertDialogTitle>
            <AlertDialogDescription dangerouslySetInnerHTML={{ __html: `Are you sure you want to remove <strong>${deleteShop?.name}</strong>? This cannot be undone.` }} />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
