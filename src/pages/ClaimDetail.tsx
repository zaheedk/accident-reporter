import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getClaims, getVehicles } from '@/lib/storage';
import AppLayout from '@/components/AppLayout';
import { WEATHER_OPTIONS, ROAD_OPTIONS } from '@/types';

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const claim = getClaims().find(c => c.id === id);
  const vehicles = getVehicles();

  if (!claim) return <AppLayout><div className="text-center py-20"><p className="text-sm text-muted-foreground">Report not found.</p></div></AppLayout>;

  const vehicle = vehicles.find(v => v.id === claim.vehicleId);
  const weather = WEATHER_OPTIONS.find(w => w.value === claim.weatherCondition)?.label || '—';
  const road = ROAD_OPTIONS.find(r => r.value === claim.roadCondition)?.label || '—';

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </button>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Report</p>
            <h1 className="text-lg font-bold text-foreground -mt-0.5">Incident report</h1>
          </div>
          <span className="text-[11px] font-medium text-primary bg-primary/8 px-2 py-1 rounded-lg">{claim.status === 'draft' ? 'Draft' : 'Submitted'}</span>
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

        <Section title="Repairer">
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
