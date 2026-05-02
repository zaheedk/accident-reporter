/**
 * Slide-out drawer triggered when the home-screen widget's SAVO logo is tapped.
 *
 * Activated via deep link  savo://widget-actions  which routes to
 * /dashboard?widgetActions=1. Opens a right-side Sheet with 4 quick actions:
 *   - Quick capture (camera)
 *   - Roadside (road)
 *   - Tow Truck (truck)
 *   - Emergency (beacon → dial 111)
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Camera, TrafficCone, Truck, Siren } from 'lucide-react';

export default function WidgetActionsSheet() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('widgetActions') === '1') setOpen(true);
  }, [location.search]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      const params = new URLSearchParams(location.search);
      params.delete('widgetActions');
      const qs = params.toString();
      navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace: true });
    }
  };

  const go = (path: string) => {
    handleOpenChange(false);
    navigate(path);
  };

  const dial = (phone: string) => {
    handleOpenChange(false);
    window.location.href = `tel:${phone}`;
  };

  const actions = [
    { label: 'Quick capture', icon: Camera, onClick: () => go('/claims/quick-capture') },
    { label: 'Roadside', icon: TrafficCone, onClick: () => go('/dashboard') },
    { label: 'Tow Truck', icon: Truck, onClick: () => go('/tow-companies') },
    { label: 'Emergency', icon: Siren, onClick: () => dial('111') },
  ];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-[300px] sm:w-[340px]">
        <SheetHeader>
          <SheetTitle>Quick actions</SheetTitle>
          <SheetDescription>Choose what you need right now.</SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-3 mt-6">
          {actions.map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card hover:bg-accent active:scale-[0.98] transition-all p-4 aspect-square"
            >
              <Icon className="w-8 h-8 text-primary" strokeWidth={1.8} />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
