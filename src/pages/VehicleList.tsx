import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Car, Trash2, ChevronRight } from 'lucide-react';
import { getVehicles, deleteVehicle } from '@/lib/storage';
import AppLayout from '@/components/AppLayout';
import { Vehicle } from '@/types';

export default function VehicleList() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(getVehicles());

  const handleDelete = (id: string) => {
    deleteVehicle(id);
    setVehicles(getVehicles());
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">My vehicles</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your vehicle garage for quick claim filing.</p>
          </div>
          <Link to="/vehicles/new" className="btn-primary h-8 px-3 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Add
          </Link>
        </div>

        {vehicles.length === 0 ? (
          <div className="card-surface text-center py-12">
            <Car className="w-10 h-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-foreground">No vehicles added yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add your vehicles to speed up claim filing.</p>
            <Link to="/vehicles/new" className="btn-primary mt-4 h-8 px-3 text-xs">
              <Plus className="w-3.5 h-3.5" />
              Add vehicle
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {vehicles.map(v => (
              <div key={v.id} className="card-surface flex items-center justify-between hover:border-primary/30 transition-colors">
                <Link to={`/vehicles/${v.id}/edit`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-md bg-primary/8 flex items-center justify-center flex-shrink-0">
                    <Car className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{v.year} {v.make} {v.model}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">{v.regoNumber}</div>
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDelete(v.id)} className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
