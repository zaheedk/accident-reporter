import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'Savo <info@savo.co.nz>';

interface EmailRequest {
  type: 'contact_confirmation' | 'claim_submitted' | 'welcome' | 'rego_expiry_reminder' | 'wof_expiry_reminder' | 'insurance_expiry_reminder';
  to: string;
  data?: Record<string, string>;
}

// --- Helpers ---

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// --- PDF Generation ---

function generateClaimPdf(data: Record<string, string>, photoImages: { label: string; base64: string; mime: string }[] = []): string {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPage = (needed: number) => {
    if (y + needed > 270) { doc.addPage(); y = 20; }
  };

  // Header bar
  doc.setFillColor(232, 85, 30);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Savo – Incident Report', margin, 18);
  y = 38;

  // Claim reference
  const claimRef = data.claimNumber ? `CLM-${data.claimNumber.padStart(4, '0')}` : '';
  if (claimRef) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reference: ${claimRef}`, margin, y);
    y += 8;
  }

  const addSection = (title: string) => {
    checkPage(14);
    y += 4;
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 4, contentWidth, 8, 'F');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 3, y + 1);
    y += 10;
  };

  const addRow = (label: string, value: string) => {
    if (!value || value === '—') return;
    checkPage(8);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(label, margin + 2, y);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    // Wrap long text
    const lines = doc.splitTextToSize(value, contentWidth - 55);
    doc.text(lines, margin + 55, y);
    y += Math.max(lines.length * 4.5, 6);
  };

  // Incident Details
  addSection('Incident Details');
  addRow('Date & Time', `${data.date || ''} at ${data.time || ''}`);
  addRow('Location', data.location || '');
  addRow('Vehicle Usage', data.vehicleUsage || '');
  addRow('Journey', data.journeyDetails || '');
  addRow('Description', data.description || '');

  // Vehicle
  addSection('Your Vehicle');
  addRow('Vehicle', data.vehicle || '');
  addRow('Registration', data.rego || '');
  addRow('Speed Before Braking', data.speedBeforeBraking ? `${data.speedBeforeBraking} km/h` : '');
  addRow('Damage', data.damageDescription || '');
  addRow('Vehicle Towed', data.vehicleTowed || '');
  if (data.vehicleTowed === 'Yes') addRow('Towing Company', data.towingCompany || '');

  // Third Parties
  try {
    const tps = JSON.parse(data.thirdParties || '[]');
    if (tps.length > 0) {
      addSection('Third Parties');
      tps.forEach((tp: Record<string, string>, i: number) => {
        addRow(`Party ${i + 1} – Owner`, tp.ownerName || '');
        addRow('Vehicle', `${tp.make || ''} ${tp.model || ''} – ${tp.regoNumber || ''}`);
        addRow('Phone', tp.phone || '');
        addRow('Insurer', tp.insurer || '');
        addRow('Damage', tp.damageDescription || '');
        if (i < tps.length - 1) y += 3;
      });
    }
  } catch {}

  // Witnesses
  try {
    const ws = JSON.parse(data.witnesses || '[]');
    if (ws.length > 0) {
      addSection('Witnesses');
      ws.forEach((w: Record<string, string | boolean>, i: number) => {
        addRow(`Witness ${i + 1}`, `${w.name || ''} – ${w.phone || ''}${w.isPassenger ? ' (Passenger)' : ''}`);
      });
    }
  } catch {}

  // Police & Injuries
  addSection('Police & Injuries');
  addRow('Police Attended', data.policeAttended || '');
  if (data.policeAttended === 'Yes') addRow('Officer Details', data.policeOfficerDetails || '');
  addRow('Anyone Hurt', data.anyoneHurt || '');
  if (data.anyoneHurt === 'Yes') addRow('Injury Details', data.injuryDetails || '');

  // Conditions
  addSection('Conditions & Liability');
  addRow('Weather', data.weatherCondition || '');
  addRow('Road', data.roadCondition || '');
  addRow('Substance Use', data.driverConsumedSubstance || '');
  if (data.driverConsumedSubstance === 'Yes') addRow('Details', data.substanceDetails || '');
  addRow('Fault Assessment', data.blameDescription || '');
  addRow('Liability Admitted', data.liabilityAdmitted || '');
  if (data.liabilityAdmitted === 'Yes') addRow('Details', data.liabilityDetails || '');

  // Insurance & Repairer
  addSection('Insurance & Repairer');
  addRow('Insurance Company', data.insurer || '');
  addRow('Policy Number', data.policyNumber || '');
  addRow('Repairer', data.repairerName || '');
  addRow('Repairer Phone', data.repairerPhone || '');
  addRow('Repairer Address', data.repairerAddress || '');

  // Photos
  if (photoImages.length > 0) {
    addSection('Photos');
    const imgWidth = 75;
    const imgHeight = 56; // 4:3 ratio
    let currentLabel = '';

    for (const photo of photoImages) {
      // Add label if different from previous
      if (photo.label !== currentLabel) {
        checkPage(imgHeight + 14);
        currentLabel = photo.label;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text(currentLabel, margin + 2, y);
        y += 5;
      } else {
        checkPage(imgHeight + 4);
      }

      try {
        const format = photo.mime.includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(photo.base64, format, margin + 2, y, imgWidth, imgHeight);
        y += imgHeight + 4;
      } catch (imgErr) {
        console.error('Failed to add image to PDF:', imgErr);
      }
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    doc.text(`Generated by Savo · Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
  }

  // Return base64
  return doc.output('datauristring').split(',')[1];
}

