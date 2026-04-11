import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Car, Trash2, ChevronRight, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { getVehicles, deleteVehicle } from '@/lib/storage';
import AppLayout from '@/components/AppLayout';
import { Vehicle } from '@/types';
import { motion } from 'framer-motion';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

export default function VehicleList() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
  const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } };

  return (
    <AppLayout>
      <motion.div className="space-y-5" variants={stagger} initial="hidden" animate="visible">
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
            </button>
            <div>
              <p className="text-sm text-muted-foreground">Garage</p>
              <h1 className="text-[22px] font-extrabold text-foreground tracking-tight -mt-0.5">My vehicles</h1>
            </div>
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
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
            {vehicles.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
                whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                whileTap={{ scale: 0.97 }}
                className="card-surface-elevated group hover:border-primary/20 transition-all relative overflow-hidden"
              >
                <Link to={`/vehicles/${v.id}/edit`} className="flex flex-col h-[92px] justify-between">
                  {v.photoUrl ? (
                    <img src={v.photoUrl} alt={`${v.make} ${v.model}`} className="w-10 h-10 rounded-xl object-cover ring-1 ring-border/30" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Car className="w-5 h-5 text-primary" strokeWidth={1.8} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground tabular-nums tracking-wide">{v.regoNumber}</div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">{v.year} {v.make} {v.model}</div>
                  </div>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(v); }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground/20 hover:text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <ArrowUpRight className="absolute bottom-3 right-3 w-4 h-4 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </motion.div>
            ))}
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
