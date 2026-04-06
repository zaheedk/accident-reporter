import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, MapPin, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type TowCompany = {
  id: string; name: string; address: string; phone: string;
  latitude: number | null; longitude: number | null; region: string;
};

export default function TowCompanies() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['tow-companies-public'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tow_companies').select('*').order('name');
      if (error) throw error;
      return data as TowCompany[];
    },
  });

  const regions = ['All', ...Array.from(new Set(companies.map(c => c.region).filter(Boolean))).sort()];

  const filtered = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = selectedRegion === 'All' || c.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('towCompanies.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('towCompanies.subtitle')}</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('towCompanies.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
          <div className="text-center py-10 text-muted-foreground text-sm">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">{t('towCompanies.noResults')}</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(company => (
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
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center pt-2">
          {filtered.length} {t('towCompanies.companiesFound', { count: filtered.length })}
        </p>
      </div>
    </AppLayout>
  );
}
