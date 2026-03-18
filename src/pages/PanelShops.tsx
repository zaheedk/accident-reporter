import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Search, MapPin, Phone, Mail, Star, ExternalLink } from 'lucide-react';

type PanelShop = {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  phone: string;
  email: string;
  google_rating: number;
  website: string;
};

export default function PanelShops() {
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ['panel-shops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_shops')
        .select('*')
        .gte('google_rating', 4.5)
        .order('google_rating', { ascending: false });
      if (error) throw error;
      return data as PanelShop[];
    },
  });

  const regions = ['All', ...Array.from(new Set(shops.map(s => s.region)))];

  const filtered = shops.filter(shop => {
    const matchesSearch = shop.name.toLowerCase().includes(search.toLowerCase()) ||
      shop.city.toLowerCase().includes(search.toLowerCase()) ||
      shop.address.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = selectedRegion === 'All' || shop.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Panel Shops</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Top-rated panel beaters across NZ (4.5+ Google rating)
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {regions.map(region => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedRegion === region
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {region}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading shops...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No panel shops found</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(shop => (
              <Card key={shop.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground leading-tight">{shop.name}</h3>
                  <Badge variant="secondary" className="shrink-0 gap-1 text-xs">
                    <Star className="w-3 h-3 fill-current" />
                    {Number(shop.google_rating).toFixed(1)}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{shop.address}, {shop.city}</span>
                  </div>
                  {shop.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <a href={`tel:${shop.phone}`} className="text-foreground underline-offset-2 hover:underline">
                        {shop.phone}
                      </a>
                    </div>
                  )}
                  {shop.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <a href={`mailto:${shop.email}`} className="text-foreground underline-offset-2 hover:underline truncate">
                        {shop.email}
                      </a>
                    </div>
                  )}
                  {shop.website && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <a href={shop.website} target="_blank" rel="noopener noreferrer"
                        className="text-foreground underline-offset-2 hover:underline truncate">
                        Website
                      </a>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center pt-2">
          {filtered.length} shop{filtered.length !== 1 ? 's' : ''} found
        </p>
      </div>
    </AppLayout>
  );
}
