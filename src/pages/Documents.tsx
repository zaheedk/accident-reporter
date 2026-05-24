import { ArrowLeft, ChevronDown, Car, Mail, Briefcase } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import DocumentVault from '@/components/DocumentVault';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getVehicles } from '@/lib/storage';
import { Vehicle } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Documents() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('client') || '';
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState('personal');
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    if (!user) return;
    if (clientId) {
      // Broker viewing client docs: pull all accessible vehicles, filter to this client
      getVehicles().then(all => setVehicles(all.filter(v => v.userId === clientId)));
      supabase.from('broker_clients').select('client_name, client_email')
        .eq('client_user_id', clientId).maybeSingle()
        .then(({ data }) => setClientName((data as any)?.client_name || (data as any)?.client_email || 'Client'));
    } else {
      getVehicles(user.id).then(setVehicles);
    }
  }, [user, clientId]);

  const selectedVehicle = vehicles.find(v => v.id === selected);

  const selectorLabel = selected === 'personal'
    ? { primary: 'Personal', secondary: clientId ? `${clientName}'s documents` : 'Your documents' }
    : selectedVehicle
      ? { primary: selectedVehicle.regoNumber, secondary: `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}` }
      : { primary: 'Select', secondary: '' };

  const docContextLabel = selected === 'personal'
    ? (clientId ? `${clientName} · Personal` : 'Personal')
    : selectedVehicle ? selectedVehicle.regoNumber : '';


  return (
    <AppLayout>
      <div className="theme-garage relative">
        <div className="relative space-y-8">
        {/* Header — Apple/Linear: large display title, fine eyebrow, no uppercase shouting */}
        <div className="flex items-end justify-between gap-3 pt-2">
          <div className="flex items-start gap-2 min-w-0">
            <Link
              to="/dashboard"
              aria-label="Back"
              className="w-9 h-9 -ml-1 mt-1 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-[18px] h-[18px]" strokeWidth={2} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-[28px] leading-tight font-semibold text-foreground tracking-[-0.02em] truncate">
                Documents
              </h1>
              {docContextLabel && (
                <p className="text-[13px] text-muted-foreground tabular-nums mt-1">
                  {docContextLabel}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Email-in tip */}
        <div className="card-soft !p-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-foreground leading-tight">
              Email documents straight to your vault
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Send any PDF, image or Office file as an attachment from your registered email to{' '}
              <a
                href="mailto:documents@replies.savo.co.nz"
                className="font-semibold text-foreground underline underline-offset-2 break-all"
              >
                documents@replies.savo.co.nz
              </a>
              {' '}and it will appear here automatically.
            </p>
          </div>
        </div>

        {/* Vehicle / personal selector — hero pill */}
        <div className="space-y-2">
          <p className="field-label">Showing documents for</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 card-soft hover:border-foreground/30 transition-colors text-left !py-3 !px-3">
              <div className="w-11 h-11 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
                <Car className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-foreground truncate leading-tight">
                  {selectorLabel.primary}
                </p>
                {selectorLabel.secondary && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {selectorLabel.secondary}
                  </p>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl">
            <DropdownMenuItem onClick={() => setSelected('personal')} className="py-2.5">
              <div className="flex flex-col">
                <span className="font-medium">Personal</span>
                <span className="text-xs text-muted-foreground">Your documents</span>
              </div>
            </DropdownMenuItem>
            {vehicles.map(v => (
              <DropdownMenuItem key={v.id} onClick={() => setSelected(v.id)} className="py-2.5">
                <div className="flex flex-col">
                  <span className="font-medium">{v.regoNumber}</span>
                  <span className="text-xs text-muted-foreground">{v.year} {v.make} {v.model}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>

        {clientId && (
          <div className="card-soft !p-3 flex items-center gap-3 border-primary/30 bg-primary/5">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground leading-tight">Uploading on behalf of {clientName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Files are saved to the client's vault. You can't delete their existing documents.</p>
            </div>
          </div>
        )}

        {/* Vault content */}
        {selected === 'personal' ? (
          <DocumentVault title="Personal documents" showCategories={['drivers_license', 'other']} clientUserId={clientId || null} />
        ) : selectedVehicle ? (
          <DocumentVault
            vehicleId={selectedVehicle.id}
            title={`${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`}
            showCategories={['insurance_policy', 'registration', 'wof_certificate', 'purchase_receipt', 'service_record', 'other']}
            clientUserId={clientId || null}
          />
        ) : null}
        </div>
      </div>
    </AppLayout>
  );
}
