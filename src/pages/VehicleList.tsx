import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Car, Trash2, ChevronRight, ArrowLeft } from 'lucide-react';
import { getVehicles, deleteVehicle } from '@/lib/storage';
import AppLayout from '@/components/AppLayout';
import { Vehicle } from '@/types';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

export default function VehicleList() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const { t } = useTranslation();
  const { user } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (user) getVehicles(user.id).then(setVehicles); }, [user]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteVehicle(deleteTarget.id);
      setVehicles(prev => prev.filter(v => v.id !== deleteTarget.id));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
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
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-muted-foreground/40" strokeWidth={1.5} />
            </div>
            <p className="text-base font-semibold text-foreground">{t('vehicles.noVehicles')}</p>
            <p className="text-sm text-muted-foreground mt-1.5 mb-5 max-w-[240px] mx-auto">{t('vehicles.noVehiclesHint')}</p>
            <Link to="/vehicles/new" className="btn-primary h-10 px-5 text-sm rounded-xl inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t('vehicles.addVehicle')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map(v => (
              <div key={v.id} className="bg-card rounded-2xl border border-border/40 overflow-hidden hover:border-primary/20 hover:shadow-md transition-all duration-200 group">
                <Link to={`/vehicles/${v.id}/edit`} className="flex items-center gap-4 p-4 min-w-0">
                  {v.photoUrl ? (
                    <img src={v.photoUrl} alt={`${v.make} ${v.model}`} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 ring-1 ring-border/30" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center flex-shrink-0">
                      <Car className="w-6 h-6 text-muted-foreground/50" strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold text-foreground tracking-wide tabular-nums">{v.regoNumber}</div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">{v.year} {v.make} {v.model}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(v); }}
                      className="p-2 rounded-xl text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" strokeWidth={1.5} />
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('common.delete')} {deleteTarget?.year} {deleteTarget?.make} {deleteTarget?.model}?</AlertDialogTitle>
              <AlertDialogDescription>{t('vehicles.deleteConfirm', 'This vehicle and its data will be permanently removed. This action cannot be undone.')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting ? t('common.deleting', 'Deleting…') : t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
