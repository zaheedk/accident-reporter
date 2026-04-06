import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Car, Trash2, ChevronRight, ArrowLeft } from 'lucide-react';
import { getVehicles, deleteVehicle } from '@/lib/storage';
import AppLayout from '@/components/AppLayout';
import { Vehicle } from '@/types';
import { useTranslation } from 'react-i18next';

export default function VehicleList() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const { t } = useTranslation();

  useEffect(() => { getVehicles().then(setVehicles); }, []);

  const handleDelete = async (id: string) => {
    await deleteVehicle(id);
    setVehicles(await getVehicles());
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
            </button>
            <div>
              <p className="text-sm text-muted-foreground">{t('vehicles.garage')}</p>
              <h1 className="text-[22px] font-extrabold text-foreground tracking-tight -mt-0.5">{t('vehicles.myVehicles')}</h1>
            </div>
          </div>
          <Link to="/vehicles/new" className="btn-primary h-8 px-3.5 text-xs rounded-lg">
            <Plus className="w-3.5 h-3.5" /> {t('common.add')}
          </Link>
        </div>

        {vehicles.length === 0 ? (
          <div className="card-surface text-center py-14">
            <Car className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" strokeWidth={1.2} />
            <p className="text-sm font-semibold text-foreground">{t('vehicles.noVehicles')}</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">{t('vehicles.noVehiclesHint')}</p>
            <Link to="/vehicles/new" className="btn-primary h-8 px-3.5 text-xs rounded-lg">
              <Plus className="w-3.5 h-3.5" /> {t('vehicles.addVehicle')}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {vehicles.map(v => (
              <div key={v.id} className="card-surface flex items-center justify-between hover:shadow-md transition-shadow">
                <Link to={`/vehicles/${v.id}/edit`} className="flex items-center gap-3 flex-1 min-w-0">
                  {v.photoUrl ? (
                    <img src={v.photoUrl} alt={`${v.make} ${v.model}`} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Car className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{v.year} {v.make} {v.model}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">{v.regoNumber}</div>
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDelete(v.id)} className="p-2 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-colors">
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40" strokeWidth={1.5} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
