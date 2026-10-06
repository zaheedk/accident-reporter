import { Car, Phone, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { F2D_PHONE, F2D_TEL, f2dApplyUrl, logF2DClick } from '@/lib/free2drive';

interface Props {
  source: string;
  title?: string;
  body?: string;
}

/** Booking offer for Free 2 Drive not-at-fault replacement vehicles. */
export default function Free2DriveOffer({
  source,
  title = 'You may be entitled to a free replacement car',
  body = "If the other driver caused the crash, their insurer pays for a replacement car while yours is off the road. Free 2 Drive arranges it and recovers the cost — no excess, nothing upfront.",
}: Props) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3 print:hidden">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
          <Car className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
          <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{body}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button asChild className="w-full">
          <a href={f2dApplyUrl(source)} target="_blank" rel="noopener" onClick={() => logF2DClick(source, 'apply')}>
            <ExternalLink className="w-4 h-4" />Apply with Free 2 Drive
          </a>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <a href={F2D_TEL} onClick={() => logF2DClick(source, 'call')}>
            <Phone className="w-4 h-4" />Call {F2D_PHONE}
          </a>
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">Free 2 Drive is an independent provider. Eligibility depends on the other party being at fault.</p>
    </div>
  );
}
