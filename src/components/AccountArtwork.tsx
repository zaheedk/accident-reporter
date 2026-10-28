import garage from '@/assets/illustrations/step-garage.png';
import report from '@/assets/illustrations/step-report.png';
import documents from '@/assets/illustrations/fault-claim.png';
import shield from '@/assets/illustrations/about-shield.png';
import family from '@/assets/illustrations/about-heart.png';
import help from '@/assets/illustrations/faq-help.png';
import repair from '@/assets/illustrations/step-panel.png';

const artwork = { garage, report, documents, shield, family, help, repair };
export type AccountArtworkKind = keyof typeof artwork;

export function AccountArtwork({ kind, className = '' }: { kind: AccountArtworkKind; className?: string }) {
  return <img src={artwork[kind]} alt="" aria-hidden="true" className={`object-contain shrink-0 select-none pointer-events-none ${className}`} />;
}

export function AccountBackdrop({ pathname }: { pathname: string }) {
  const kind: AccountArtworkKind = pathname.startsWith('/vehicles') || pathname === '/fleet'
    ? 'garage' : pathname.startsWith('/claims') ? 'report'
    : pathname === '/documents' ? 'documents' : pathname === '/family' ? 'family'
    : pathname.startsWith('/shop') || pathname === '/panel-shops' ? 'repair' : 'shield';
  return (
    <div aria-hidden="true" className="account-backdrop absolute inset-x-0 top-0 h-96 overflow-hidden pointer-events-none">
      <AccountArtwork kind={kind} className="absolute right-0 top-12 w-40 opacity-[0.045] md:w-72 md:opacity-[0.06]" />
      <svg viewBox="0 0 400 100" fill="none" className="absolute left-0 top-44 w-64 md:w-96 text-primary opacity-[0.09]">
        <path d="M0 20c50-24 100 24 150 0s100 24 150 0 75-14 100 0M0 55c50-24 100 24 150 0s100 24 150 0 75-14 100 0M0 90c50-24 100 24 150 0s100 24 150 0 75-14 100 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}