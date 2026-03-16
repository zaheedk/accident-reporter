import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { getClaims, getVehicles } from '@/lib/storage';
import AppLayout from '@/components/AppLayout';
import { WEATHER_OPTIONS, ROAD_OPTIONS } from '@/types';

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const claim = getClaims().find(c => c.id === id);
  const vehicles = getVehicles();

  if (!claim) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground">Report not found.</p>
        </div>
      </AppLayout>
    );
  }

  const vehicle = vehicles.find(v => v.id === claim.vehicleId);
  const weather = WEATHER_OPTIONS.find(w => w.value === claim.weatherCondition)?.label || '—';
  const road = ROAD_OPTIONS.find(r => r.value === claim.roadCondition)?.label || '—';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="section-title">Incident Report</h1>
            <p className="text-xs text-muted-foreground tabular-nums">{claim.incidentDate} at {claim.incidentTime}</p>
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">{claim.status}</span>
        </div>

        <Section title="Incident Details">
          <Row label="Location" value={claim.incidentLocation} />
          <Row label="Vehicle Usage" value={claim.vehicleUsage} />
          <Row label="Journey" value={claim.journeyDetails} />
          <Row label="Description" value={claim.description} />
        </Section>

        <Section title="Your Vehicle">
          <Row label="Vehicle" value={vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '—'} />
          <Row label="Rego" value={vehicle?.regoNumber || '—'} />
          <Row label="Speed Before Braking" value={claim.speedBeforeBraking ? `${claim.speedBeforeBraking} km/h` : '—'} />
          <Row label="Damage" value={claim.damageDescription} />
          <Row label="Towed" value={claim.vehicleTowed ? `Yes – ${claim.towingCompany}` : 'No'} />
        </Section>

        {claim.thirdParties.length > 0 && (
          <Section title="Third Parties">
            {claim.thirdParties.map((tp, i) => (
              <div key={i} className="p-3 rounded-lg bg-accent space-y-1">
                <Row label="Owner" value={tp.ownerName} />
                <Row label="Vehicle" value={`${tp.make} ${tp.model} – ${tp.regoNumber}`} />
                <Row label="Phone" value={tp.phone} />
                <Row label="Insurer" value={tp.insurer} />
                <Row label="Damage" value={tp.damageDescription} />
              </div>
            ))}
          </Section>
        )}

        {claim.witnesses.length > 0 && (
          <Section title="Witnesses">
            {claim.witnesses.map((w, i) => (
              <Row key={i} label={`Witness ${i + 1}`} value={`${w.name} – ${w.phone}${w.isPassenger ? ' (Passenger)' : ''}`} />
            ))}
          </Section>
        )}

        <Section title="Police & Injuries">
          <Row label="Police Attended" value={claim.policeAttended ? `Yes – ${claim.policeOfficerDetails}` : 'No'} />
          <Row label="Injuries" value={claim.anyoneHurt ? claim.injuryDetails : 'No'} />
        </Section>

        <Section title="Conditions">
          <Row label="Weather" value={weather} />
          <Row label="Road" value={road} />
          <Row label="Substance Use" value={claim.driverConsumedSubstance ? claim.substanceDetails : 'No'} />
          <Row label="Fault Assessment" value={claim.blameDescription} />
          <Row label="Liability Admitted" value={claim.liabilityAdmitted ? claim.liabilityDetails : 'No'} />
        </Section>

        <Section title="Repairer">
          <Row label="Name" value={claim.repairerName} />
          <Row label="Phone" value={claim.repairerPhone} />
          <Row label="Address" value={claim.repairerAddress} />
        </Section>
      </div>
    </AppLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-surface space-y-2">
      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border last:border-0">
      <span className="text-xs font-medium text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right">{value || '—'}</span>
    </div>
  );
}
