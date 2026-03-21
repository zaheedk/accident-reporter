import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Mail, X, Download, Share2, Phone } from 'lucide-react';
import { getClaims, getVehicles } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import ClaimMessages from '@/components/ClaimMessages';
import { WEATHER_OPTIONS, ROAD_OPTIONS, ClaimReport, Vehicle } from '@/types';
import { useTranslation } from 'react-i18next';

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [claim, setClaim] = useState<ClaimReport | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [photos, setPhotos] = useState<{ id: string; url: string; fileName: string }[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [insurerPhone, setInsurerPhone] = useState('');
  const [insurerEmail, setInsurerEmail] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getClaims(), getVehicles()]).then(async ([claims, vehs]) => {
      const foundClaim = claims.find(c => c.id === id) || null;
      setClaim(foundClaim);
      setVehicles(vehs);
      if (foundClaim) {
        const { data: photoRows } = await supabase.from('claim_photos').select('*').eq('claim_id', foundClaim.id);
        if (photoRows) {
          const mapped = photoRows.map(p => {
            const { data } = supabase.storage.from('claim-photos').getPublicUrl(p.file_path);
            return { id: p.id, url: data.publicUrl, fileName: p.file_name };
          });
          setPhotos(mapped);
        }
        if (foundClaim.insuranceCompany) {
          const { data: insurer } = await supabase.from('insurance_companies').select('phone, email').eq('name', foundClaim.insuranceCompany).single();
          if (insurer?.phone) setInsurerPhone(insurer.phone);
          if (insurer?.email) setInsurerEmail(insurer.email);
        }
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return <AppLayout><div className="text-center py-20"><p className="text-sm text-muted-foreground">{t('common.loading')}</p></div></AppLayout>;
  if (!claim) return <AppLayout><div className="text-center py-20"><p className="text-sm text-muted-foreground">Report not found.</p></div></AppLayout>;

  const vehicle = vehicles.find(v => v.id === claim.vehicleId);
  const weather = claim.weatherCondition ? t(`weather.${claim.weatherCondition}`) : '—';
  const road = claim.roadCondition ? t(`road.${claim.roadCondition}`) : '—';

  const handlePrint = () => { window.print(); };
  const handleEmail = () => {
    const subject = encodeURIComponent(`Incident Report – ${claim.incidentDate}`);
    const body = encodeURIComponent(
      `Please find the incident report attached.\n\nDate: ${claim.incidentDate} at ${claim.incidentTime}\nLocation: ${claim.incidentLocation}\nVehicle: ${vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'N/A'}\nStatus: ${claim.status === 'draft' ? t('common.draft') : t('common.submitted')}\n\nDescription:\n${claim.description}\n\nDamage:\n${claim.damageDescription}\n\nTo generate a PDF, open the report in your browser and use Print → Save as PDF.`
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
            <p className="text-sm text-muted-foreground">{t('dashboard.report')}</p>
            <h1 className="text-lg font-bold text-foreground -mt-0.5">{t('claims.detail.incidentReport')}</h1>
          </div>
          <button onClick={handleEmail} className="p-2 rounded-xl hover:bg-muted transition-colors" title="Email report">
            <Mail className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </button>
          <button onClick={handlePrint} className="p-2 rounded-xl hover:bg-muted transition-colors" title="Print / Save as PDF">
            <Printer className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </button>
          <span className="text-[11px] font-medium text-primary bg-primary/8 px-2 py-1 rounded-lg">{claim.status === 'draft' ? t('common.draft') : t('common.submitted')}</span>
        </div>

        <div className="hidden print:block mb-6">
          <h1 className="text-xl font-bold text-foreground">{t('claims.detail.incidentReport')}</h1>
          <p className="text-sm text-muted-foreground">{t('claims.review.date')}: {claim.incidentDate} · Status: {claim.status === 'draft' ? t('common.draft') : t('common.submitted')}</p>
        </div>

        <Section title={t('claims.steps.incidentDetails')}>
          <Row label={t('claims.detail.dateTime')} value={`${claim.incidentDate} at ${claim.incidentTime}`} />
          <Row label={t('claims.review.location')} value={claim.incidentLocation} />
          <Row label={t('claims.detail.vehicleUsage')} value={claim.vehicleUsage} />
          <Row label={t('claims.detail.journey')} value={claim.journeyDetails} />
          <Row label={t('claims.review.description')} value={claim.description} />
        </Section>

        <Section title={t('claims.review.yourVehicle')}>
          <Row label={t('claims.review.vehicle')} value={vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '—'} />
          <Row label={t('claims.review.rego')} value={vehicle?.regoNumber || '—'} />
          <Row label={t('claims.detail.speedBraking')} value={claim.speedBeforeBraking ? `${claim.speedBeforeBraking} km/h` : '—'} />
          <Row label={t('claims.review.damage')} value={claim.damageDescription} />
          <Row label={t('claims.detail.towed')} value={claim.vehicleTowed ? `${t('common.yes')} – ${claim.towingCompany}` : t('common.no')} />
        </Section>

        {claim.thirdParties.length > 0 && (
          <Section title={t('claims.review.thirdParties')}>
            {claim.thirdParties.map((tp, i) => (
              <div key={i} className="p-3 rounded-xl bg-background space-y-1">
                <Row label={t('claims.review.owner')} value={tp.ownerName} /><Row label={t('claims.review.vehicle')} value={`${tp.make} ${tp.model} – ${tp.regoNumber}`} />
                <Row label={t('claims.thirdParty.phone')} value={tp.phone} /><Row label={t('claims.thirdParty.insurer')} value={tp.insurer} /><Row label={t('claims.review.damage')} value={tp.damageDescription} />
              </div>
            ))}
          </Section>
        )}

        {claim.witnesses.length > 0 && (
          <Section title={t('claims.review.witnesses')}>
            {claim.witnesses.map((w, i) => <Row key={i} label={t('claims.witnesses.witnessNumber', { number: i + 1 })} value={`${w.name} – ${w.phone}${w.isPassenger ? ` (${t('claims.witnesses.passenger')})` : ''}`} />)}
          </Section>
        )}

        <Section title={t('claims.detail.policeInjuries')}>
          <Row label={t('claims.detail.policeAttended')} value={claim.policeAttended ? `${t('common.yes')} – ${claim.policeOfficerDetails}` : t('common.no')} />
          <Row label={t('claims.detail.injuries')} value={claim.anyoneHurt ? claim.injuryDetails : t('common.no')} />
        </Section>

        <Section title={t('claims.review.conditions')}>
          <Row label={t('claims.review.weatherLabel')} value={weather} /><Row label={t('claims.review.roadLabel')} value={road} />
          <Row label={t('claims.detail.substanceUse')} value={claim.driverConsumedSubstance ? claim.substanceDetails : t('common.no')} />
          <Row label={t('claims.detail.faultAssessment')} value={claim.blameDescription} />
          <Row label={t('claims.detail.liabilityAdmitted')} value={claim.liabilityAdmitted ? claim.liabilityDetails : t('common.no')} />
        </Section>

        <Section title={t('claims.review.insuranceRepairer')}>
          <Row label={t('claims.review.insurance')} value={claim.insuranceCompany} />
          {insurerPhone && (
            <div className="flex items-center justify-between gap-4 py-2 border-b border-border/60">
              <span className="text-[13px] text-muted-foreground flex-shrink-0">{t('claims.detail.claimsLine')}</span>
              <a href={`tel:${insurerPhone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-[13px] font-medium text-primary hover:underline">
                <Phone className="w-3.5 h-3.5" strokeWidth={2} />{insurerPhone}
              </a>
            </div>
          )}
          <Row label={t('claims.detail.name')} value={claim.repairerName} /><Row label={t('claims.detail.phone')} value={claim.repairerPhone} /><Row label={t('profile.address')} value={claim.repairerAddress} />
        </Section>

        {photos.length > 0 && (
          <Section title={t('claims.detail.damagePhotos')}>
            <div className="grid grid-cols-3 gap-2">
              {photos.map(p => (
                <button key={p.id} onClick={() => setLightboxUrl(p.url)} className="rounded-xl overflow-hidden aspect-square bg-muted">
                  <img src={p.url} alt={p.fileName} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </Section>
        )}

        {claim.status === 'submitted' && (
          <ClaimMessages
            claimId={claim.id!}
            insurerEmail={insurerEmail}
            insurerName={claim.insuranceCompany}
          />
        )}
      </div>

      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 print:hidden" onClick={() => setLightboxUrl(null)}>
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button onClick={async (e) => { e.stopPropagation(); if (navigator.share) { try { await navigator.share({ title: 'Damage photo', url: lightboxUrl }); } catch {} } else { await navigator.clipboard.writeText(lightboxUrl); alert('Link copied to clipboard'); } }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" title="Share photo"><Share2 className="w-5 h-5 text-white" /></button>
            <a href={lightboxUrl} download onClick={e => e.stopPropagation()} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" title="Download photo"><Download className="w-5 h-5 text-white" /></a>
            <button onClick={() => setLightboxUrl(null)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"><X className="w-6 h-6 text-white" /></button>
          </div>
          <img src={lightboxUrl} alt="Damage photo" className="max-w-full max-h-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
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
