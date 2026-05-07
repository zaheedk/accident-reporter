import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, Camera, X, Loader2, AlertTriangle, Car, FileText, Phone, Shield, ScanLine } from 'lucide-react';
import DocumentVault from '@/components/DocumentVault';
import { getVehicles, saveVehicle } from '@/lib/storage';
import { Vehicle } from '@/types';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { compressImage } from '@/lib/image-compress';
import { useQueryClient } from '@tanstack/react-query';

const emptyVehicle: Omit<Vehicle, 'id' | 'createdAt'> = {
  year: '', make: '', model: '', regoNumber: '', color: '',
  wofExpiry: '', regoExpiry: '',
  financeArrangement: false, financeDetails: '', modified: false, modificationDetails: '',
  insuranceCompany: '', insurancePolicyNumber: '', insuranceExpiry: '',
  roadsideProvider: '', roadsidePhone: '',
  photoUrl: '',
  isActive: true,
};

export default function VehicleForm() {
  const { id: routeParam } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(routeParam);
  const [vehicleUuid, setVehicleUuid] = useState<string | null>(null);
  const [form, setForm] = useState(emptyVehicle);
  const [insuranceCompanies, setInsuranceCompanies] = useState<{ id: string; name: string }[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [customInsurer, setCustomInsurer] = useState('');

  useEffect(() => {
    supabase.from('insurance_companies').select('id, name').order('name').then(({ data }) => {
      if (data) setInsuranceCompanies(data);
    });
  }, []);

  useEffect(() => {
    if (routeParam) {
      getVehicles(undefined).then(vehicles => {
        const upper = routeParam.toUpperCase();
        const existing = vehicles.find(v => v.id === routeParam || (v.slug && v.slug.toUpperCase() === upper));
        if (existing) {
          setVehicleUuid(existing.id);
          const { id: _, slug: __, createdAt: ___, ...rest } = existing as any;
          // Check if insurance company is in the known list
          const knownNames = insuranceCompanies.map(c => c.name);
          if (rest.insuranceCompany && knownNames.length > 0 && !knownNames.includes(rest.insuranceCompany)) {
            setCustomInsurer(rest.insuranceCompany);
            rest.insuranceCompany = '__other__';
          }
          setForm(rest);
          if (existing.photoUrl) setPhotoPreview(existing.photoUrl);
        }
      });
    }
  }, [routeParam, insuranceCompanies]);

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
      await saveVehicle({ ...finalForm, id: vehicleUuid || undefined });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
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
    <label className="flex items-center justify-between gap-3 cursor-pointer" onClick={onToggle}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${active ? 'bg-foreground' : 'bg-muted border border-border'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${active ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  );

  const inputCls = "w-full h-12 px-3.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30";
  const labelCls = "block text-[12px] font-medium text-muted-foreground mb-1.5";

  return (
    <AppLayout>
      <div className="theme-garage relative">
        <div className="space-y-8">
          {/* Header — Apple/Linear: matches Garage page */}
          <div className="flex items-end justify-between gap-3 pt-2">
            <div className="flex items-start gap-2 min-w-0">
              <button
                onClick={() => navigate(-1)}
                aria-label="Back"
                className="w-9 h-9 -ml-1 mt-1 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-[18px] h-[18px]" strokeWidth={2} />
              </button>
              <div className="min-w-0">
                <h1 className="text-[28px] leading-tight font-semibold text-foreground tracking-[-0.02em] truncate">
                  {isEdit ? `${form.year} ${form.make} ${form.model}`.trim() || 'Vehicle' : 'Add vehicle'}
                </h1>
                <p className="text-[13px] text-muted-foreground mt-1">
                  {isEdit ? 'Edit vehicle' : 'New vehicle'}{form.regoNumber ? ` · ${form.regoNumber}` : ''}
                </p>
              </div>
            </div>
            {isEdit && vehicleUuid && (
              <button
                onClick={() => navigate(`/claims/new?vehicleId=${vehicleUuid}`)}
                className="hidden sm:inline-flex md:hidden items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-destructive text-destructive-foreground text-[13px] font-medium transition-all active:scale-[0.98] shrink-0"
              >
                <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.2} />
                Report incident
              </button>
            )}
          </div>

          {/* Body */}
          <div className="md:grid md:grid-cols-[240px_1fr] md:gap-6 lg:grid-cols-[260px_1fr] lg:gap-8 space-y-6 md:space-y-0">
            {/* Left rail — Garage-style cards */}
            <aside className="hidden md:block space-y-4">
              {/* All vehicles tile */}
              <Link
                to="/vehicles"
                className="block rounded-xl bg-card border border-border hover:border-foreground/20 transition-colors p-3.5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0">
                    <Car className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-foreground">All vehicles</div>
                    <div className="text-[11px] text-muted-foreground">Back to garage</div>
                  </div>
                </div>
              </Link>

              {/* Vehicle summary panel — mirrors Alerts panel on Garage */}
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <div className="px-3.5 pt-3 pb-2 text-[11px] font-medium text-muted-foreground">Vehicle</div>
                <div className="divide-y divide-border">
                  {[
                    { label: 'Rego', value: form.regoNumber },
                    { label: 'Make', value: form.make },
                    { label: 'Model', value: form.model },
                    { label: 'Year', value: form.year },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-3 px-3.5 py-2.5">
                      <p className="flex-1 min-w-0 text-[13px] text-muted-foreground">{label}</p>
                      <span className="text-[13px] font-medium text-foreground tabular-nums truncate max-w-[120px]">{value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick actions panel */}
              {isEdit && vehicleUuid && (
                <div className="rounded-xl bg-card border border-border overflow-hidden">
                  <div className="px-3.5 pt-3 pb-2 text-[11px] font-medium text-muted-foreground">Quick actions</div>
                  <div className="divide-y divide-border">
                    <button
                      onClick={() => navigate(`/claims/new?vehicleId=${vehicleUuid}`)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors text-left"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive" strokeWidth={2} />
                      <p className="flex-1 min-w-0 text-[13px] text-foreground">Report incident</p>
                    </button>
                    <a
                      href="tel:111"
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                      <p className="flex-1 min-w-0 text-[13px] text-foreground">Call police · 111</p>
                    </a>
                  </div>
                </div>
              )}
            </aside>

            {/* Right column — form */}
            <div className="space-y-6 pb-24">
              {/* Mobile-only: Report incident */}
              {isEdit && vehicleUuid && (
                <button
                  onClick={() => navigate(`/claims/new?vehicleId=${vehicleUuid}`)}
                  className="sm:hidden w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold transition-all active:scale-[0.98]"
                >
                  <AlertTriangle className="w-4 h-4" strokeWidth={2.2} />
                  Report incident with this vehicle
                </button>
              )}

          {/* Vehicle Photo */}
          <div>
            <label className={labelCls}>Vehicle photo</label>
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border bg-card">
                <img src={photoPreview} alt="Vehicle" className="w-full h-48 object-cover" />
                <button onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-foreground/85 backdrop-blur text-background hover:bg-foreground transition-colors flex items-center justify-center"
                  aria-label="Remove photo">
                  <X className="w-4 h-4" strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-background/90 backdrop-blur text-[12px] font-semibold text-foreground hover:bg-background transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" /> Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full px-6 py-7 rounded-xl border border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center text-center"
              >
                {uploading ? (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                  </span>
                ) : (
                  <>
                    <div className="w-11 h-11 rounded-xl bg-foreground text-background flex items-center justify-center mb-2.5">
                      <Camera className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Add a photo of your vehicle</span>
                    <span className="text-[12px] text-muted-foreground mt-0.5">JPG or PNG, up to 10 MB</span>
                  </>
                )}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>

          {/* Identity */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Year</label>
                <input className={`${inputCls} tabular-nums`} placeholder="2024" value={form.year} onChange={e => update('year', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Rego number</label>
                <input className={`${inputCls} tabular-nums tracking-wide`} placeholder="ABC123" value={form.regoNumber} onChange={e => update('regoNumber', e.target.value.toUpperCase())} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Make</label>
                <input className={inputCls} placeholder="Toyota" value={form.make} onChange={e => update('make', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Model</label>
                <input className={inputCls} placeholder="Corolla" value={form.model} onChange={e => update('model', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Colour</label>
              <input className={inputCls} placeholder="Silver" value={form.color} onChange={e => update('color', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>WOF expiry</label>
                <input type="date" className={`${inputCls} tabular-nums`} value={form.wofExpiry} onChange={e => update('wofExpiry', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Rego expiry</label>
                <input type="date" className={`${inputCls} tabular-nums`} value={form.regoExpiry} onChange={e => update('regoExpiry', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Insurance */}
          <div className="card-soft space-y-4">
            <h2 className="eyebrow">Insurance</h2>
            <div>
              <label className={labelCls}>Insurance company</label>
              <Select value={form.insuranceCompany === '__other__' ? '__other__' : form.insuranceCompany} onValueChange={val => {
                if (val === '__other__') {
                  update('insuranceCompany', '__other__');
                  setCustomInsurer('');
                } else {
                  update('insuranceCompany', val);
                  setCustomInsurer('');
                }
              }}>
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select insurance company" />
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
                  className={`${inputCls} mt-2`}
                  placeholder="Insurance company name"
                  value={customInsurer}
                  onChange={e => setCustomInsurer(e.target.value)}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Policy number</label>
                <input className={`${inputCls} tabular-nums`} placeholder="POL-123456" value={form.insurancePolicyNumber} onChange={e => update('insurancePolicyNumber', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Policy expiry</label>
                <input type="date" className={`${inputCls} tabular-nums`} value={form.insuranceExpiry} onChange={e => update('insuranceExpiry', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Roadside assistance */}
          <div className="card-soft space-y-4">
            <h2 className="eyebrow">Roadside assistance</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Provider</label>
                <input className={inputCls} placeholder="AA, State Roadside…" value={form.roadsideProvider || ''} onChange={e => update('roadsideProvider', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Phone number</label>
                <input type="tel" className={`${inputCls} tabular-nums`} placeholder="0800 500 222" value={form.roadsidePhone || ''} onChange={e => update('roadsidePhone', e.target.value)} />
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground">Shown as a one-tap call button on your home-screen widget.</p>
          </div>

          {/* Conditions */}
          <div className="card-soft space-y-4">
            <h2 className="eyebrow">Status & extras</h2>
            <Toggle active={form.financeArrangement} onToggle={() => update('financeArrangement', !form.financeArrangement)} label="Subject to finance arrangement" />
            {form.financeArrangement && (
              <div>
                <label className={labelCls}>Finance details</label>
                <input className={inputCls} placeholder="Finance company and reference" value={form.financeDetails} onChange={e => update('financeDetails', e.target.value)} />
              </div>
            )}
            <div className="h-px bg-border" />
            <Toggle active={form.modified} onToggle={() => update('modified', !form.modified)} label="Modified from standard specs" />
            {form.modified && (
              <div>
                <label className={labelCls}>Modification details</label>
                <input className={inputCls} placeholder="Describe modifications" value={form.modificationDetails} onChange={e => update('modificationDetails', e.target.value)} />
              </div>
            )}
            <div className="h-px bg-border" />
            <Toggle active={form.isActive} onToggle={() => update('isActive', !form.isActive)} label="Still in your possession" />
            {!form.isActive && (
              <p className="text-[12px] text-muted-foreground">Inactive vehicles are hidden from incident reporting but kept on file.</p>
            )}
          </div>

          {/* Documents */}
          {isEdit && vehicleUuid && (
            <div className="card-soft">
              <DocumentVault
                vehicleId={vehicleUuid}
                title="Vehicle documents"
                showCategories={['insurance_policy', 'registration', 'wof_certificate', 'purchase_receipt', 'service_record', 'other']}
              />
            </div>
          )}

          {/* Sticky-feel footer action */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.make || !form.model || !form.regoNumber}
              className="w-full h-12 rounded-2xl bg-foreground text-background text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none inline-flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={2.2} />}
              {isEdit ? 'Update vehicle' : 'Save vehicle'}
            </button>
          </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
