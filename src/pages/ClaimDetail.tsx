import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Mail, X, Download, Share2, Phone, Pencil, Save, Loader2, Send, Car, Users, Wrench, Trash2, Video, Mic } from 'lucide-react';
import { getClaims, getVehicles, deleteClaim } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { resolveClaimId } from '@/lib/claim-id';
import AppLayout from '@/components/AppLayout';
import ClaimMessages from '@/components/ClaimMessages';
import { WEATHER_OPTIONS, ROAD_OPTIONS, ClaimReport, Vehicle } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getMediumUrl, getFullUrl } from '@/lib/image-url';
import DashcamUploader from '@/components/DashcamUploader';
import CallRecorder from '@/components/CallRecorder';
import SignaturePad, { DECLARATION_TEXT } from '@/components/SignaturePad';
import { FileSignature, CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [claim, setClaim] = useState<ClaimReport | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [photos, setPhotos] = useState<{ id: string; url: string; fullUrl: string; fileName: string }[]>([]);
  const [tpPhotos, setTpPhotos] = useState<{ id: string; url: string; fullUrl: string; type: string; tpIndex: number }[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [insurerPhone, setInsurerPhone] = useState('');
  const [insurerEmail, setInsurerEmail] = useState('');
  const [insurerPortalUrl, setInsurerPortalUrl] = useState('');
  const [insurerClaimsMethod, setInsurerClaimsMethod] = useState('phone');
  const [insuranceCompanies, setInsuranceCompanies] = useState<{ id: string; name: string }[]>([]);
  const [editingInsurance, setEditingInsurance] = useState(false);
  const [editInsurance, setEditInsurance] = useState('');
  const [editRepairerName, setEditRepairerName] = useState('');
  const [editRepairerPhone, setEditRepairerPhone] = useState('');
  const [editRepairerAddress, setEditRepairerAddress] = useState('');
  const [editUserClaimNumber, setEditUserClaimNumber] = useState('');
  const [savingInsurance, setSavingInsurance] = useState(false);
  const [panelShops, setPanelShops] = useState<{ id: string; name: string; phone: string; address: string; email?: string }[]>([]);
  const [selectedQuoteShopId, setSelectedQuoteShopId] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [photosDialogOpen, setPhotosDialogOpen] = useState(false);
  const [photosEmailTo, setPhotosEmailTo] = useState('');
  const [photosMessage, setPhotosMessage] = useState('');
  const [sendingPhotos, setSendingPhotos] = useState(false);
  const [claimNumber, setClaimNumber] = useState('');
  const [reportNumber, setReportNumber] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userPhone, setUserPhone] = useState('');
  const [signature, setSignature] = useState<{ dataUrl: string; name: string; signedAt: string } | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [defaultSignerName, setDefaultSignerName] = useState('');

  const handleDelete = async () => {
    if (!claim) return;
    setDeleting(true);
    try {
      await deleteClaim(claim.id);
      queryClient.invalidateQueries({ queryKey: ['claims'] });
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
      const resolvedId = await resolveClaimId(id);
      if (!resolvedId) { setLoading(false); return; }
      const [{ data: claimRow }, vehs, { data: claimNumData }] = await Promise.all([
        supabase.from('claims').select('*').eq('id', resolvedId).single(),
        getVehicles(undefined),
        supabase.from('claims').select('claim_number, report_number').eq('id', resolvedId).single(),
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
        liabilityDetails: claimRow.liability_details,
        atFault: (claimRow as any).at_fault || '',
        courtesyCarRequested: (claimRow as any).courtesy_car_requested || false,
        damageDescription: claimRow.damage_description,
        vehicleTowed: claimRow.vehicle_towed, towingCompany: claimRow.towing_company,
        repairerName: claimRow.repairer_name, repairerPhone: claimRow.repairer_phone,
        repairerAddress: claimRow.repairer_address, insuranceCompany: claimRow.insurance_company || '',
        selectedPanelShopId: claimRow.selected_panel_shop_id || '',
        userClaimNumber: (claimRow as any).user_claim_number || '',
      };
      setClaim(foundClaim);
      setVehicles(vehs);
      const sig = (claimRow as any).declaration_signature;
      const sigName = (claimRow as any).declaration_signed_name;
      const sigAt = (claimRow as any).declaration_signed_at;
      if (sig && sigName && sigAt) setSignature({ dataUrl: sig, name: sigName, signedAt: sigAt });
      if (sigName) setDefaultSignerName(sigName);
      if (claimNumData?.claim_number) setClaimNumber(String(claimNumData.claim_number));
      if (claimNumData?.report_number) {
        setReportNumber(claimNumData.report_number);
        // If URL still uses the UUID, swap it for the friendly report number
        if (id && id !== claimNumData.report_number && /^[0-9a-f-]{36}$/i.test(id)) {
          navigate(`/claims/${claimNumData.report_number}`, { replace: true });
        }
      }

      const [photosRes, tpRes, insurersRes, shopsRes] = await Promise.all([
        supabase.from('claim_photos').select('*').eq('claim_id', resolvedId),
        supabase.from('tp_photos').select('*').eq('claim_id', resolvedId),
        supabase.from('insurance_companies').select('id, name').order('name'),
        supabase.from('panel_shops').select('id, name, phone, address, email').order('name'),
      ]);

      if (foundClaim.insuranceCompany) {
        const { data: insurer } = await supabase.from('insurance_companies').select('phone, email, claims_portal_url, claims_method').eq('name', foundClaim.insuranceCompany).single();
        if (insurer?.phone) setInsurerPhone(insurer.phone);
        if (insurer?.email) setInsurerEmail(insurer.email);
        if (insurer?.claims_portal_url) setInsurerPortalUrl(insurer.claims_portal_url);
        if (insurer?.claims_method) setInsurerClaimsMethod(insurer.claims_method);
      }

      // Fetch user phone from profile
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: profile } = await supabase.from('profiles').select('phone_number, display_name').eq('user_id', currentUser.id).single();
        if (profile?.display_name && !defaultSignerName) setDefaultSignerName(profile.display_name);
        if (profile?.phone_number) setUserPhone(profile.phone_number);
      }
      
      if (photosRes.data) {
        const photosWithUrls = await Promise.all(
          photosRes.data.map(async (p: any) => ({
            id: p.id,
            url: await getMediumUrl('claim-photos', p.file_path),
            fullUrl: await getFullUrl('claim-photos', p.file_path),
            fileName: p.file_name,
          }))
        );
        setPhotos(photosWithUrls);
      }
      
      if (tpRes.data) {
        const tpWithUrls = await Promise.all(
          tpRes.data.map(async (p: any) => ({
            id: p.id,
            url: await getMediumUrl('tp-photos', p.file_path),
            fullUrl: await getFullUrl('tp-photos', p.file_path),
            type: p.type,
            tpIndex: p.tp_index,
          }))
        );
        setTpPhotos(tpWithUrls);
      }
      
      if (insurersRes.data) setInsuranceCompanies(insurersRes.data);
      if (shopsRes.data) setPanelShops(shopsRes.data);
      
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <AppLayout><div className="text-center py-20"><p className="text-sm text-muted-foreground">Loading...</p></div></AppLayout>;
  if (!claim) return <AppLayout><div className="text-center py-20"><p className="text-sm text-muted-foreground">Report not found.</p></div></AppLayout>;

  const vehicle = vehicles.find(v => v.id === claim.vehicleId);
  const weather = claim.weatherCondition ? claim.weatherCondition.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '—';
  const road = claim.roadCondition ? claim.roadCondition.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '—';

  const startEditInsurance = () => {
    setEditInsurance(claim.insuranceCompany);
    setEditRepairerName(claim.repairerName);
    setEditRepairerPhone(claim.repairerPhone);
    setEditRepairerAddress(claim.repairerAddress);
    setEditUserClaimNumber(claim.userClaimNumber || '');
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
      user_claim_number: editUserClaimNumber,
    }).eq('id', claim.id);
    setClaim({ ...claim, insuranceCompany: editInsurance, repairerName: editRepairerName, repairerPhone: editRepairerPhone, repairerAddress: editRepairerAddress, userClaimNumber: editUserClaimNumber });
    if (editInsurance) {
      const { data: ins } = await supabase.from('insurance_companies').select('phone, email, claims_portal_url, claims_method').eq('name', editInsurance).single();
      setInsurerPhone(ins?.phone || '');
      setInsurerEmail(ins?.email || '');
      setInsurerPortalUrl(ins?.claims_portal_url || '');
      setInsurerClaimsMethod(ins?.claims_method || 'phone');
    }
    setEditingInsurance(false);
    setSavingInsurance(false);
  };

  const handleSaveSignature = async (dataUrl: string, name: string) => {
    if (!claim?.id) return;
    const signedAt = new Date().toISOString();
    const { error } = await supabase.from('claims').update({
      declaration_signature: dataUrl,
      declaration_signed_name: name,
      declaration_signed_at: signedAt,
    } as any).eq('id', claim.id);
    if (error) { toast.error('Could not save signature'); return; }
    setSignature({ dataUrl, name, signedAt });
    toast.success('Declaration signed');
  };

  const handlePrint = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = printRef.current;
    if (!element) return;
    
    // Create a clone for PDF generation with all sections visible
    const clone = element.cloneNode(true) as HTMLElement;
    // Remove print:hidden elements and show print:block elements
    clone.querySelectorAll(').print\\:hidden').forEach(el => (el as HTMLElement).style.display = 'none');
    clone.querySelectorAll('.hidden.print\\:block').forEach(el => (el as HTMLElement).style.display = 'block');
    // Remove the nav/action buttons
    const actionBar = clone.querySelector('.print\\:hidden');
    if (actionBar) actionBar.remove();
    
    // Build a clean printable div
    const printDiv = document.createElement('div');
    printDiv.style.padding = '20px';
    printDiv.style.fontFamily = 'system-ui, sans-serif';
    printDiv.style.color = '#1a1a1a';
    printDiv.style.background = '#ffffff';
    printDiv.style.maxWidth = '800px';

    // Header — solid dark navy band (avoid gradient: html2canvas can render it incorrectly)
    const header = document.createElement('div');
    header.style.cssText = 'margin:-20px -20px 24px -20px;padding:24px 20px;background-color:#1e3a5f;background-image:none;color:#ffffff;border-radius:0;';
    header.innerHTML = `
      <h1 style="font-size:22px;font-weight:700;margin:0 0 6px 0;color:#ffffff;letter-spacing:-0.01em;">Incident Report</h1>
      <p style="font-size:12px;color:#cbd5e1;margin:0;">Date: ${claim.incidentDate} · Time: ${claim.incidentTime} · Status: ${claim.status === 'draft' ? 'Draft' : 'Saved'}${claimNumber ? ` · CLM-${claimNumber.padStart(4, '0')}` : ''}</p>
    `;
    printDiv.appendChild(header);

    // Helper to add sections
    const addSection = (title: string, rows: [string, string][]) => {
      const section = document.createElement('div');
      section.style.marginBottom = '20px';
      section.innerHTML = `<h2 style="font-size:13px;font-weight:700;color:#1e3a5f;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.05em;">${title}</h2>`;
      rows.forEach(([label, value]) => {
        if (!value || value === '—') return;
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;gap:16px;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px;';
        row.innerHTML = `<span style="color:#6b7280;flex-shrink:0;">${label}</span><span style="font-weight:500;text-align:right;">${value}</span>`;
        section.appendChild(row);
      });
      printDiv.appendChild(section);
    };

    addSection('Incident Details', [
      ['Date & Time', `${claim.incidentDate} at ${claim.incidentTime}`],
      ['Location', claim.incidentLocation],
      ['Vehicle Usage', claim.vehicleUsage],
      ['Journey', claim.journeyDetails],
      ['Description', claim.description],
    ]);

    addSection('Your Vehicle', [
      ['Vehicle', vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '—'],
      ['Registration', vehicle?.regoNumber || '—'],
      ['Speed Before Braking', claim.speedBeforeBraking ? `${claim.speedBeforeBraking} km/h` : '—'],
      ['Damage', claim.damageDescription],
      ['Towed', claim.vehicleTowed ? `Yes – ${claim.towingCompany}` : 'No'],
    ]);

    addSection('Conditions', [
      ['Weather', weather],
      ['Road', road],
      ['Substance Use', claim.driverConsumedSubstance ? claim.substanceDetails : 'No'],
      ['At Fault', claim.atFault === 'me' ? 'I am at fault' : claim.atFault === 'other_party' ? 'Other party at fault' : claim.atFault === 'shared' ? 'Shared fault' : '—'],
      ['Courtesy Car', claim.atFault === 'other_party' ? (claim.courtesyCarRequested ? 'Requested' : 'Not requested') : '—'],
      ['Fault Assessment', claim.blameDescription],
      ['Liability Admitted', claim.liabilityAdmitted ? claim.liabilityDetails : 'No'],
    ]);

    if (claim.thirdParties.length > 0) {
      const tpRows: [string, string][] = [];
      claim.thirdParties.forEach((tp, i) => {
        const prefix = claim.thirdParties.length > 1 ? `Party ${i + 1}` : 'Other Party';
        tpRows.push([`${prefix} – Driver`, tp.ownerName]);
        tpRows.push([`${prefix} – Vehicle`, `${tp.make} ${tp.model} (${tp.regoNumber})`]);
        tpRows.push([`${prefix} – Phone`, tp.phone]);
        tpRows.push([`${prefix} – Insurer`, tp.insurer]);
        if (tp.damageDescription) tpRows.push([`${prefix} – Damage`, tp.damageDescription]);
      });
      addSection('Third Parties', tpRows);
    }

    if (claim.witnesses.length > 0) {
      addSection('Witnesses', claim.witnesses.map((w, i) => [`Witness ${i + 1}`, `${w.name} – ${w.phone}${w.isPassenger ? ' (passenger)' : ''}`] as [string, string]));
    }

    addSection('Police & Injuries', [
      ['Police Attended', claim.policeAttended ? `Yes – ${claim.policeOfficerDetails}` : 'No'],
      ['Injuries', claim.anyoneHurt ? claim.injuryDetails : 'No'],
    ]);

    addSection('Insurance & Repairs', [
      ['Insurance Company', claim.insuranceCompany],
      ['Repairer', claim.repairerName],
      ['Repairer Phone', claim.repairerPhone],
      ['Repairer Address', claim.repairerAddress],
    ]);

    // Declaration & signature
    const decl = document.createElement('div');
    decl.style.cssText = 'margin-top:24px;padding:14px;border:1px solid #e5e7eb;border-radius:8px;page-break-inside:avoid;';
    const declLines = DECLARATION_TEXT.map(l => `<p style="margin:0 0 6px 0;font-size:11px;color:#374151;line-height:1.45;">${l}</p>`).join('');
    let sigBlock = '';
    if (signature) {
      const signedDate = new Date(signature.signedAt).toLocaleString('en-NZ');
      sigBlock = `
        <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;">
          <div style="flex:1;">
            <img src="${signature.dataUrl}" alt="Signature" style="max-height:70px;max-width:280px;display:block;" />
            <div style="border-top:1px solid #1f2937;margin-top:4px;padding-top:4px;font-size:11px;color:#374151;">
              <strong>${signature.name}</strong> &middot; Signed by the driver
            </div>
          </div>
          <div style="font-size:11px;color:#6b7280;text-align:right;">Date<br/><strong style="color:#1f2937;">${signedDate}</strong></div>
        </div>`;
    } else {
      sigBlock = `
        <div style="margin-top:14px;display:flex;justify-content:space-between;gap:24px;">
          <div style="flex:1;border-top:1px solid #9ca3af;padding-top:4px;font-size:11px;color:#9ca3af;">Signed by the driver</div>
          <div style="width:140px;border-top:1px solid #9ca3af;padding-top:4px;font-size:11px;color:#9ca3af;">Date</div>
        </div>`;
    }
    decl.innerHTML = `
      <h2 style="font-size:13px;font-weight:700;color:#1e3a5f;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.05em;">Declaration &amp; Signature</h2>
      <p style="margin:0 0 8px 0;font-size:11px;font-weight:600;color:#1f2937;">I declare that:</p>
      ${declLines}
      ${sigBlock}
    `;
    printDiv.appendChild(decl);

    const footer = document.createElement('div');
    footer.style.cssText = 'margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;';
    footer.innerHTML = `<p style="font-size:11px;color:#9ca3af;">Generated by SAVO · savo.co.nz · ${new Date().toLocaleDateString()}</p>`;
    printDiv.appendChild(footer);

    document.body.appendChild(printDiv);

    const reportId = claim.id?.slice(0, 8).toUpperCase() || 'report';
    await html2pdf().set({
      margin: [10, 10, 10, 10],
      filename: `SAVO-Incident-${reportId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(printDiv).save();

    document.body.removeChild(printDiv);
  };
  const handleEmail = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    setEmailTo(user?.email || '');
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

  const sendDamagePhotosEmail = async () => {
    const recipient = photosEmailTo.trim();
    if (!recipient) { toast.error('Please enter a recipient email'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) { toast.error('Please enter a valid email address'); return; }
    if (photos.length === 0) { toast.error('No damage photos to send'); return; }
    setSendingPhotos(true);
    try {
      const veh = vehicles.find(v => v.id === claim.vehicleId);
      const vehPolicyNumber = (veh as any)?.insurancePolicyNumber || '';
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'damage_photos',
          to: recipient,
          data: {
            claimId: claim.id,
            claimNumber: claimNumber,
            userClaimNumber: claim.userClaimNumber || '',
            policyNumber: vehPolicyNumber,
            date: claim.incidentDate,
            location: claim.incidentLocation,
            vehicle: veh ? `${veh.year} ${veh.make} ${veh.model}` : '',
            rego: veh?.regoNumber || '',
            photoCount: String(photos.length),
            message: photosMessage.trim().slice(0, 1000),
          },
        },
      });
      if (error) throw error;
      toast.success(`${photos.length} photo${photos.length > 1 ? 's' : ''} sent to ${recipient}`);
      setPhotosDialogOpen(false);
      setPhotosEmailTo('');
      setPhotosMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send photos');
    } finally {
      setSendingPhotos(false);
    }
  };

  const policyNumber = (vehicle as any)?.insurancePolicyNumber || '';
  const displayRef = claim.userClaimNumber || policyNumber || reportNumber || '';
  const displayRefLabel = claim.userClaimNumber
    ? 'Claim'
    : policyNumber
      ? 'Policy'
      : 'Report';
  const reportTitle = displayRef ? `${displayRefLabel} #${displayRef}` : 'Incident report';
  const vehicleSummary = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim() : '';

  return (
    <AppLayout>
      <div className="theme-garage relative">
        <div className="space-y-8 overflow-x-hidden" id="claim-report" ref={printRef}>
          {/* Header — matches Garage / VehicleForm pattern */}
          <div className="flex items-end justify-between gap-3 pt-2 print:hidden">
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
                  {reportTitle}
                </h1>
                <p className="text-[13px] text-muted-foreground mt-1 truncate">
                  {claim.status === 'draft' ? 'Draft' : 'Saved'}{claim.incidentDate ? ` · ${claim.incidentDate}` : ''}{vehicle?.regoNumber ? ` · ${vehicle.regoNumber}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => navigate(`/claims/${reportNumber || claim.id}/edit`)} className="w-9 h-9 rounded-lg hover:bg-muted transition-colors flex items-center justify-center" title="Edit report">
                <Pencil className="w-[18px] h-[18px] text-muted-foreground" strokeWidth={1.8} />
              </button>
              <button onClick={handleEmail} className="w-9 h-9 rounded-lg hover:bg-muted transition-colors flex items-center justify-center" title="Email report">
                <Mail className="w-[18px] h-[18px] text-muted-foreground" strokeWidth={1.8} />
              </button>
              <button onClick={handlePrint} className="w-9 h-9 rounded-lg hover:bg-muted transition-colors flex items-center justify-center" title="Download as PDF">
                <Download className="w-[18px] h-[18px] text-muted-foreground" strokeWidth={1.8} />
              </button>
              <button onClick={() => setDeleteDialogOpen(true)} className="w-9 h-9 rounded-lg hover:bg-destructive/10 transition-colors flex items-center justify-center" title="Delete report">
                <Trash2 className="w-[18px] h-[18px] text-destructive" strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="hidden print:block mb-6">
            <h1 className="text-xl font-bold text-foreground">Incident report</h1>
            <p className="text-sm text-muted-foreground">Date: {claim.incidentDate} · Status: {claim.status === 'draft' ? 'Draft' : 'Saved'}</p>
          </div>

          {/* Body */}
          <div className="md:grid md:grid-cols-[240px_1fr] md:gap-6 lg:grid-cols-[260px_1fr] lg:gap-8 space-y-6 md:space-y-0 print:block">
            {/* Left rail */}
            <aside className="hidden md:block space-y-4 print:hidden">
              {/* Back to incidents tile */}
              <button
                onClick={() => navigate('/claims')}
                className="w-full block rounded-xl bg-card border border-border hover:border-foreground/20 transition-colors p-3.5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0">
                    <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-foreground">All incidents</div>
                    <div className="text-[11px] text-muted-foreground">Back to list</div>
                  </div>
                </div>
              </button>

              {/* Report summary */}
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <div className="px-3.5 pt-3 pb-2 text-[11px] font-medium text-muted-foreground">Report</div>
                <div className="divide-y divide-border">
                  {[
                    { label: 'Status', value: claim.status === 'draft' ? 'Draft' : 'Saved' },
                    { label: displayRefLabel === 'Report' ? 'Report #' : `${displayRefLabel} #`, value: displayRef ? `#${displayRef}` : '' },
                    { label: 'Date', value: claim.incidentDate },
                    { label: 'Vehicle', value: vehicleSummary },
                    { label: 'Rego', value: vehicle?.regoNumber || '' },
                    { label: 'Insurer', value: claim.insuranceCompany },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-3 px-3.5 py-2.5">
                      <p className="flex-1 min-w-0 text-[13px] text-muted-foreground">{label}</p>
                      <span className="text-[13px] font-medium text-foreground tabular-nums truncate max-w-[140px]">{value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <div className="px-3.5 pt-3 pb-2 text-[11px] font-medium text-muted-foreground">Quick actions</div>
                <div className="divide-y divide-border">
                  <button onClick={() => navigate(`/claims/${reportNumber || claim.id}/edit`)} className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors text-left">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                    <p className="flex-1 min-w-0 text-[13px] text-foreground">Edit report</p>
                  </button>
                  <button onClick={handleEmail} className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors text-left">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                    <p className="flex-1 min-w-0 text-[13px] text-foreground">Email report</p>
                  </button>
                  <button onClick={handlePrint} className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors text-left">
                    <Download className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                    <p className="flex-1 min-w-0 text-[13px] text-foreground">Download PDF</p>
                  </button>
                  {insurerPhone && (
                    <a href={`tel:${insurerPhone.replace(/\s/g, '')}`} className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 transition-colors text-left">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                      <p className="flex-1 min-w-0 text-[13px] text-foreground truncate">Call insurer</p>
                    </a>
                  )}
                </div>
              </div>
            </aside>

            {/* Right column */}
            <div className="space-y-6 pb-24 print:pb-0 min-w-0">

        <div className="print:hidden">
          <div className="space-y-4">
            {/* ── Section 1: Incident & Vehicle ── */}
            <Section title="Incident & Vehicle" icon={<Car className="w-4 h-4 text-primary" />}>
              <SubHeading>Incident Details</SubHeading>
              <Row label="Date & time" value={`${claim.incidentDate} at ${claim.incidentTime}`} />
              <Row label="Location" value={claim.incidentLocation} />
              <Row label="Vehicle usage" value={claim.vehicleUsage} />
              <Row label="Journey" value={claim.journeyDetails} />
              <Row label="Description" value={claim.description} />

              <SubHeading>Your Vehicle</SubHeading>
              <Row label="Vehicle" value={vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '—'} />
              <Row label="Rego" value={vehicle?.regoNumber || '—'} />
              <Row label="Speed before braking" value={claim.speedBeforeBraking ? `${claim.speedBeforeBraking} km/h` : '—'} />
              <Row label="Damage" value={claim.damageDescription} />
              <Row label="Towed" value={claim.vehicleTowed ? `$Yes – ${claim.towingCompany}` : 'No'} />

              <SubHeading>Conditions</SubHeading>
              <Row label="Weather" value={weather} />
              <Row label="Road" value={road} />
              <Row label="Substance use" value={claim.driverConsumedSubstance ? claim.substanceDetails : 'No'} />
              <Row label="Fault assessment" value={claim.blameDescription} />
              <Row label="Liability admitted" value={claim.liabilityAdmitted ? claim.liabilityDetails : 'No'} />
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
                        <Row label="Owner" value={tp.ownerName} />
                        <Row label="Vehicle" value={`${tp.make} ${tp.model} – ${tp.regoNumber}`} />
                        <Row label="Phone" value={tp.phone} />
                        <Row label="Insurer" value={tp.insurer} />
                        <Row label="Damage" value={tp.damageDescription} />
                        {tpDamagePhotos.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-muted-foreground">Damage photos</span>
                            <div className="grid grid-cols-4 gap-1.5">
                              {tpDamagePhotos.map(p => (
                                <button key={p.id} onClick={() => setLightboxUrl(p.fullUrl)} className="rounded-lg overflow-hidden aspect-square bg-muted">
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
                                <button key={p.id} onClick={() => setLightboxUrl(p.fullUrl)} className="rounded-lg overflow-hidden aspect-square bg-muted">
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
                                <button key={p.id} onClick={() => setLightboxUrl(p.fullUrl)} className="rounded-lg overflow-hidden aspect-square bg-muted">
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
                  {claim.witnesses.map((w, i) => <Row key={i} label={`Witness ${i + 1}`} value={`${w.name} – ${w.phone}${w.isPassenger ? ` (Passenger)` : ''}`} />)}
                </>
              )}

              <SubHeading>Police & Injuries</SubHeading>
              <Row label="Police attended" value={claim.policeAttended ? `$Yes – ${claim.policeOfficerDetails}` : 'No'} />
              <Row label="Injuries" value={claim.anyoneHurt ? claim.injuryDetails : 'No'} />
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
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Your claim number</label>
                    <input className="form-input text-sm" value={editUserClaimNumber} onChange={e => setEditUserClaimNumber(e.target.value)} placeholder="e.g. CLM-1234 or your insurer's reference" />
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
                  <Row label="Insurance" value={claim.insuranceCompany} />
                  {claim.userClaimNumber && <Row label="Your claim number" value={claim.userClaimNumber} />}
                  {insurerPhone && (
                    <div className="flex items-center justify-between gap-4 py-2 border-b border-border/60">
                      <span className="text-[13px] text-muted-foreground flex-shrink-0">Claims line</span>
                      <a href={`tel:${insurerPhone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-[13px] font-medium text-primary hover:underline">
                        <Phone className="w-3.5 h-3.5" strokeWidth={2} />{insurerPhone}
                      </a>
                    </div>
                  )}

                  <SubHeading>Repairer</SubHeading>
                  <Row label="Name" value={claim.repairerName} />
                  <Row label="Phone" value={claim.repairerPhone} />
                  <Row label="Address" value={claim.repairerAddress} />
                </>
              )}

              {photos.length > 0 && (
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <SubHeading>Damage Photos</SubHeading>
                    <div className="flex items-center gap-3 print:hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedQuoteShopId('');
                          setPhotosEmailTo('');
                          const veh = vehicles.find(v => v.id === claim.vehicleId);
                          const vehDesc = veh ? `${veh.year} ${veh.make} ${veh.model} (${veh.regoNumber})` : '';
                          setPhotosMessage(
                            `Hi,\n\nPlease find attached damage photos from a recent incident${vehDesc ? ` involving my ${vehDesc}` : ''}. Could you please provide a quote for repairs?\n\nThanks.`
                          );
                          setPhotosDialogOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        Request quote
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedQuoteShopId(''); setPhotosEmailTo(''); setPhotosMessage(''); setPhotosDialogOpen(true); }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Email photos
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map(p => (
                      <button key={p.id} onClick={() => setLightboxUrl(p.fullUrl)} className="rounded-xl overflow-hidden aspect-square bg-muted">
                        <img src={p.url} alt={p.fileName} className="w-full h-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Section>

            {/* ── Section 4: Dashcam Footage ── */}
            <Section title="Dashcam Footage" icon={<Video className="w-4 h-4 text-primary" />}>
              <DashcamUploader claimId={claim.id} />
            </Section>

            {/* ── Section 5: Call Recordings ── */}
            <Section title="Call Recordings" icon={<Mic className="w-4 h-4 text-primary" />}>
              <CallRecorder claimId={claim.id} insurerPhone={insurerPhone} userPhone={userPhone} />
            </Section>

            {/* ── Section 6: Declaration & Signature ── */}
            <Section title="Declaration & Signature" icon={<FileSignature className="w-4 h-4 text-primary" />}>
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/40 border border-border p-3 text-[12px] leading-relaxed text-foreground space-y-1.5 max-h-40 overflow-y-auto">
                  <p className="font-semibold">I declare that:</p>
                  {DECLARATION_TEXT.map((l, i) => <p key={i}>{l}</p>)}
                </div>
                {signature ? (
                  <div className="rounded-lg border border-border p-3 bg-background space-y-2">
                    <div className="flex items-center gap-2 text-[12px] text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" /> Signed
                    </div>
                    <img src={signature.dataUrl} alt="Signature" className="max-h-20 object-contain" />
                    <div className="text-[12px] text-foreground"><strong>{signature.name}</strong></div>
                    <div className="text-[11px] text-muted-foreground">{new Date(signature.signedAt).toLocaleString('en-NZ')}</div>
                    <button type="button" onClick={() => setSignatureOpen(true)} className="text-[12px] text-primary hover:underline">Re-sign</button>
                  </div>
                ) : (
                  <Button onClick={() => setSignatureOpen(true)} className="w-full sm:w-auto">
                    <FileSignature className="w-4 h-4 mr-1.5" /> Sign declaration
                  </Button>
                )}
              </div>
            </Section>

          </div>
        </div>

            </div>
          </div>

          {/* Print-only: show report sections */}
          <div className="hidden print:block space-y-4">
            <Section title="Incident & Vehicle" icon={<Car className="w-4 h-4 text-primary" />}>
              <Row label="Date & time" value={`${claim.incidentDate} at ${claim.incidentTime}`} />
              <Row label="Location" value={claim.incidentLocation} />
              <Row label="Description" value={claim.description} />
            </Section>
          </div>
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
            <DialogTitle>Email Report to Yourself</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Send the full incident report as a PDF to your email. Use it as a reference when lodging your claim with your insurer.</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Your email</label>
              <input
                type="email"
                value={emailTo}
                readOnly
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-muted/50 text-foreground cursor-default"
              />
            </div>
            <Button onClick={sendReportEmail} disabled={sendingEmail || !emailTo.trim()} className="w-full">
              {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {sendingEmail ? 'Sending...' : 'Send to My Email'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={photosDialogOpen} onOpenChange={setPhotosDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email Damage Photos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send {photos.length} damage photo{photos.length === 1 ? '' : 's'} as attachments to any email address.
            </p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Recipient email</label>
              <input
                type="email"
                value={photosEmailTo}
                onChange={(e) => setPhotosEmailTo(e.target.value)}
                placeholder="name@example.com"
                maxLength={255}
                autoFocus
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Message (optional)</label>
              <textarea
                value={photosMessage}
                onChange={(e) => setPhotosMessage(e.target.value.slice(0, 1000))}
                placeholder="Add a short note to include with the photos…"
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
              />
              <p className="text-[11px] text-muted-foreground mt-1 text-right">{photosMessage.length}/1000</p>
            </div>
            <Button
              onClick={sendDamagePhotosEmail}
              disabled={sendingPhotos || !photosEmailTo.trim() || photos.length === 0}
              className="w-full"
            >
              {sendingPhotos ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {sendingPhotos ? 'Sending…' : `Send ${photos.length} photo${photos.length === 1 ? '' : 's'}`}
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

      <SignaturePad
        open={signatureOpen}
        onOpenChange={setSignatureOpen}
        onSave={handleSaveSignature}
        defaultName={signature?.name || defaultSignerName}
      />
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
    <div className="flex justify-between gap-4 py-2.5 border-b border-border/40 last:border-0 min-w-0">
      <span className="text-[13px] text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-[13px] font-medium text-foreground text-right break-words min-w-0">{value || '—'}</span>
    </div>
  );
}
