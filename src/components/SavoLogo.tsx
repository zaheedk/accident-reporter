import savoLogo from '@/assets/savo-logo.png';
import savoLogoDark from '@/assets/savo-logo-dark.png';

export function SavoLogo({ className = 'h-8 w-auto' }: { className?: string }) {
  return (
    <>
      <img src={savoLogo} alt="SAVO" className={`${className} dark:hidden`} />
      <img src={savoLogoDark} alt="SAVO" className={`${className} hidden dark:block`} />
    </>
  );
}
