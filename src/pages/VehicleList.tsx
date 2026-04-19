import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Car, Trash2, ChevronRight, ArrowLeft, ArrowUpRight, Phone } from 'lucide-react';
import { getVehicles, deleteVehicle } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Vehicle } from '@/types';
import { motion } from 'framer-motion';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { useQueryClient } from '@tanstack/react-query';

export default function VehicleList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data: vehicles = [] } = useOfflineQuery<Vehicle[]>(
    ['vehicles', user?.id ?? ''],
    () => getVehicles(user!.id),
    { enabled: !!user }
  );

  const { data: insurerPhones = {} } = useOfflineQuery<Record<string, string>>(
    ['insurer-phones'],
    async () => {
      const { data } = await supabase.from('insurance_companies').select('name, phone');
      const map: Record<string, string> = {};
      data?.forEach((ic: any) => { if (ic.phone) map[ic.name] = ic.phone; });
      return map;
    },
    { enabled: !!user }
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteVehicle(deleteTarget.id);
      // Invalidate cache so Dashboard + VehicleList refresh
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
  const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } };

  return (
    <AppLayout>
      <motion.div className="space-y-5" variants={stagger} initial="hidden" animate="visible">
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} aria-label="Back" className="w-10 h-10 -ml-1 rounded-xl border border-border bg-card hover:bg-muted flex items-center justify-center transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={2} />
            </button>
            <h1 className="text-[22px] font-extrabold text-foreground tracking-tight">My vehicles</h1>
          </div>
          <Link to="/vehicles/new" className="btn-primary h-8 px-3.5 text-xs rounded-lg">
            <Plus className="w-3.5 h-3.5" /> Add
          </Link>
        </motion.div>

        {vehicles.length === 0 ? (
          <motion.div variants={fadeUp} className="text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-muted-foreground/40" strokeWidth={1.5} />
            </div>
            <p className="text-base font-semibold text-foreground">No vehicles added yet</p>
            <p className="text-sm text-muted-foreground mt-1.5 mb-5 max-w-[240px] mx-auto">Add your vehicles to speed up claim filing.</p>
            <Link to="/vehicles/new" className="btn-primary h-10 px-5 text-sm rounded-xl inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add vehicle
            </Link>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="space-y-3">
            {vehicles.map((v, i) => {
              const today = new Date().toISOString().slice(0, 10);
              const isExpired = (v.wofExpiry && v.wofExpiry < today) || (v.regoExpiry && v.regoExpiry < today) || (v.insuranceExpiry && v.insuranceExpiry < today);
              const insurerPhone = v.insuranceCompany ? insurerPhones[v.insuranceCompany] : '';

              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
                  whileTap={{ scale: 0.99 }}
                  className={`group transition-colors relative overflow-hidden ${isExpired ? 'card-surface-elevated border-destructive/40 hover:border-destructive/60' : 'card-surface-elevated hover:border-foreground/20'}`}
                >
                  <Link to={`/vehicles/${v.id}/edit`} className="flex items-center gap-3 pr-10">
                    {v.photoUrl ? (
                      <img src={v.photoUrl} alt={`${v.make} ${v.model}`} className="w-14 h-14 rounded-xl object-cover ring-1 ring-border/30 shrink-0" />
                    ) : (
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${isExpired ? 'bg-destructive/10' : 'bg-muted'}`}>
                        <Car className={`w-7 h-7 ${isExpired ? 'text-destructive' : 'text-foreground/70'}`} strokeWidth={1.8} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-bold text-foreground tabular-nums tracking-wide truncate">{v.regoNumber}</div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{v.year} {v.make} {v.model}</div>
                      {isExpired && (
                        <div className="text-[11px] font-semibold text-destructive mt-1">Expired documents</div>
                      )}
                    </div>
                  </Link>
                  {insurerPhone && (
                    <a
                      href={`tel:${insurerPhone.replace(/\s/g, '')}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-foreground border border-border hover:bg-muted whitespace-nowrap transition-colors w-fit"
                    >
                      <Phone className="w-3 h-3" />
                      Call insurer
                    </a>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(v); }}
                    aria-label="Delete vehicle"
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {deleteTarget?.year} {deleteTarget?.make} {deleteTarget?.model}?</AlertDialogTitle>
              <AlertDialogDescription>This vehicle and its data will be permanently removed. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </AppLayout>
  );
}
