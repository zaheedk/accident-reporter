import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Search, MapPin, Phone, Navigation, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNearbySort } from '@/hooks/use-nearby-sort';
import { useAuth } from '@/contexts/AuthContext';

type TowCompany = {
  id: string; name: string; address: string; phone: string;
  latitude: number | null; longitude: number | null; region: string;
};

export default function TowCompanies() {
  const { session } = useAuth();
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
                  Tow Companies
                </h1>
                <p className="text-[13px] text-muted-foreground tabular-nums mt-1">
                  Towing services across New Zealand
                </p>
              </div>
            </div>
          </div>

          {/* Search + Near me */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
              <input
                placeholder="Search by name, address…"
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
              <p className="text-[15px] font-semibold text-foreground tracking-tight">No tow companies found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different region or search term</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayed.map(company => {
                const dist = getDistance(company.latitude, company.longitude);
                const distLabel = formatDistance(dist);
                return (
                  <div key={company.id} className="rounded-2xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <h3 className="text-[15px] font-semibold text-foreground leading-tight tracking-tight">{company.name}</h3>
                        <div className="space-y-1.5 text-[12px] text-muted-foreground">
                          {company.address && (
                            <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={1.75} /><span>{company.address}</span></div>
                          )}
                          {company.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                              <a href={`tel:${company.phone}`} className="text-foreground font-medium underline-offset-2 hover:underline">{company.phone}</a>
                            </div>
                          )}
                          {nearbyActive && distLabel && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                              <Navigation className="w-3 h-3" strokeWidth={2} />
                              <span className="tabular-nums">{distLabel}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {company.phone && (
                        <a
                          href={`tel:${company.phone}`}
                          aria-label={`Call ${company.name}`}
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

          {hasMore && (
            <div className="text-center pt-1">
              <button
                onClick={() => setShowAll(true)}
                className="inline-flex items-center h-9 px-4 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground hover:border-foreground/30 transition-colors"
              >
                Show all {afterNearby.length} companies
              </button>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground text-center pt-2 tabular-nums">
            Showing {displayed.length} of {afterNearby.length} companies
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
