import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { getVehicles, saveVehicle, generateId } from '@/lib/storage';
import { Vehicle } from '@/types';
import AppLayout from '@/components/AppLayout';

const emptyVehicle: Omit<Vehicle, 'id' | 'createdAt'> = {
  year: '', make: '', model: '', regoNumber: '', color: '',
  wofExpiry: '', regoExpiry: '',
  financeArrangement: false, financeDetails: '', modified: false, modificationDetails: '',
};

export default function VehicleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(emptyVehicle);

  useEffect(() => {
    if (id) {
      const existing = getVehicles().find(v => v.id === id);
      if (existing) {
        const { id: _, createdAt: __, ...rest } = existing;
        setForm(rest);
      }
    }
  }, [id]);

  const update = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const vehicle: Vehicle = { ...form, id: id || generateId(), createdAt: new Date().toISOString() };
    saveVehicle(vehicle);
    navigate('/vehicles');
  };

  const Toggle = ({ active, onToggle, label }: { active: boolean; onToggle: () => void; label: string }) => (
    <div className="flex items-center gap-3 py-1">
      <button type="button" onClick={onToggle}
        className={`w-11 h-[26px] rounded-full transition-colors relative ${active ? 'bg-primary' : 'bg-muted'}`}>
        <span className={`absolute top-[3px] w-5 h-5 rounded-full bg-card transition-transform shadow-sm ${active ? 'left-[22px]' : 'left-[3px]'}`} />
      </button>
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-bold tracking-tight text-foreground">{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</h1>
        </div>

        <div className="card-surface space-y-5">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="form-label">Year</label>
              <input className="form-input" placeholder="2024" value={form.year} onChange={e => update('year', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Rego Number</label>
              <input className="form-input tabular-nums" placeholder="ABC123" value={form.regoNumber} onChange={e => update('regoNumber', e.target.value.toUpperCase())} />
            </div>
          </div>
          <div>
            <label className="form-label">Make</label>
            <input className="form-input" placeholder="Toyota" value={form.make} onChange={e => update('make', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Model</label>
            <input className="form-input" placeholder="Corolla" value={form.model} onChange={e => update('model', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Colour</label>
            <input className="form-input" placeholder="Silver" value={form.color} onChange={e => update('color', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="form-label">WOF Expiry</label>
              <input type="date" className="form-input tabular-nums" value={form.wofExpiry} onChange={e => update('wofExpiry', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Rego Expiry</label>
              <input type="date" className="form-input tabular-nums" value={form.regoExpiry} onChange={e => update('regoExpiry', e.target.value)} />
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <Toggle active={form.financeArrangement} onToggle={() => update('financeArrangement', !form.financeArrangement)} label="Subject to finance arrangement" />
            {form.financeArrangement && (
              <div className="pl-14">
                <label className="form-label">Finance Details</label>
                <input className="form-input" placeholder="Finance company and details" value={form.financeDetails} onChange={e => update('financeDetails', e.target.value)} />
              </div>
            )}

            <Toggle active={form.modified} onToggle={() => update('modified', !form.modified)} label="Modified from standard specs" />
            {form.modified && (
              <div className="pl-14">
                <label className="form-label">Modification Details</label>
                <input className="form-input" placeholder="Describe modifications" value={form.modificationDetails} onChange={e => update('modificationDetails', e.target.value)} />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!form.make || !form.model || !form.regoNumber}
          className="w-full h-12 bg-primary text-primary-foreground rounded-2xl font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
          style={{ boxShadow: '0 4px 14px hsl(245 58% 60% / 0.35)' }}
        >
          <Check className="w-4 h-4" strokeWidth={2.5} />
          {isEdit ? 'Update Vehicle' : 'Save Vehicle'}
        </button>
      </div>
    </AppLayout>
  );
}
