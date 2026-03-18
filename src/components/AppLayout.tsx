import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, FileText, Plus, Wrench } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vehicles', icon: Car, label: 'Vehicles' },
  { to: '/claims', icon: FileText, label: 'Claims' },
  { to: '/panel-shops', icon: Wrench, label: 'Shops' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card px-4 py-3.5 flex items-center justify-between" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center">
            <FileText className="w-4 h-4 text-card" />
          </div>
          <span className="text-[15px] font-bold text-foreground tracking-tight">ClaimSorted</span>
        </div>
        <Link to="/claims/new" className="btn-primary h-8 px-3.5 text-xs rounded-lg">
          <Plus className="w-3.5 h-3.5" />
          New report
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/60 flex justify-around py-2 px-4 md:hidden">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
          return (
            <Link key={to} to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
              <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.5} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
