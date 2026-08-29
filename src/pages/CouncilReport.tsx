import { useEffect, useMemo, useState } from 'react';
import { MapPin, Mail, ExternalLink, Camera, Copy, Building2, Loader2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { councils } from '@/lib/councils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const ISSUE_TYPES = [
  'Pothole',
  'Damaged or missing road sign',
  'Faulty street light',
  'Blocked drain / flooding',
  'Road debris',
  'Faded road markings',
  'Overgrown vegetation blocking view',
];

export default function CouncilReport() {
  const [councilId, setCouncilId] = useState('auckland');
  const [issue, setIssue] = useState(ISSUE_TYPES[0]);
  const [address, setAddress] = useState('');
  const [details, setDetails] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [photoName, setPhotoName] = useState<string | null>(null);

  const council = useMemo(() => councils.find((c) => c.id === councilId)!, [councilId]);

  useEffect(() => {
    getLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000, maximumAge: 300000 },
    );
  };

  const body = useMemo(() => {
    const lines = [
      `Issue type: ${issue}`,
      address ? `Location: ${address}` : null,
      coords ? `GPS coordinates: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : null,
      coords ? `Map link: https://www.google.com/maps?q=${coords.lat},${coords.lng}` : null,
      '',
      details || 'Please inspect and repair this road fault.',
      '',
      photoName ? `A photo (${photoName}) is attached.` : 'Photos can be supplied on request.',
      '',
      'Reported via SAVO (savo.co.nz)',
    ].filter(Boolean);
    return lines.join('\n');
  }, [issue, address, coords, details, photoName]);

  const subject = `Road fault report: ${issue}${address ? ` — ${address}` : ''}`;

  const mailto = `mailto:${council.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const copyReport = async () => {
    await navigator.clipboard.writeText(`${subject}\n\n${body}`);
    toast.success('Report copied — paste it into the council form');
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Report to council
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Snap the fault, pin the location, and SAVO drafts a complete report for the right road authority.
          </p>
        </header>

        <div className="rounded-2xl bg-card border border-border p-4 space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Road authority</label>
            <Select value={councilId} onValueChange={setCouncilId}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {councils.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Issue</label>
            <Select value={issue} onValueChange={setIssue}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Street / landmark</label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 42 Great North Road, Grey Lynn"
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Details</label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Size, depth, how long it has been there, any damage caused…"
              className="text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={getLocation}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-[12px] font-medium text-foreground"
            >
              {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
              {coords ? 'Update location' : 'Add my location'}
            </button>
            <label className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-[12px] font-medium text-foreground cursor-pointer">
              <Camera className="w-3.5 h-3.5" />
              {photoName ? 'Photo added' : 'Add photo'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
              />
            </label>
            {coords && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
          <div className="text-[12px] font-medium text-foreground">Report preview</div>
          <pre className="text-[12px] text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans">{body}</pre>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <a
            href={mailto}
            className="h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-[14px] inline-flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" /> Email council
          </a>
          <a
            href={council.reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 rounded-xl border border-border font-semibold text-[14px] text-foreground inline-flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" /> Online form
          </a>
          <button
            onClick={copyReport}
            className="h-11 rounded-xl border border-border font-semibold text-[14px] text-foreground inline-flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" /> Copy report
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          If the fault damaged your vehicle, keep the report reference — councils can be liable for repair costs.
          Urgent hazards: call {council.name} on {council.phone}.
        </p>
      </div>
    </AppLayout>
  );
}
