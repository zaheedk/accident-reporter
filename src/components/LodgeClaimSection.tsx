import { useState } from 'react';
import { ExternalLink, Phone, Copy, Check, FileText, Globe, PhoneCall } from 'lucide-react';
import { ClaimReport, Vehicle } from '@/types';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface InsurerInfo {
  phone: string;
  email: string;
  claims_portal_url: string;
  claims_method: string;
}

interface LodgeClaimSectionProps {
  claim: ClaimReport;
  vehicle?: Vehicle;
  insurer: InsurerInfo;
  claimNumber: string;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value || value === '—') return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0">
      <div className="min-w-0 flex-1">
        <span className="text-[11px] font-medium text-muted-foreground block">{label}</span>
        <span className="text-[13px] font-medium text-foreground break-words">{value}</span>
      </div>
      <button
        onClick={handleCopy}
        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title="Copy to clipboard"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export default function LodgeClaimSection({ claim, vehicle, insurer, claimNumber }: LodgeClaimSectionProps) {
  const [allCopied, setAllCopied] = useState(false);

  const cheatSheetFields = [
    { label: 'Incident Date', value: claim.incidentDate },
    { label: 'Incident Time', value: claim.incidentTime },
    { label: 'Location', value: claim.incidentLocation },
    { label: 'Vehicle', value: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '' },
    { label: 'Registration', value: vehicle?.regoNumber || '' },
    { label: 'Colour', value: vehicle?.color || '' },
    { label: 'Policy Number', value: vehicle?.insurancePolicyNumber || '' },
    { label: 'What happened', value: claim.description },
    { label: 'Damage to your vehicle', value: claim.damageDescription },
    { label: 'Speed before braking', value: claim.speedBeforeBraking ? `${claim.speedBeforeBraking} km/h` : '' },
    { label: 'Vehicle usage', value: claim.vehicleUsage },
    { label: 'Journey details', value: claim.journeyDetails },
    { label: 'Weather', value: claim.weatherCondition },
    { label: 'Road condition', value: claim.roadCondition },
    { label: 'Vehicle towed', value: claim.vehicleTowed ? `Yes – ${claim.towingCompany}` : 'No' },
    { label: 'Police attended', value: claim.policeAttended ? `Yes – ${claim.policeOfficerDetails}` : 'No' },
    { label: 'Anyone injured', value: claim.anyoneHurt ? `Yes – ${claim.injuryDetails}` : 'No' },
    { label: 'Fault description', value: claim.blameDescription },
    { label: 'Liability admitted', value: claim.liabilityAdmitted ? `Yes – ${claim.liabilityDetails}` : 'No' },
    { label: 'Alcohol/drugs involved', value: claim.driverConsumedSubstance ? `Yes – ${claim.substanceDetails}` : 'No' },
    { label: 'Repairer', value: claim.repairerName ? `${claim.repairerName}, ${claim.repairerPhone}` : '' },
  ];

  // Add third party info
  claim.thirdParties.forEach((tp, i) => {
    const prefix = claim.thirdParties.length > 1 ? `Other party ${i + 1}` : 'Other party';
    cheatSheetFields.push(
      { label: `${prefix} – Name`, value: tp.ownerName },
      { label: `${prefix} – Vehicle`, value: `${tp.make} ${tp.model} (${tp.regoNumber})` },
      { label: `${prefix} – Phone`, value: tp.phone },
      { label: `${prefix} – Insurer`, value: tp.insurer },
      { label: `${prefix} – Policy #`, value: tp.policyNumber || '' },
      { label: `${prefix} – Damage`, value: tp.damageDescription },
    );
  });

  // Add witness info
  claim.witnesses.forEach((w, i) => {
    cheatSheetFields.push(
      { label: `Witness ${i + 1}`, value: `${w.name} – ${w.phone}${w.isPassenger ? ' (passenger)' : ''}` },
    );
  });

  const validFields = cheatSheetFields.filter(f => f.value && f.value !== '—');

  const copyAll = async () => {
    const text = validFields.map(f => `${f.label}: ${f.value}`).join('\n');
    await navigator.clipboard.writeText(text);
    setAllCopied(true);
    toast.success('All details copied to clipboard');
    setTimeout(() => setAllCopied(false), 2000);
  };

  const methodIcon = insurer.claims_method === 'online' ? Globe : insurer.claims_method === 'phone' ? PhoneCall : FileText;
  const MethodIcon = methodIcon;

  return (
    <Accordion type="single" collapsible defaultValue="lodge">
      <AccordionItem value="lodge" className="bg-card rounded-2xl border border-primary/20 overflow-hidden shadow-sm">
        <AccordionTrigger className="px-4 py-3.5 hover:no-underline hover:bg-muted/30 transition-colors [&[data-state=open]]:border-b [&[data-state=open]]:border-border/40">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Lodge Your Claim</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-3 space-y-4">
          {/* Action buttons */}
          <div className="space-y-2">
            {insurer.claims_portal_url && (
              <a
                href={insurer.claims_portal_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ boxShadow: '0 4px 16px hsla(213, 52%, 24%, 0.3)' }}
              >
                <Globe className="w-4 h-4" />
                <span className="flex-1 text-left">Lodge online with {claim.insuranceCompany}</span>
                <ExternalLink className="w-4 h-4 opacity-70" />
              </a>
            )}
            {insurer.phone && (
              <a
                href={`tel:${insurer.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-muted text-foreground text-sm font-semibold transition-all hover:bg-muted/80 active:scale-[0.98] border border-border/50"
              >
                <Phone className="w-4 h-4 text-primary" />
                <span className="flex-1 text-left">Call {claim.insuranceCompany} claims</span>
                <span className="text-muted-foreground font-medium">{insurer.phone}</span>
              </a>
            )}
          </div>

          {/* How to lodge hint */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <MethodIcon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {insurer.claims_method === 'online'
                ? 'Use the button above to open the online form. Copy each field below as you fill it in.'
                : insurer.claims_method === 'phone'
                ? 'Call the number above to lodge your claim by phone. Use the cheat sheet below as a reference during your call.'
                : 'Use the details below to fill in your claim form. Tap any field to copy it.'}
            </p>
          </div>

          {/* Copy all button */}
          <button
            onClick={copyAll}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            {allCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {allCopied ? 'Copied!' : 'Copy all details'}
          </button>

          {/* Cheat sheet */}
          <div className="space-y-0">
            {validFields.map((f, i) => (
              <CopyField key={i} label={f.label} value={f.value} />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
