import { ArrowLeft, ChevronDown, Car } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import DocumentVault from '@/components/DocumentVault';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState('personal');

  useEffect(() => {
    if (user) getVehicles(user.id).then(setVehicles);
  }, [user]);

  const selectedVehicle = vehicles.find(v => v.id === selected);

  const selectorLabel = selected === 'personal'
    ? { primary: 'Personal', secondary: 'Your documents' }
    : selectedVehicle
      ? { primary: selectedVehicle.regoNumber, secondary: `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}` }
      : { primary: 'Select', secondary: '' };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center w-10 h-10 -ml-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
          </Link>
          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
              Secure storage
            </p>
            <h1 className="text-[28px] font-bold text-foreground tracking-tight leading-tight mt-0.5">
              Document vault
            </h1>
          </div>
        </div>

        {/* Vehicle / personal selector — hero pill */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl px-3 py-3 hover:border-foreground/20 transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Car className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
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

        {/* Vault content */}
        {selected === 'personal' ? (
          <DocumentVault title="Personal documents" showCategories={['drivers_license', 'other']} />
        ) : selectedVehicle ? (
          <DocumentVault
            vehicleId={selectedVehicle.id}
            title={`${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`}
            showCategories={['insurance_policy', 'registration', 'wof_certificate', 'purchase_receipt', 'service_record', 'other']}
          />
        ) : null}
      </div>
    </AppLayout>
  );
}
