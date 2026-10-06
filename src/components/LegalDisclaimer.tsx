import { Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  compact?: boolean;
}

/** Standard "general information, not legal advice" notice for rights and fault content. */
export default function LegalDisclaimer({ className, compact }: Props) {
  return (
    <aside
      role="note"
      aria-label="Legal disclaimer"
      className={cn('rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed flex gap-2', className)}
    >
      <Scale className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      {compact ? (
        <span>General information only, not legal advice. Check your policy and get professional advice for your situation.</span>
      ) : (
        <span>
          This is general information about New Zealand law and insurance practice. It is not legal advice and SAVO is not a law firm or insurer.
          Your rights depend on your policy wording and the facts of your accident. Final fault is decided by insurers, the Disputes Tribunal or a court.
          For advice on your situation, contact Community Law (free), Citizens Advice Bureau, or a lawyer.
        </span>
      )}
    </aside>
  );
}
