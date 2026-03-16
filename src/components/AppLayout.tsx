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
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">ClaimWise</span>
        </div>
        <Link
          to="/claims/new"
          className="inline-flex items-center gap-1.5 h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ boxShadow: 'var(--shadow-md)' }}
        >
          <Plus className="w-4 h-4" />
          New Report
        </Link>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-t border-border flex justify-around py-2 px-4 md:hidden" style={{ boxShadow: '0 -1px 3px rgba(0,0,0,0.05)' }}>
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
