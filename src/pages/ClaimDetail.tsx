import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Mail, X } from 'lucide-react';
import { getClaims, getVehicles } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { WEATHER_OPTIONS, ROAD_OPTIONS, ClaimReport, Vehicle } from '@/types';

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<ClaimReport | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [photos, setPhotos] = useState<{ id: string; url: string; fileName: string }[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getClaims(), getVehicles()]).then(async ([claims, vehs]) => {
      const foundClaim = claims.find(c => c.id === id) || null;
      setClaim(foundClaim);
      setVehicles(vehs);

      if (foundClaim) {
        const { data: photoRows } = await supabase
          .from('claim_photos')
          .select('*')
          .eq('claim_id', foundClaim.id);
        if (photoRows) {
          const mapped = photoRows.map(p => {
            const { data } = supabase.storage.from('claim-photos').getPublicUrl(p.file_path);
            return { id: p.id, url: data.publicUrl, fileName: p.file_name };
          });
          setPhotos(mapped);
        }
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return <AppLayout><div className="text-center py-20"><p className="text-sm text-muted-foreground">Loading...</p></div></AppLayout>;
  if (!claim) return <AppLayout><div className="text-center py-20"><p className="text-sm text-muted-foreground">Report not found.</p></div></AppLayout>;

  const vehicle = vehicles.find(v => v.id === claim.vehicleId);
  const weather = WEATHER_OPTIONS.find(w => w.value === claim.weatherCondition)?.label || '—';
  const road = ROAD_OPTIONS.find(r => r.value === claim.roadCondition)?.label || '—';

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Incident Report – ${claim.incidentDate}`);
    const body = encodeURIComponent(
      `Please find the incident report attached.\n\n` +
      `Date: ${claim.incidentDate} at ${claim.incidentTime}\n` +
      `Location: ${claim.incidentLocation}\n` +
      `Vehicle: ${vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'N/A'}\n` +
      `Status: ${claim.status === 'draft' ? 'Draft' : 'Submitted'}\n\n` +
      `Description:\n${claim.description}\n\n` +
      `Damage:\n${claim.damageDescription}\n\n` +
      `To generate a PDF, open the report in your browser and use Print → Save as PDF.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <AppLayout>
      <div className="space-y-4" id="claim-report" ref={printRef}>
        <div className="flex items-center gap-3 print:hidden">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Report</p>
            <h1 className="text-lg font-bold text-foreground -mt-0.5">Incident report</h1>
          </div>
          <button onClick={handleEmail} className="p-2 rounded-xl hover:bg-muted transition-colors" title="Email report">
            <Mail className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </button>
          <button onClick={handlePrint} className="p-2 rounded-xl hover:bg-muted transition-colors" title="Print / Save as PDF">
            <Printer className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </button>
          <span className="text-[11px] font-medium text-primary bg-primary/8 px-2 py-1 rounded-lg">{claim.status === 'draft' ? 'Draft' : 'Submitted'}</span>
        </div>

        {/* Print-only header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-xl font-bold text-foreground">Incident Report</h1>
          <p className="text-sm text-muted-foreground">Date: {claim.incidentDate} · Status: {claim.status === 'draft' ? 'Draft' : 'Submitted'}</p>
        </div>

        <Section title="Incident details">
          <Row label="Date & time" value={`${claim.incidentDate} at ${claim.incidentTime}`} />
          <Row label="Location" value={claim.incidentLocation} />
          <Row label="Vehicle usage" value={claim.vehicleUsage} />
          <Row label="Journey" value={claim.journeyDetails} />
          <Row label="Description" value={claim.description} />
        </Section>

        <Section title="Your vehicle">
          <Row label="Vehicle" value={vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '—'} />
          <Row label="Rego" value={vehicle?.regoNumber || '—'} />
          <Row label="Speed before braking" value={claim.speedBeforeBraking ? `${claim.speedBeforeBraking} km/h` : '—'} />
          <Row label="Damage" value={claim.damageDescription} />
          <Row label="Towed" value={claim.vehicleTowed ? `Yes – ${claim.towingCompany}` : 'No'} />
        </Section>

        {claim.thirdParties.length > 0 && (
          <Section title="Third parties">
            {claim.thirdParties.map((tp, i) => (
              <div key={i} className="p-3 rounded-xl bg-background space-y-1">
                <Row label="Owner" value={tp.ownerName} /><Row label="Vehicle" value={`${tp.make} ${tp.model} – ${tp.regoNumber}`} />
                <Row label="Phone" value={tp.phone} /><Row label="Insurer" value={tp.insurer} /><Row label="Damage" value={tp.damageDescription} />
              </div>
            ))}
          </Section>
        )}

        {claim.witnesses.length > 0 && (
          <Section title="Witnesses">
            {claim.witnesses.map((w, i) => <Row key={i} label={`Witness ${i + 1}`} value={`${w.name} – ${w.phone}${w.isPassenger ? ' (Passenger)' : ''}`} />)}
          </Section>
        )}

        <Section title="Police & injuries">
          <Row label="Police attended" value={claim.policeAttended ? `Yes – ${claim.policeOfficerDetails}` : 'No'} />
          <Row label="Injuries" value={claim.anyoneHurt ? claim.injuryDetails : 'No'} />
        </Section>

        <Section title="Conditions">
          <Row label="Weather" value={weather} /><Row label="Road" value={road} />
          <Row label="Substance use" value={claim.driverConsumedSubstance ? claim.substanceDetails : 'No'} />
          <Row label="Fault assessment" value={claim.blameDescription} />
          <Row label="Liability admitted" value={claim.liabilityAdmitted ? claim.liabilityDetails : 'No'} />
        </Section>

        <Section title="Insurance & Repairer">
          <Row label="Insurance" value={claim.insuranceCompany} />
          <Row label="Name" value={claim.repairerName} /><Row label="Phone" value={claim.repairerPhone} /><Row label="Address" value={claim.repairerAddress} />
        </Section>
      </div>
    </AppLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card-surface space-y-1"><h3 className="text-[13px] font-semibold text-muted-foreground mb-2">{title}</h3>{children}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border/60 last:border-0">
      <span className="text-[13px] text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-[13px] font-medium text-foreground text-right">{value || '—'}</span>
    </div>
  );
}
