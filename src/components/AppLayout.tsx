import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, FileText, Plus, Wrench, Info, HelpCircle, BookOpen, Shield, Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vehicles', icon: Car, label: 'Vehicles' },
  { to: '/claims', icon: FileText, label: 'Claims' },
  { to: '/panel-shops', icon: Wrench, label: 'Shops' },
];

const contentLinks = [
  { to: '/about', icon: Info, label: 'About & Contact' },
  { to: '/how-it-works', icon: BookOpen, label: 'How It Works' },
  { to: '/faq', icon: HelpCircle, label: 'FAQ & Help' },
  { to: '/legal', icon: Shield, label: 'Terms & Privacy' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card px-4 py-3.5 flex items-center justify-between" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center">
            <FileText className="w-4 h-4 text-card" />
          </div>
          <span className="text-[15px] font-bold text-foreground tracking-tight">Fixd</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/claims/new" className="btn-primary h-8 px-3.5 text-xs rounded-lg">
            <Plus className="w-3.5 h-3.5" />
            New report
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Slide-down menu */}
      {menuOpen && (
        <div className="bg-card border-b border-border/60 px-4 py-3 space-y-1 animate-in slide-in-from-top-2 duration-200" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {contentLinks.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
          <div className="border-t border-border/60 my-2" />
          <Link to="/profile" onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${location.pathname === '/profile' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
            <User className="w-4 h-4" />
            Profile
          </Link>
        </div>
      )}

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
