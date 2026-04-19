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
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-muted/50 hover:bg-muted transition-colors shrink-0"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Secure storage</p>
              <h1 className="display-heading mt-1 leading-tight">Document vault</h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Keep your licence, insurance and vehicle paperwork in one safe place.
          </p>
        </div>

        {/* Vehicle / personal selector — hero pill */}
        <div>
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