// --- Email Templates ---

function getEmailContent(type: string, data: Record<string, string> = {}) {
  switch (type) {
    case 'contact_confirmation':
      return {
        subject: 'Thanks for contacting Savo',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #e8551e, #d44a18); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Savo</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">Thanks for reaching out${data.name ? `, ${data.name}` : ''}!</h2>
              <p style="color: #555; line-height: 1.6;">We've received your message and will get back to you as soon as possible.</p>
              ${data.message ? `<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="color: #666; margin: 0; font-style: italic;">"${data.message}"</p></div>` : ''}
              <p style="color: #555; line-height: 1.6;">In the meantime, if you need urgent help, call us at <strong>0800 CLAIMS (252 467)</strong>.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">— The Savo Team</p>
            </div>
          </div>`,
      };

    case 'claim_submitted': {
      const isInsurer = data.isInsurerEmail === 'true';
      const subjectLine = isInsurer
        ? `New Claim Submitted – Policy ${data.policyNumber || 'N/A'} | ${data.rego || ''}`
        : `Your claim has been submitted – ${data.date || 'Savo'}`;
      const bodyHtml = isInsurer
        ? `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #e8551e, #d44a18); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Savo</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">New Incident Claim Submitted</h2>
              <p style="color: #555; line-height: 1.6;">Your client <strong>${data.clientName || 'N/A'}</strong> has submitted an incident claim. Please find the full report attached as a PDF.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px 0; color: #999; width: 140px;">Client Name</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.clientName || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; color: #999;">Policy Number</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.policyNumber || 'N/A'}</td></tr>
                <tr><td style="padding: 8px 0; color: #999;">Vehicle Registration</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.rego || 'N/A'}</td></tr>
                ${data.vehicle ? `<tr><td style="padding: 8px 0; color: #999;">Vehicle</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.vehicle}</td></tr>` : ''}
                ${data.date ? `<tr><td style="padding: 8px 0; color: #999;">Incident Date</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.date}</td></tr>` : ''}
                ${data.location ? `<tr><td style="padding: 8px 0; color: #999;">Location</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.location}</td></tr>` : ''}
              </table>
              <p style="color: #555; line-height: 1.6;">Please review the attached PDF for full incident details including damage photos, third-party information, and witness statements.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">— Sent via Savo</p>
            </div>
          </div>`
        : `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #e8551e, #d44a18); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Savo</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">Claim Submitted Successfully</h2>
              <p style="color: #555; line-height: 1.6;">Your incident report has been submitted. Please find the full report attached as a PDF.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                ${data.date ? `<tr><td style="padding: 8px 0; color: #999; width: 120px;">Date</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.date}</td></tr>` : ''}
                ${data.location ? `<tr><td style="padding: 8px 0; color: #999;">Location</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.location}</td></tr>` : ''}
                ${data.vehicle ? `<tr><td style="padding: 8px 0; color: #999;">Vehicle</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.vehicle}</td></tr>` : ''}
                ${data.insurer ? `<tr><td style="padding: 8px 0; color: #999;">Insurer</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.insurer}</td></tr>` : ''}
              </table>
              <p style="color: #555; line-height: 1.6;">You can view your full report anytime in the Savo app.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">— The Savo Team</p>
            </div>
          </div>`;
      return { subject: subjectLine, html: bodyHtml };
    }

    case 'welcome':
      return {
        subject: 'Welcome to Savo – Your claims assistant',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #e8551e, #d44a18); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Savo</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">You're all set! 🎉</h2>
              <p style="color: #555; line-height: 1.6;">Savo makes vehicle insurance claims simple, fast, and stress-free. Here's what you can do:</p>
              <ul style="color: #555; line-height: 2;">
                <li><strong>Add your vehicles</strong> – Keep your fleet details ready</li>
                <li><strong>Report incidents</strong> – Our step-by-step wizard guides you</li>
                <li><strong>Find panel shops</strong> – Connect with trusted repairers</li>
                <li><strong>Track claims</strong> – Everything in one place</li>
              </ul>
              <p style="color: #555; line-height: 1.6;">If you ever need help, we're just a message away.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">— The Savo Team</p>
            </div>
          </div>`,
      };

    case 'rego_expiry_reminder':
      return {
        subject: `Rego Expiry Reminder – ${data.vehicle || 'Your Vehicle'}${data.rego ? ` (${data.rego})` : ''}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #e8551e, #d44a18); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Savo</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">🚗 Registration Expiry Reminder</h2>
              <p style="color: #555; line-height: 1.6;">Your vehicle registration is expiring soon. Please renew it to stay compliant.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                ${data.vehicle ? `<tr><td style="padding: 8px 0; color: #999; width: 120px;">Vehicle</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.vehicle}</td></tr>` : ''}
                ${data.rego ? `<tr><td style="padding: 8px 0; color: #999;">Rego</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.rego}</td></tr>` : ''}
                ${data.expiryDate ? `<tr><td style="padding: 8px 0; color: #999;">Expires</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.expiryDate}</td></tr>` : ''}
              </table>
              <p style="color: #555; line-height: 1.6;">Don't forget to renew before the expiry date to avoid fines.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">— The Savo Team</p>
            </div>
          </div>`,
      };

    case 'wof_expiry_reminder':
      return {
        subject: `WOF Expiry Reminder – ${data.vehicle || 'Your Vehicle'}${data.rego ? ` (${data.rego})` : ''}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #e8551e, #d44a18); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Savo</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">🔧 WOF Expiry Reminder</h2>
              <p style="color: #555; line-height: 1.6;">Your Warrant of Fitness is expiring soon. Book an inspection to stay road-legal.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                ${data.vehicle ? `<tr><td style="padding: 8px 0; color: #999; width: 120px;">Vehicle</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.vehicle}</td></tr>` : ''}
                ${data.rego ? `<tr><td style="padding: 8px 0; color: #999;">Rego</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.rego}</td></tr>` : ''}
                ${data.expiryDate ? `<tr><td style="padding: 8px 0; color: #999;">Expires</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.expiryDate}</td></tr>` : ''}
              </table>
              <p style="color: #555; line-height: 1.6;">Book your WOF inspection today to avoid driving without a valid warrant.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">— The Savo Team</p>
            </div>
          </div>`,
      };

    case 'insurance_expiry_reminder':
      return {
        subject: `Insurance Policy Expiry Reminder – ${data.vehicle || 'Your Vehicle'}${data.rego ? ` (${data.rego})` : ''}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #e8551e, #d44a18); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Savo</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1a1a1a; margin-top: 0;">🛡️ Insurance Policy Expiry Reminder</h2>
              <p style="color: #555; line-height: 1.6;">Your insurance policy is expiring soon. Renew it to ensure you're covered.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                ${data.vehicle ? `<tr><td style="padding: 8px 0; color: #999; width: 120px;">Vehicle</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.vehicle}</td></tr>` : ''}
                ${data.rego ? `<tr><td style="padding: 8px 0; color: #999;">Rego</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.rego}</td></tr>` : ''}
                ${data.insurer ? `<tr><td style="padding: 8px 0; color: #999;">Insurer</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.insurer}</td></tr>` : ''}
                ${data.policyNumber ? `<tr><td style="padding: 8px 0; color: #999;">Policy #</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.policyNumber}</td></tr>` : ''}
                ${data.expiryDate ? `<tr><td style="padding: 8px 0; color: #999;">Expires</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${data.expiryDate}</td></tr>` : ''}
              </table>
              <p style="color: #555; line-height: 1.6;">Contact your insurer to renew your policy before it expires.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">— The Savo Team</p>
            </div>
          </div>`,
      };

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const { type, to, data } = (await req.json()) as EmailRequest;

    if (!type || !to) {
      throw new Error('Missing required fields: type, to');
    }

    const { subject, html } = getEmailContent(type, data);

    // Build email payload
    const emailPayload: Record<string, unknown> = {
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    };

    // Generate and attach PDF for claim submissions
    if (type === 'claim_submitted' && data) {
      try {
        // Fetch photos from storage if claimId provided
        let photoImages: { label: string; base64: string; mime: string }[] = [];
        if (data.claimId) {
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          const supabase = createClient(supabaseUrl, supabaseKey);

          // Fetch vehicle damage photos
          const { data: claimPhotos } = await supabase.from('claim_photos').select('file_path, file_name').eq('claim_id', data.claimId);
          console.log(`Found ${claimPhotos?.length || 0} claim photos`);
          if (claimPhotos) {
            for (const p of claimPhotos) {
              try {
                const { data: fileData, error: dlErr } = await supabase.storage.from('claim-photos').download(p.file_path);
                if (dlErr || !fileData) { console.error('Failed to download claim photo:', p.file_path, dlErr); continue; }
                const buf = await fileData.arrayBuffer();
                const base64 = arrayBufferToBase64(buf);
                const mime = fileData.type || 'image/jpeg';
                photoImages.push({ label: 'Vehicle Damage', base64: `data:${mime};base64,${base64}`, mime });
              } catch (e) { console.error('Failed to fetch claim photo:', e); }
            }
          }

          // Fetch third-party photos
          const { data: tpPhotos } = await supabase.from('tp_photos').select('file_path, type, tp_index').eq('claim_id', data.claimId).order('tp_index');
          console.log(`Found ${tpPhotos?.length || 0} tp photos`);
          if (tpPhotos) {
            for (const p of tpPhotos) {
              try {
                const { data: fileData, error: dlErr } = await supabase.storage.from('tp-photos').download(p.file_path);
                if (dlErr || !fileData) { console.error('Failed to download tp photo:', p.file_path, dlErr); continue; }
                const buf = await fileData.arrayBuffer();
                const base64 = arrayBufferToBase64(buf);
                const mime = fileData.type || 'image/jpeg';
                const typeLabel = p.type === 'damage' ? 'Damage' : p.type === 'rego' ? 'Registration' : 'License';
                photoImages.push({ label: `Third Party ${p.tp_index + 1} – ${typeLabel}`, base64: `data:${mime};base64,${base64}`, mime });
              } catch (e) { console.error('Failed to fetch tp photo:', e); }
            }
            }
          }
        }

        const pdfBase64 = generateClaimPdf(data, photoImages);
        const claimRef = data.claimNumber ? `CLM-${data.claimNumber.padStart(4, '0')}` : 'Incident-Report';
        emailPayload.attachments = [
          {
            filename: `${claimRef}.pdf`,
            content: pdfBase64,
          },
        ];
        console.log(`PDF generated with ${photoImages.length} photos and attached successfully`);
      } catch (pdfErr) {
        console.error('PDF generation failed, sending without attachment:', pdfErr);
      }
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', result);
      throw new Error(`Resend error: ${JSON.stringify(result)}`);
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Email send error:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
