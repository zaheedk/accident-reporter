import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, MapPin, Phone, Navigation, Loader2 } from 'lucide-react';
import { useNearbySort } from '@/hooks/use-nearby-sort';

type TowCompany = {
  id: string; name: string; address: string; phone: string;
  latitude: number | null; longitude: number | null; region: string;
};

export default function TowCompanies() {
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [showAll, setShowAll] = useState(false);
  const { nearbyActive, locating, toggleNearby, getDistance, formatDistance, sortByDistance, filterByRadius } = useNearbySort();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['tow-companies-public'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tow_companies').select('*').order('name');
      if (error) throw error;
      return data as TowCompany[];
    },
    retry: 2,
  });

  const regions = ['All', ...Array.from(new Set(companies.map(c => c.region).filter(Boolean))).sort()];

  const filtered = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = selectedRegion === 'All' || c.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  const isFiltering = search || selectedRegion !== 'All';
  const afterNearby = nearbyActive ? sortByDistance(filterByRadius(filtered, 25)) : filtered;
  const displayed = (!isFiltering && !nearbyActive && !showAll) ? afterNearby.slice(0, 15) : afterNearby;
  const hasMore = !isFiltering && !nearbyActive && !showAll && afterNearby.length > 15;

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tow Companies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Towing services across New Zealand</p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, address..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
          <div className="text-center py-10 text-muted-foreground text-sm">Loading...</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No tow companies found</div>
        ) : (
          <div className="space-y-3">
            {displayed.map(company => {
              const dist = getDistance(company.latitude, company.longitude);
              const distLabel = formatDistance(dist);
              return (
                <Card key={company.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2.5 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground leading-tight">{company.name}</h3>
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        {company.address && (
                          <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{company.address}</span></div>
                        )}
                        {company.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <a href={`tel:${company.phone}`} className="text-foreground underline-offset-2 hover:underline font-medium">{company.phone}</a>
                          </div>
                        )}
                        {nearbyActive && distLabel && (
                          <div className="flex items-center gap-2 font-medium" style={{ color: 'hsl(152, 60%, 42%)' }}>
                            <Navigation className="w-3.5 h-3.5 shrink-0" />
                            <span>{distLabel}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {company.phone && (
                      <a href={`tel:${company.phone}`} className="shrink-0 self-center">
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

        {hasMore && (
          <div className="text-center pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowAll(true)} className="text-xs">
              Show all {afterNearby.length} companies
            </Button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center pt-2">
          Showing {displayed.length} of {afterNearby.length} {`${\1} companies found`}
        </p>
      </div>
    </AppLayout>
  );
}
