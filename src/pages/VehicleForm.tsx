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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-md hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</h1>
        </div>

        <div className="card-surface space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Year</label>
              <input className="form-input" placeholder="2024" value={form.year} onChange={e => update('year', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Rego Number</label>
              <input className="form-input tabular-nums font-mono" placeholder="ABC123" value={form.regoNumber} onChange={e => update('regoNumber', e.target.value.toUpperCase())} />
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">WOF Expiry</label>
              <input type="date" className="form-input tabular-nums" value={form.wofExpiry} onChange={e => update('wofExpiry', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Rego Expiry</label>
              <input type="date" className="form-input tabular-nums" value={form.regoExpiry} onChange={e => update('regoExpiry', e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={() => update('financeArrangement', !form.financeArrangement)}
              className={`w-10 h-6 rounded-full transition-colors relative ${form.financeArrangement ? 'bg-foreground' : 'bg-muted'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform ${form.financeArrangement ? 'left-[18px] bg-background' : 'left-0.5 bg-muted-foreground'}`} />
            </button>
            <span className="text-sm text-foreground">Subject to finance arrangement</span>
          </div>
          {form.financeArrangement && (
            <div>
              <label className="form-label">Finance Details</label>
              <input className="form-input" placeholder="Finance company and details" value={form.financeDetails} onChange={e => update('financeDetails', e.target.value)} />
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => update('modified', !form.modified)}
              className={`w-10 h-6 rounded-full transition-colors relative ${form.modified ? 'bg-foreground' : 'bg-muted'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-transform ${form.modified ? 'left-[18px] bg-background' : 'left-0.5 bg-muted-foreground'}`} />
            </button>
            <span className="text-sm text-foreground">Modified from standard specs</span>
          </div>
          {form.modified && (
            <div>
              <label className="form-label">Modification Details</label>
              <input className="form-input" placeholder="Describe modifications" value={form.modificationDetails} onChange={e => update('modificationDetails', e.target.value)} />
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={!form.make || !form.model || !form.regoNumber}
          className="w-full h-11 bg-foreground text-background rounded-md font-medium text-sm transition-all hover:bg-foreground/90 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" strokeWidth={2} />
          {isEdit ? 'Update Vehicle' : 'Save Vehicle'}
        </button>
      </div>
    </AppLayout>
  );
}
