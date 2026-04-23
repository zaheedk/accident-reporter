import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import PanelShopForm from '@/components/PanelShopForm';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Phone, Mail, Star, ExternalLink, Plus, Pencil, Trash2, Navigation, Loader2 } from 'lucide-react';
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
  const { isAdmin } = useAuth();
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
      <div className={useAuth().session ? "theme-dashboard-dark" : ""}>
        <div className="space-y-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">Panel Shops</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Top-rated panel beaters across NZ (4.5+ Google rating)</p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => { setEditShop(null); setFormOpen(true); }} className="shrink-0 gap-1">
              <Plus className="w-4 h-4" /> Add
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, city..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button
            variant={nearbyActive ? 'default' : 'outline'}
            size="sm"
            onClick={toggleNearby}
            disabled={locating}
            className="shrink-0 gap-1.5 h-10"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            Near me
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {regions.map(region => (
            <button key={region} onClick={() => setSelectedRegion(region)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedRegion === region ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}>{region}</button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading shops...</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No panel shops found</div>
        ) : (
          <div className="space-y-3">
            {displayed.map(shop => {
              const dist = getDistance(shop.latitude ?? null, shop.longitude ?? null);
              const distLabel = formatDistance(dist);
              return (
                <Card key={shop.id} className="p-4 rounded-2xl border-border shadow-none hover:border-foreground/20 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2.5 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground leading-tight">{shop.name}</h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="secondary" className="gap-1 text-xs"><Star className="w-3 h-3 fill-current" />{Number(shop.google_rating).toFixed(1)}</Badge>
                          {isAdmin && (
                            <>
                              <button onClick={() => { setEditShop(shop); setFormOpen(true); }} className="p-1 rounded hover:bg-muted transition-colors"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                              <button onClick={() => setDeleteShop(shop)} className="p-1 rounded hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{shop.address}, {shop.city}</span></div>
                        {shop.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0" /><a href={`tel:${shop.phone}`} className="text-foreground underline-offset-2 hover:underline">{shop.phone}</a></div>}
                        {shop.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 shrink-0" /><a href={`mailto:${shop.email}`} className="text-foreground underline-offset-2 hover:underline truncate">{shop.email}</a></div>}
                        {shop.website && <div className="flex items-center gap-2"><ExternalLink className="w-3.5 h-3.5 shrink-0" /><a href={shop.website} target="_blank" rel="noopener noreferrer" className="text-foreground underline-offset-2 hover:underline truncate">Website</a></div>}
                        {nearbyActive && distLabel && (
                          <div className="flex items-center gap-2 font-medium text-primary">
                            <Navigation className="w-3.5 h-3.5 shrink-0" />
                            <span>{distLabel}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {shop.phone && (
                      <a href={`tel:${shop.phone}`} className="shrink-0 self-center">
                        <Button size="sm" variant="default" className="gap-1.5 rounded-full h-9 w-9 p-0">
                          <Phone className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center pt-2">
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
