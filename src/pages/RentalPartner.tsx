import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Plus, Trash2, Copy, Building2 } from 'lucide-react';

interface Partner { id: string; company_name: string; inbound_alias: string; logo_url: string; brand_color: string; contact_email: string }
interface Application { id: string; status: string; company_name: string; admin_notes: string; created_at: string }
interface FleetVehicle { id: string; rego_number: string; year: string; make: string; model: string; color: string; vin: string }

export default function RentalPartner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [partner, setPartner] = useState<Partner | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);

  // Apply form
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Add fleet vehicle
  const [newRego, setNewRego] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newColor, setNewColor] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: p }, { data: app }] = await Promise.all([
      supabase.from('rental_partners' as any).select('*').eq('owner_user_id', user.id).maybeSingle(),
      supabase.from('rental_partner_applications' as any).select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setPartner(p as any);
    setApplication(app as any);
    setContactEmail((p as any)?.contact_email || user.email || '');
    if (p) {
      const { data: fl } = await supabase.from('partner_fleet_vehicles' as any).select('*').eq('partner_id', (p as any).id).order('rego_number');
      setFleet((fl || []) as any);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [user?.id]);

  const apply = async () => {
    if (!user || !companyName || !contactEmail) { toast({ title: 'Please fill company and email' }); return; }
    setBusy(true);
    const { error } = await supabase.from('rental_partner_applications' as any).insert({
      user_id: user.id, company_name: companyName, contact_email: contactEmail, phone,
    });
    setBusy(false);
    if (error) toast({ title: 'Failed to submit', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Application submitted — admin will review' }); await load(); }
  };

  const addVehicle = async () => {
    if (!partner || !newRego) return;
    setBusy(true);
    const { error } = await supabase.from('partner_fleet_vehicles' as any).insert({
      partner_id: partner.id,
      rego_number: newRego.toUpperCase().replace(/\s+/g, ''),
      year: newYear, make: newMake, model: newModel, color: newColor,
    });
    setBusy(false);
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else { setNewRego(''); setNewYear(''); setNewMake(''); setNewModel(''); setNewColor(''); await load(); }
  };

  const removeVehicle = async (id: string) => {
    await supabase.from('partner_fleet_vehicles' as any).delete().eq('id', id);
    await load();
  };

  const importCsv = async (file: File) => {
    if (!partner) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const [header, ...rows] = lines;
    const cols = header.toLowerCase().split(',').map(s => s.trim());
    const idx = (k: string) => cols.indexOf(k);
    const records = rows.map(r => {
      const c = r.split(',').map(s => s.trim());
      return {
        partner_id: partner.id,
        rego_number: (c[idx('rego')] || c[idx('rego_number')] || '').toUpperCase().replace(/\s+/g, ''),
        year: c[idx('year')] || '',
        make: c[idx('make')] || '',
        model: c[idx('model')] || '',
        color: c[idx('color')] || '',
        vin: c[idx('vin')] || '',
      };
    }).filter(r => r.rego_number);
    if (!records.length) { toast({ title: 'No rows found. CSV needs header row with rego,year,make,model,color' }); return; }
    setBusy(true);
    const { error } = await supabase.from('partner_fleet_vehicles' as any).upsert(records, { onConflict: 'partner_id,rego_number' });
    setBusy(false);
    if (error) toast({ title: 'Import failed', description: error.message, variant: 'destructive' });
    else { toast({ title: `Imported ${records.length} vehicles` }); await load(); }
  };

  const copyAlias = () => {
    if (!partner) return;
    navigator.clipboard.writeText(partner.inbound_alias);
    toast({ title: 'Email address copied' });
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6" />
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>Rental Partner</h1>
        </div>

        {!partner && !application && (
          <Card className="p-5 space-y-3">
            <h2 className="font-semibold">Apply to become a SAVO rental partner</h2>
            <p className="text-sm text-muted-foreground">Attach hire vehicles and signed rental agreements directly to your customers' SAVO accounts.</p>
            <Input placeholder="Company name" value={companyName} onChange={e => setCompanyName(e.target.value)} />
            <Input placeholder="Contact email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
            <Input placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
            <Button onClick={apply} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit application'}</Button>
          </Card>
        )}

        {application && !partner && (
          <Card className="p-5">
            <p className="text-sm">Application status: <strong>{application.status}</strong></p>
            {application.admin_notes && <p className="text-sm text-muted-foreground mt-2">{application.admin_notes}</p>}
          </Card>
        )}

        {partner && (
          <>
            <Card className="p-5 space-y-3">
              <h2 className="font-semibold">Your inbound email</h2>
              <p className="text-sm text-muted-foreground">Email signed rental agreement PDFs to this address. SAVO will parse them and attach the vehicle to the customer's account.</p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted font-mono text-sm">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{partner.inbound_alias}</span>
                <Button size="sm" variant="ghost" onClick={copyAlias}><Copy className="w-4 h-4" /></Button>
              </div>
            </Card>

            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Fleet ({fleet.length})</h2>
                <label className="text-sm text-accent hover:underline cursor-pointer">
                  Import CSV
                  <input type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importCsv(f); }} />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">CSV columns: rego, year, make, model, color, vin</p>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Input placeholder="Rego" value={newRego} onChange={e => setNewRego(e.target.value)} />
                <Input placeholder="Year" value={newYear} onChange={e => setNewYear(e.target.value)} />
                <Input placeholder="Make" value={newMake} onChange={e => setNewMake(e.target.value)} />
                <Input placeholder="Model" value={newModel} onChange={e => setNewModel(e.target.value)} />
                <Input placeholder="Color" value={newColor} onChange={e => setNewColor(e.target.value)} />
              </div>
              <Button onClick={addVehicle} disabled={busy || !newRego} size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button>

              <div className="divide-y divide-border">
                {fleet.map(v => (
                  <div key={v.id} className="flex items-center justify-between py-2">
                    <div className="text-sm"><span className="font-mono font-semibold">{v.rego_number}</span> <span className="text-muted-foreground">· {v.year} {v.make} {v.model} {v.color}</span></div>
                    <Button size="sm" variant="ghost" onClick={() => removeVehicle(v.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
                {!fleet.length && <p className="text-sm text-muted-foreground py-4">No fleet vehicles yet. Add some above or import a CSV.</p>}
              </div>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
