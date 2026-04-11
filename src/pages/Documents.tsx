import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import DocumentVault from '@/components/DocumentVault';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { getVehicles } from '@/lib/storage';
import { Vehicle } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Documents() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState('personal');

  useEffect(() => {
    if (user) getVehicles(user.id).then(setVehicles);
  }, [user]);

  const selectedVehicle = vehicles.find(v => v.id === selected);

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">Secure storage</p>
            <h1 className="text-[22px] font-extrabold text-foreground tracking-tight -mt-0.5">Document Vault</h1>
          </div>
        </div>

        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">Personal Documents</SelectItem>
            {vehicles.map(v => (
            <SelectItem key={v.id} value={v.id}>
                {v.regoNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="card-surface">
          {selected === 'personal' ? (
            <DocumentVault title="Personal Documents" showCategories={['drivers_license', 'other']} />
          ) : selectedVehicle ? (
            <DocumentVault
              vehicleId={selectedVehicle.id}
              title={`${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`}
              showCategories={['insurance_policy', 'registration', 'wof_certificate', 'purchase_receipt', 'service_record', 'other']}
            />
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}
