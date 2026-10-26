import savoLogo from '@/assets/savo-logo.png';

export function SavoLogo({ className = 'h-8 w-auto' }: { className?: string }) {
  return <img src={savoLogo} alt="SAVO" className={className} />;
}
