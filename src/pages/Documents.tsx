import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import DocumentVault from '@/components/DocumentVault';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { getVehicles } from '@/lib/storage';
import { Vehicle } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Documents() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    if (user) getVehicles(user.id).then(setVehicles);
  }, [user]);

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

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="personal" className="flex-1 text-xs">Personal</TabsTrigger>
            {vehicles.map(v => (
              <TabsTrigger key={v.id} value={v.id} className="flex-1 text-xs truncate">
                {v.make} {v.model}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="personal" className="mt-3">
            <div className="card-surface">
              <DocumentVault title="Personal Documents" showCategories={['drivers_license', 'other']} />
            </div>
          </TabsContent>

          {vehicles.map(v => (
            <TabsContent key={v.id} value={v.id} className="mt-3">
              <div className="card-surface">
                <DocumentVault
                  vehicleId={v.id}
                  title={`${v.year} ${v.make} ${v.model}`}
                  showCategories={['insurance_policy', 'registration', 'wof_certificate', 'purchase_receipt', 'service_record', 'other']}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
