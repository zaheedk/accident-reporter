import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, FileText, Plus } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vehicles', icon: Car, label: 'Vehicles' },
  { to: '/claims', icon: FileText, label: 'Claims' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Top header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-foreground flex items-center justify-center">
            <FileText className="w-4 h-4 text-background" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">ClaimWise</span>
        </div>
        <Link
          to="/claims/new"
          className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-foreground text-background rounded-md text-xs font-medium transition-all hover:bg-foreground/90 active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          New Report
        </Link>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border flex justify-around py-2.5 px-4 md:hidden">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-md text-[10px] font-medium tracking-wide uppercase transition-colors ${
                active ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
