import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Mail, X, Download, Share2, Phone, Pencil, Save, Loader2, Send, Car, Users, Wrench, Trash2 } from 'lucide-react';
import { getClaims, getVehicles, deleteClaim } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import ClaimMessages from '@/components/ClaimMessages';
import { WEATHER_OPTIONS, ROAD_OPTIONS, ClaimReport, Vehicle } from '@/types';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getMediumUrl, getFullUrl } from '@/lib/image-url';

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [claim, setClaim] = useState<ClaimReport | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [photos, setPhotos] = useState<{ id: string; url: string; fileName: string }[]>([]);
  const [tpPhotos, setTpPhotos] = useState<{ id: string; url: string; type: string; tpIndex: number }[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [insurerPhone, setInsurerPhone] = useState('');
  const [insurerEmail, setInsurerEmail] = useState('');
  const [insuranceCompanies, setInsuranceCompanies] = useState<{ id: string; name: string }[]>([]);
  const [editingInsurance, setEditingInsurance] = useState(false);
  const [editInsurance, setEditInsurance] = useState('');
  const [editRepairerName, setEditRepairerName] = useState('');
  const [editRepairerPhone, setEditRepairerPhone] = useState('');
  const [editRepairerAddress, setEditRepairerAddress] = useState('');
  const [savingInsurance, setSavingInsurance] = useState(false);
  const [panelShops, setPanelShops] = useState<{ id: string; name: string; phone: string; address: string }[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [claimNumber, setClaimNumber] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!claim) return;
    setDeleting(true);
    try {
      await deleteClaim(claim.id);
      toast.success('Report deleted');
      navigate('/claims');
    } catch {
      toast.error('Failed to delete report');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [{ data: claimRow }, vehs, { data: claimNumData }] = await Promise.all([
        supabase.from('claims').select('*').eq('id', id).single(),
        getVehicles(),
        supabase.from('claims').select('claim_number').eq('id', id).single(),
      ]);
      
      if (!claimRow) { setLoading(false); return; }
      
      const foundClaim: ClaimReport = {
        id: claimRow.id, status: claimRow.status as any, createdAt: claimRow.created_at, updatedAt: claimRow.updated_at,
        incidentDate: claimRow.incident_date, incidentTime: claimRow.incident_time, incidentLocation: claimRow.incident_location,
        vehicleUsage: claimRow.vehicle_usage, journeyDetails: claimRow.journey_details, description: claimRow.description,
        vehicleId: claimRow.vehicle_id, speedBeforeBraking: claimRow.speed_before_braking,
        thirdParties: claimRow.third_parties as any || [], otherPropertyDamage: claimRow.other_property_damage,
        otherPropertyOwner: claimRow.other_property_owner, witnesses: claimRow.witnesses as any || [],
        policeAttended: claimRow.police_attended, policeOfficerDetails: claimRow.police_officer_details,
        anyoneHurt: claimRow.anyone_hurt, injuryDetails: claimRow.injury_details,
        weatherCondition: claimRow.weather_condition as any, roadCondition: claimRow.road_condition as any,
        driverConsumedSubstance: claimRow.driver_consumed_substance, substanceDetails: claimRow.substance_details,
        blameDescription: claimRow.blame_description, liabilityAdmitted: claimRow.liability_admitted,
        liabilityDetails: claimRow.liability_details, damageDescription: claimRow.damage_description,
        vehicleTowed: claimRow.vehicle_towed, towingCompany: claimRow.towing_company,
        repairerName: claimRow.repairer_name, repairerPhone: claimRow.repairer_phone,
        repairerAddress: claimRow.repairer_address, insuranceCompany: claimRow.insurance_company || '',
        selectedPanelShopId: claimRow.selected_panel_shop_id || '',
      };
      setClaim(foundClaim);
      setVehicles(vehs);
      if (claimNumData?.claim_number) setClaimNumber(String(claimNumData.claim_number));

      const [photosRes, tpRes, insurersRes, shopsRes] = await Promise.all([
        supabase.from('claim_photos').select('*').eq('claim_id', id),
        supabase.from('tp_photos').select('*').eq('claim_id', id),
        supabase.from('insurance_companies').select('id, name').order('name'),
        supabase.from('panel_shops').select('id, name, phone, address').order('name'),
      ]);

      if (foundClaim.insuranceCompany) {
        const { data: insurer } = await supabase.from('insurance_companies').select('phone, email').eq('name', foundClaim.insuranceCompany).single();
        if (insurer?.phone) setInsurerPhone(insurer.phone);
        if (insurer?.email) setInsurerEmail(insurer.email);
      }
      
      if (photosRes.data) {
        setPhotos(photosRes.data.map((p: any) => {
          const { data } = supabase.storage.from('claim-photos').getPublicUrl(p.file_path);
          return { id: p.id, url: data.publicUrl, fileName: p.file_name };
        }));
      }
      
      if (tpRes.data) {
        setTpPhotos(tpRes.data.map((p: any) => {
          const { data } = supabase.storage.from('tp-photos').getPublicUrl(p.file_path);
          return { id: p.id, url: data.publicUrl, type: p.type, tpIndex: p.tp_index };
        }));
      }
      
      if (insurersRes.data) setInsuranceCompanies(insurersRes.data);
      if (shopsRes.data) setPanelShops(shopsRes.data);
      
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <AppLayout><div className="text-center py-20"><p className="text-sm text-muted-foreground">{t('common.loading')}</p></div></AppLayout>;
  if (!claim) return <AppLayout><div className="text-center py-20"><p className="text-sm text-muted-foreground">Report not found.</p></div></AppLayout>;

  const vehicle = vehicles.find(v => v.id === claim.vehicleId);
  const weather = claim.weatherCondition ? t(`weather.${claim.weatherCondition}`) : '—';
  const road = claim.roadCondition ? t(`road.${claim.roadCondition}`) : '—';

  const startEditInsurance = () => {
    setEditInsurance(claim.insuranceCompany);
    setEditRepairerName(claim.repairerName);
    setEditRepairerPhone(claim.repairerPhone);
    setEditRepairerAddress(claim.repairerAddress);
    setEditingInsurance(true);
  };

  const saveInsuranceDetails = async () => {
    if (!claim.id) return;
    setSavingInsurance(true);
    await supabase.from('claims').update({
      insurance_company: editInsurance,
      repairer_name: editRepairerName,
      repairer_phone: editRepairerPhone,
      repairer_address: editRepairerAddress,
    }).eq('id', claim.id);
    setClaim({ ...claim, insuranceCompany: editInsurance, repairerName: editRepairerName, repairerPhone: editRepairerPhone, repairerAddress: editRepairerAddress });
    if (editInsurance) {
      const { data: ins } = await supabase.from('insurance_companies').select('phone, email').eq('name', editInsurance).single();
      setInsurerPhone(ins?.phone || '');
      setInsurerEmail(ins?.email || '');
    }
    setEditingInsurance(false);
    setSavingInsurance(false);
  };

  const handlePrint = () => { window.print(); };
  const handleEmail = () => {
    setEmailTo(insurerEmail);
    setEmailDialogOpen(true);
  };

  const sendReportEmail = async () => {
    if (!emailTo.trim()) { toast.error('Please enter a recipient email'); return; }
    setSendingEmail(true);
    try {
      const veh = vehicles.find(v => v.id === claim.vehicleId);
      const isInsurer = emailTo === insurerEmail && !!insurerEmail;
      const user = (await supabase.auth.getUser()).data.user;
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('user_id', user?.id || '').single();
      
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'claim_submitted',
          to: emailTo,
          data: {
            claimId: claim.id,
            claimNumber: claimNumber,
            date: claim.incidentDate,
            time: claim.incidentTime,
            location: claim.incidentLocation,
            description: claim.description,
            vehicle: veh ? `${veh.year} ${veh.make} ${veh.model}` : '',
            rego: veh?.regoNumber || '',
            insurer: claim.insuranceCompany,
            policyNumber: veh?.insurancePolicyNumber || '',
            damageDescription: claim.damageDescription,
            vehicleUsage: claim.vehicleUsage,
            journeyDetails: claim.journeyDetails,
            speedBeforeBraking: claim.speedBeforeBraking,
            vehicleTowed: claim.vehicleTowed ? 'Yes' : 'No',
            towingCompany: claim.towingCompany,
            thirdParties: JSON.stringify(claim.thirdParties),
            witnesses: JSON.stringify(claim.witnesses),
            policeAttended: claim.policeAttended ? 'Yes' : 'No',
            policeOfficerDetails: claim.policeOfficerDetails,
            anyoneHurt: claim.anyoneHurt ? 'Yes' : 'No',
            injuryDetails: claim.injuryDetails,
            weatherCondition: claim.weatherCondition,
            roadCondition: claim.roadCondition,
            driverConsumedSubstance: claim.driverConsumedSubstance ? 'Yes' : 'No',
            substanceDetails: claim.substanceDetails,
            blameDescription: claim.blameDescription,
            liabilityAdmitted: claim.liabilityAdmitted ? 'Yes' : 'No',
            liabilityDetails: claim.liabilityDetails,
            repairerName: claim.repairerName,
            repairerPhone: claim.repairerPhone,
            repairerAddress: claim.repairerAddress,
            clientName: profile?.display_name || '',
            isInsurerEmail: isInsurer ? 'true' : 'false',
            userEmail: user?.email || '',
            userId: user?.id || '',
          },
        },
      });
      if (error) throw error;
      toast.success(`Report sent to ${emailTo}`);
      setEmailDialogOpen(false);
      setEmailTo('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
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
          <button onClick={() => navigate(`/claims/${claim.id}/edit`)} className="p-2 rounded-xl hover:bg-muted transition-colors" title="Edit report">
            <Pencil className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </button>
          <button onClick={handleEmail} className="p-2 rounded-xl hover:bg-muted transition-colors" title="Email report">
            <Mail className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </button>
          <button onClick={handlePrint} className="p-2 rounded-xl hover:bg-muted transition-colors" title="Print / Save as PDF">
            <Printer className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </button>
          {claim.status !== 'submitted' && (
            <button onClick={() => setDeleteDialogOpen(true)} className="p-2 rounded-xl hover:bg-destructive/10 transition-colors" title="Delete report">
              <Trash2 className="w-5 h-5 text-destructive" strokeWidth={1.5} />
            </button>
          )}
          <span className="text-[11px] font-medium text-primary bg-primary/8 px-2 py-1 rounded-lg">{claim.status === 'draft' ? t('common.draft') : claim.status === 'saved' ? 'Saved' : t('common.submitted')}</span>
        </div>

        <div className="hidden print:block mb-6">
          <h1 className="text-xl font-bold text-foreground">{t('claims.detail.incidentReport')}</h1>
          <p className="text-sm text-muted-foreground">{t('claims.review.date')}: {claim.incidentDate} · Status: {claim.status === 'draft' ? t('common.draft') : t('common.submitted')}</p>
        </div>

        <Tabs defaultValue="report" className="print:hidden">
          <TabsList className="w-full grid grid-cols-2 h-11 rounded-xl bg-muted/60">
            <TabsTrigger value="report" className="rounded-lg text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Report Details
            </TabsTrigger>
            <TabsTrigger value="messages" className="rounded-lg text-sm font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="report" className="space-y-4 mt-4">
            {/* ── Section 1: Incident & Vehicle ── */}
            <Section title="Incident & Vehicle" icon={<Car className="w-4 h-4 text-primary" />}>
              <SubHeading>Incident Details</SubHeading>
              <Row label={t('claims.detail.dateTime')} value={`${claim.incidentDate} at ${claim.incidentTime}`} />
              <Row label={t('claims.review.location')} value={claim.incidentLocation} />
              <Row label={t('claims.detail.vehicleUsage')} value={claim.vehicleUsage} />
              <Row label={t('claims.detail.journey')} value={claim.journeyDetails} />
              <Row label={t('claims.review.description')} value={claim.description} />

              <SubHeading>Your Vehicle</SubHeading>
              <Row label={t('claims.review.vehicle')} value={vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '—'} />
              <Row label={t('claims.review.rego')} value={vehicle?.regoNumber || '—'} />
              <Row label={t('claims.detail.speedBraking')} value={claim.speedBeforeBraking ? `${claim.speedBeforeBraking} km/h` : '—'} />
              <Row label={t('claims.review.damage')} value={claim.damageDescription} />
              <Row label={t('claims.detail.towed')} value={claim.vehicleTowed ? `${t('common.yes')} – ${claim.towingCompany}` : t('common.no')} />

              <SubHeading>Conditions</SubHeading>
              <Row label={t('claims.review.weatherLabel')} value={weather} />
              <Row label={t('claims.review.roadLabel')} value={road} />
              <Row label={t('claims.detail.substanceUse')} value={claim.driverConsumedSubstance ? claim.substanceDetails : t('common.no')} />
              <Row label={t('claims.detail.faultAssessment')} value={claim.blameDescription} />
              <Row label={t('claims.detail.liabilityAdmitted')} value={claim.liabilityAdmitted ? claim.liabilityDetails : t('common.no')} />
            </Section>

            {/* ── Section 2: Parties & Investigation ── */}
            <Section title="Parties & Investigation" icon={<Users className="w-4 h-4 text-primary" />}>
              {claim.thirdParties.length > 0 ? (
                <>
                  <SubHeading>Third Parties</SubHeading>
                  {claim.thirdParties.map((tp, i) => {
                    const tpDamagePhotos = tpPhotos.filter(p => p.tpIndex === i && p.type === 'damage');
                    const tpRegoPhotos = tpPhotos.filter(p => p.tpIndex === i && p.type === 'rego');
                    const tpLicensePhotos = tpPhotos.filter(p => p.tpIndex === i && p.type === 'license');
                    return (
                      <div key={i} className="p-3 rounded-xl bg-background space-y-2">
                        <Row label={t('claims.review.owner')} value={tp.ownerName} />
                        <Row label={t('claims.review.vehicle')} value={`${tp.make} ${tp.model} – ${tp.regoNumber}`} />
                        <Row label={t('claims.thirdParty.phone')} value={tp.phone} />
                        <Row label={t('claims.thirdParty.insurer')} value={tp.insurer} />
                        <Row label={t('claims.review.damage')} value={tp.damageDescription} />
                        {tpDamagePhotos.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-muted-foreground">Damage photos</span>
                            <div className="grid grid-cols-4 gap-1.5">
                              {tpDamagePhotos.map(p => (
                                <button key={p.id} onClick={() => setLightboxUrl(p.url)} className="rounded-lg overflow-hidden aspect-square bg-muted">
                                  <img src={p.url} alt="Damage" className="w-full h-full object-cover" loading="lazy" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {tpRegoPhotos.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-muted-foreground">Rego/plate photos</span>
                            <div className="grid grid-cols-4 gap-1.5">
                              {tpRegoPhotos.map(p => (
                                <button key={p.id} onClick={() => setLightboxUrl(p.url)} className="rounded-lg overflow-hidden aspect-square bg-muted">
                                  <img src={p.url} alt="Rego" className="w-full h-full object-cover" loading="lazy" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {tpLicensePhotos.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-muted-foreground">Driver's license</span>
                            <div className="grid grid-cols-4 gap-1.5">
                              {tpLicensePhotos.map(p => (
                                <button key={p.id} onClick={() => setLightboxUrl(p.url)} className="rounded-lg overflow-hidden aspect-square bg-muted">
                                  <img src={p.url} alt="License" className="w-full h-full object-cover" loading="lazy" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="text-[13px] text-muted-foreground py-1">No third parties recorded.</p>
              )}

              {claim.witnesses.length > 0 && (
                <>
                  <SubHeading>Witnesses</SubHeading>
                  {claim.witnesses.map((w, i) => <Row key={i} label={t('claims.witnesses.witnessNumber', { number: i + 1 })} value={`${w.name} – ${w.phone}${w.isPassenger ? ` (${t('claims.witnesses.passenger')})` : ''}`} />)}
                </>
              )}

              <SubHeading>Police & Injuries</SubHeading>
              <Row label={t('claims.detail.policeAttended')} value={claim.policeAttended ? `${t('common.yes')} – ${claim.policeOfficerDetails}` : t('common.no')} />
              <Row label={t('claims.detail.injuries')} value={claim.anyoneHurt ? claim.injuryDetails : t('common.no')} />
            </Section>

            {/* ── Section 3: Insurance & Repairs ── */}
            <Section title="Insurance & Repairs" icon={<Wrench className="w-4 h-4 text-primary" />} action={!editingInsurance ? <button onClick={startEditInsurance} className="p-1 rounded-lg hover:bg-muted transition-colors"><Pencil className="w-4 h-4 text-muted-foreground" /></button> : undefined}>
              {editingInsurance ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Insurance Company</label>
                    <select className="form-input text-sm" value={editInsurance} onChange={e => setEditInsurance(e.target.value)}>
                      <option value="">Select insurance</option>
                      {insuranceCompanies.map(ic => <option key={ic.id} value={ic.name}>{ic.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Repairer Name</label>
                    <select className="form-input text-sm" value={editRepairerName} onChange={e => {
                      const shop = panelShops.find(s => s.name === e.target.value);
                      setEditRepairerName(e.target.value);
                      if (shop) { setEditRepairerPhone(shop.phone); setEditRepairerAddress(shop.address); }
                    }}>
                      <option value="">Select a repairer</option>
                      {panelShops.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Repairer Phone</label>
                    <input className="form-input text-sm" value={editRepairerPhone} onChange={e => setEditRepairerPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Repairer Address</label>
                    <input className="form-input text-sm" value={editRepairerAddress} onChange={e => setEditRepairerAddress(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveInsuranceDetails} disabled={savingInsurance} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-1.5">
                      {savingInsurance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                    </button>
                    <button onClick={() => setEditingInsurance(false)} className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <SubHeading>Insurance</SubHeading>
                  <Row label={t('claims.review.insurance')} value={claim.insuranceCompany} />
                  {insurerPhone && (
                    <div className="flex items-center justify-between gap-4 py-2 border-b border-border/60">
                      <span className="text-[13px] text-muted-foreground flex-shrink-0">{t('claims.detail.claimsLine')}</span>
                      <a href={`tel:${insurerPhone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-[13px] font-medium text-primary hover:underline">
                        <Phone className="w-3.5 h-3.5" strokeWidth={2} />{insurerPhone}
                      </a>
                    </div>
                  )}

                  <SubHeading>Repairer</SubHeading>
                  <Row label={t('claims.detail.name')} value={claim.repairerName} />
                  <Row label={t('claims.detail.phone')} value={claim.repairerPhone} />
                  <Row label={t('profile.address')} value={claim.repairerAddress} />
                </>
              )}

              {photos.length > 0 && (
                <>
                  <SubHeading>Damage Photos</SubHeading>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map(p => (
                      <button key={p.id} onClick={() => setLightboxUrl(p.url)} className="rounded-xl overflow-hidden aspect-square bg-muted">
                        <img src={p.url} alt={p.fileName} className="w-full h-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Section>
          </TabsContent>

          <TabsContent value="messages" className="mt-4">
            <ClaimMessages
              claimId={claim.id!}
              insurerEmail={insurerEmail}
              insurerName={claim.insuranceCompany}
            />
          </TabsContent>
        </Tabs>

        {/* Print-only: show report sections */}
        <div className="hidden print:block space-y-4">
          <Section title="Incident & Vehicle" icon={<Car className="w-4 h-4 text-primary" />}>
            <Row label={t('claims.detail.dateTime')} value={`${claim.incidentDate} at ${claim.incidentTime}`} />
            <Row label={t('claims.review.location')} value={claim.incidentLocation} />
            <Row label={t('claims.review.description')} value={claim.description} />
          </Section>
        </div>
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

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Send the full incident report as a PDF attachment.</p>
            {insurerEmail && (
              <button
                onClick={() => setEmailTo(insurerEmail)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${emailTo === insurerEmail ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-muted'}`}
              >
                <span className="font-medium">{claim.insuranceCompany}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{insurerEmail}</span>
              </button>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Recipient email</label>
              <input
                type="email"
                placeholder="Enter email address"
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button onClick={sendReportEmail} disabled={sendingEmail || !emailTo.trim()} className="w-full">
              {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {sendingEmail ? 'Sending...' : 'Send Report'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this incident report? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function SubHeading({ children }: { children: string }) {
  return <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pt-4 pb-1 first:pt-0">{children}</p>;
}

function Section({ title, children, action, icon }: { title: string; children: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Accordion type="single" collapsible defaultValue="item">
      <AccordionItem value="item" className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
        <AccordionTrigger className="px-4 py-3.5 hover:no-underline hover:bg-muted/30 transition-colors [&[data-state=open]]:border-b [&[data-state=open]]:border-border/40">
          <div className="flex items-center gap-3 flex-1">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                {icon}
              </div>
            )}
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {action && <div className="ml-auto mr-2" onClick={e => e.stopPropagation()}>{action}</div>}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-3 pt-2 space-y-0.5">
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-border/40 last:border-0">
      <span className="text-[13px] text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-[13px] font-medium text-foreground text-right">{value || '—'}</span>
    </div>
  );
}
