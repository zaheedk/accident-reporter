import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface SignaturePadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (dataUrl: string, name: string) => Promise<void> | void;
  defaultName?: string;
}

const DECLARATION_LINES = [
  '1. AUTHORISE my insurer to move the vehicle to a claims assessing centre for examination and assessment.',
  '2. MATERIAL FACTS: (a) All information given to my insurer in connection with this claim (whether oral or written) is true and correct; (b) No information relevant to the claim is omitted.',
  '3. USE OF INFORMATION: (a) My personal information collected in connection with this claim may be: (i) disclosed to other members of the insurance industry and the Insurance Claims Register Limited; (ii) disclosed to parties repairing or replacing the subject matter of the claim; (iii) disclosed to parties who have a financial interest in the subject matter of the policy; (iv) used to advise me of other services. (b) My personal information held by any other parties in connection with this claim may be disclosed to my insurer.',
];

export const DECLARATION_TEXT = DECLARATION_LINES;

export default function SignaturePad({ open, onOpenChange, onSave, defaultName = '' }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const [name, setName] = useState(defaultName);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setAgreed(false);
    hasInk.current = false;
    const t = setTimeout(() => clearCanvas(), 50);
    return () => clearTimeout(t);
  }, [open, defaultName]);

  const setupCanvas = (canvas: HTMLCanvasElement) => {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
  };

  const clearCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    setupCanvas(c);
    const ctx = c.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, c.width, c.height);
    hasInk.current = false;
  };

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleDown = (e: React.PointerEvent) => {
    e.preventDefault();
    drawing.current = true;
    const c = canvasRef.current;
    if (!c) return;
    c.setPointerCapture(e.pointerId);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasInk.current = true;
  };

  const handleUp = () => { drawing.current = false; };

  const handleSave = async () => {
    if (!hasInk.current) return;
    if (!name.trim()) return;
    if (!agreed) return;
    const dataUrl = canvasRef.current!.toDataURL('image/png');
    setSaving(true);
    try {
      await onSave(dataUrl, name.trim());
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Declaration & signature</DialogTitle>
          <DialogDescription>
            Read the declaration, then sign below to confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-[12px] leading-relaxed text-foreground space-y-2 max-h-44 overflow-y-auto">
            <p className="font-semibold">I declare that:</p>
            {DECLARATION_LINES.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

          <label className="flex items-start gap-2 text-[12px] text-foreground">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>I have read and agree to the declaration above.</span>
          </label>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Full name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="As shown on your licence"
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Signature</label>
              <button type="button" onClick={clearCanvas} className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2">
                Clear
              </button>
            </div>
            <div className="rounded-lg border bg-background">
              <canvas
                ref={canvasRef}
                onPointerDown={handleDown}
                onPointerMove={handleMove}
                onPointerUp={handleUp}
                onPointerCancel={handleUp}
                className="w-full h-40 touch-none rounded-lg"
                style={{ touchAction: 'none' }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Sign with your finger, mouse or stylus.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || !agreed}>
            {saving ? 'Saving…' : 'Save signature'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
