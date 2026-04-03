import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Camera, X, ImageIcon, Loader2 } from 'lucide-react';
import { getVehicles, saveVehicle } from '@/lib/storage';
import { Vehicle } from '@/types';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { compressImage } from '@/lib/image-compress';

const emptyVehicle: Omit<Vehicle, 'id' | 'createdAt'> = {
  year: '', make: '', model: '', regoNumber: '', color: '',
  wofExpiry: '', regoExpiry: '',
  financeArrangement: false, financeDetails: '', modified: false, modificationDetails: '',
  insuranceCompany: '', insurancePolicyNumber: '', insuranceExpiry: '',
  photoUrl: '',
};

export default function VehicleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(emptyVehicle);
  const [insuranceCompanies, setInsuranceCompanies] = useState<{ id: string; name: string }[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [customInsurer, setCustomInsurer] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    supabase.from('insurance_companies').select('id, name').order('name').then(({ data }) => {
      if (data) setInsuranceCompanies(data);
    });
  }, []);

  useEffect(() => {
    if (id) {
      getVehicles().then(vehicles => {
        const existing = vehicles.find(v => v.id === id);
        if (existing) {
          const { id: _, createdAt: __, ...rest } = existing;
          setForm(rest);
          if (existing.photoUrl) setPhotoPreview(existing.photoUrl);
        }
      });
    }
  }, [id]);

  const update = (field: string, value: string | boolean) => setForm(prev => ({ ...prev, [field]: value }));

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const ext = compressed.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      // Remove old photo if exists
      if (form.photoUrl) {
        const oldPath = form.photoUrl.split('/vehicle-photos/')[1];
        if (oldPath) await supabase.storage.from('vehicle-photos').remove([oldPath]);
      }

      const { error } = await supabase.storage.from('vehicle-photos').upload(filePath, compressed);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('vehicle-photos').getPublicUrl(filePath);
      setForm(prev => ({ ...prev, photoUrl: publicUrl }));
      setPhotoPreview(publicUrl);
    } catch (err: any) {
      alert('Failed to upload photo: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (form.photoUrl) {
      const oldPath = form.photoUrl.split('/vehicle-photos/')[1];
      if (oldPath) await supabase.storage.from('vehicle-photos').remove([oldPath]);
    }
    setForm(prev => ({ ...prev, photoUrl: '' }));
    setPhotoPreview('');
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const finalForm = { ...form };
      if (finalForm.insuranceCompany === '__other__') {
        finalForm.insuranceCompany = customInsurer.trim();
      }
      await saveVehicle({ ...finalForm, id: id || undefined });
      navigate('/vehicles');
    } catch (err: any) {
      const msg = err?.message || 'Failed to save vehicle';
      if (msg.includes('vehicles_user_rego_unique') || msg.includes('duplicate key')) {
        alert('You already have a vehicle with this registration number.');
      } else {
        alert(`Error saving vehicle: ${msg}`);
      }
      setSaving(false);
    }
  };

  const Toggle = ({ active, onToggle, label }: { active: boolean; onToggle: () => void; label: string }) => (
    <div className="flex items-center gap-3 py-1">
      <button type="button" onClick={onToggle}
        className={`w-11 h-6 rounded-full transition-colors relative ${active ? 'bg-foreground' : 'bg-border'}`}>
        <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-card transition-transform shadow-sm ${active ? 'left-[23px]' : 'left-[3px]'}`} />
      </button>
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-bold text-foreground">{isEdit ? t('vehicles.editVehicle') : t('vehicles.addVehicle')}</h1>
        </div>

        {/* Vehicle Photo */}
        <div className="card-surface space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{t('vehicles.vehiclePhoto', 'Vehicle photo')}</h2>
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="Vehicle" className="w-full h-48 object-cover rounded-xl" />
              <button onClick={handleRemovePhoto} className="absolute top-2 right-2 p-1.5 rounded-full bg-foreground/70 text-background hover:bg-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-36 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
            >
              {uploading ? (
                <span className="text-sm">{t('common.uploading', 'Uploading...')}</span>
              ) : (
                <>
                  <ImageIcon className="w-8 h-8" strokeWidth={1.2} />
                  <span className="text-sm">{t('vehicles.addPhoto', 'Add a photo of your vehicle')}</span>
                </>
              )}
            </button>
          )}
          {photoPreview && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" /> {t('vehicles.changePhoto', 'Change photo')}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>

        <div className="card-surface space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">{t('vehicles.year')}</label><input className="form-input" placeholder="2024" value={form.year} onChange={e => update('year', e.target.value)} /></div>
            <div><label className="form-label">{t('vehicles.regoNumber')}</label><input className="form-input tabular-nums" placeholder="ABC123" value={form.regoNumber} onChange={e => update('regoNumber', e.target.value.toUpperCase())} /></div>
          </div>
          <div><label className="form-label">{t('vehicles.make')}</label><input className="form-input" placeholder="Toyota" value={form.make} onChange={e => update('make', e.target.value)} /></div>
          <div><label className="form-label">{t('vehicles.model')}</label><input className="form-input" placeholder="Corolla" value={form.model} onChange={e => update('model', e.target.value)} /></div>
          <div><label className="form-label">{t('vehicles.colour')}</label><input className="form-input" placeholder="Silver" value={form.color} onChange={e => update('color', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">{t('vehicles.wofExpiry')}</label><input type="date" className="form-input tabular-nums" value={form.wofExpiry} onChange={e => update('wofExpiry', e.target.value)} /></div>
            <div><label className="form-label">{t('vehicles.regoExpiry')}</label><input type="date" className="form-input tabular-nums" value={form.regoExpiry} onChange={e => update('regoExpiry', e.target.value)} /></div>
          </div>
        </div>

        <div className="card-surface space-y-4">
          <h2 className="text-sm font-semibold text-foreground">{t('vehicles.insuranceDetails')}</h2>
          <div>
            <label className="form-label">{t('vehicles.insuranceCompany')}</label>
            <Select value={form.insuranceCompany === '__other__' ? '__other__' : form.insuranceCompany} onValueChange={val => {
              if (val === '__other__') {
                update('insuranceCompany', '__other__');
                setCustomInsurer('');
              } else {
                update('insuranceCompany', val);
                setCustomInsurer('');
              }
            }}>
              <SelectTrigger className="form-input">
                <SelectValue placeholder={t('vehicles.selectInsurance')} />
              </SelectTrigger>
              <SelectContent>
                {insuranceCompanies.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
                <SelectItem value="__other__">Other (enter manually)</SelectItem>
              </SelectContent>
            </Select>
            {form.insuranceCompany === '__other__' && (
              <input
                className="form-input mt-2"
                placeholder="Enter insurance company name"
                value={customInsurer}
                onChange={e => setCustomInsurer(e.target.value)}
              />
            )}
          </div>
          <div><label className="form-label">{t('vehicles.policyNumber')}</label><input className="form-input tabular-nums" placeholder="POL-123456" value={form.insurancePolicyNumber} onChange={e => update('insurancePolicyNumber', e.target.value)} /></div>
          <div><label className="form-label">{t('vehicles.policyExpiry')}</label><input type="date" className="form-input tabular-nums" value={form.insuranceExpiry} onChange={e => update('insuranceExpiry', e.target.value)} /></div>
        </div>

        <div className="card-surface space-y-3">
          <Toggle active={form.financeArrangement} onToggle={() => update('financeArrangement', !form.financeArrangement)} label={t('vehicles.financeArrangement')} />
          {form.financeArrangement && (
            <div className="pl-14"><label className="form-label">{t('vehicles.financeDetails')}</label><input className="form-input" placeholder={t('vehicles.financeDetailsPlaceholder')} value={form.financeDetails} onChange={e => update('financeDetails', e.target.value)} /></div>
          )}
          <Toggle active={form.modified} onToggle={() => update('modified', !form.modified)} label={t('vehicles.modified')} />
          {form.modified && (
            <div className="pl-14"><label className="form-label">{t('vehicles.modificationDetails')}</label><input className="form-input" placeholder={t('vehicles.modificationDetailsPlaceholder')} value={form.modificationDetails} onChange={e => update('modificationDetails', e.target.value)} /></div>
          )}
        </div>

        <button onClick={handleSave} disabled={saving || !form.make || !form.model || !form.regoNumber} className="btn-primary w-full h-11">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {isEdit ? t('vehicles.updateVehicle') : t('vehicles.saveVehicle')}
        </button>
      </div>
    </AppLayout>
  );
}
