import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, FileText, Plus, Wrench, Truck, Info, HelpCircle, BookOpen, Shield, Menu, X, LogOut, Newspaper, Home, Phone, FolderOpen, Sun, Moon, Users, Scale, Briefcase, ShieldCheck } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import WidgetActionsSheet from '@/components/WidgetActionsSheet';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name, avatar_url').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user?.id]);

  const initials = (profile?.display_name || user?.email || '?')
    .split(/[\s@]/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');

  const authedNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: '/vehicles', icon: Car, label: 'Vehicles' },
    { to: '/claims', icon: FileText, label: 'Reports' },
    { to: '/documents', icon: FolderOpen, label: 'Docs' },
    { to: '/panel-shops', icon: Wrench, label: 'Shops' },
  ];

  const publicNavItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/tow-companies', icon: Truck, label: 'Tow' },
    { to: '/panel-shops', icon: Wrench, label: 'Shops' },
    { to: '/about', icon: Phone, label: 'Contact' },
  ];

  const navItems = user ? authedNavItems : publicNavItems;

  const contentLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ...(user ? [{ to: '/family', icon: Users, label: 'Family' }] : []),
    ...(user ? [{ to: '/fleet', icon: Briefcase, label: 'Fleet' }] : []),
    ...(user ? [{ to: '/broker', icon: ShieldCheck, label: 'Broker' }] : []),
    { to: '/panel-shops', icon: Wrench, label: 'Shops' },
    { to: '/tow-companies', icon: Truck, label: 'Tow Trucks' },
    { to: '/fault-guide', icon: Scale, label: 'Fault Guide' },
    { to: '/how-it-works', icon: BookOpen, label: 'How It Works' },
    { to: '/blog', icon: Newspaper, label: 'Blog' },
    { to: '/faq', icon: HelpCircle, label: 'FAQ & Help' },
    { to: '/about', icon: Info, label: 'About & Contact' },
  ];

  const logoLink = user ? '/dashboard' : '/';

  return (
    <div className="min-h-screen w-full max-w-full bg-background">
      <header
        className="w-full max-w-full min-w-0 bg-card pl-2 pr-4 pb-3 flex items-center justify-between gap-3 border-b border-border/50 sticky top-0 z-30"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <Link to={logoLink} className="flex items-center gap-2 min-w-0">
          <img src="/savo-icon.svg" alt="SAVO" className="h-9 w-9" width="36" height="36" />
          <span className="font-extrabold tracking-tight text-foreground text-[17px] truncate">SAVO</span>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          {user && <NotificationBell />}
          {!user && (
            <>
              <Link to="/auth?mode=login" className="h-8 px-3.5 text-xs rounded-lg text-foreground font-semibold inline-flex items-center gap-1.5 transition-all hover:text-primary">
                Log in
              </Link>
              <Link to="/auth?mode=signup" className="h-8 px-3.5 text-xs rounded-lg bg-primary text-primary-foreground font-semibold inline-flex items-center gap-1.5 transition-all active:scale-[0.98]">
                Sign up free
              </Link>
            </>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="bg-card border-b border-border/50 px-4 py-3 space-y-1 animate-in slide-in-from-top-2 duration-200 sticky top-[53px] z-20" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          {contentLinks.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
          {user && (
            <>
              <div className="border-t border-border/50 my-2" />
              <Link to="/profile" onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${location.pathname === '/profile' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                <Avatar className="w-6 h-6 text-[10px]">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile?.display_name || ''} />}
                  <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <span className="flex flex-col leading-tight">
                  <span>Profile</span>
                  {profile?.display_name && <span className="text-xs text-muted-foreground font-normal">{profile.display_name}</span>}
                </span>
              </Link>
            </>
          )}
          <div className="border-t border-border/50 my-2" />
          <button
            onClick={() => { toggleTheme(); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground w-full text-left"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="flex-1">Theme</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>
          {user ? (
            <>
              <div className="border-t border-border/50 my-2" />
              <button onClick={() => { setMenuOpen(false); signOut(); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-destructive hover:bg-destructive/10 w-full text-left">
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="border-t border-border/50 my-2" />
              <Link to="/auth?mode=login" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-primary hover:bg-primary/10 w-full">
                <LogOut className="w-4 h-4" />
                Log in / Sign up
              </Link>
            </>
          )}
        </div>
      )}

      <main className="w-full max-w-2xl lg:max-w-5xl mx-auto px-4 lg:px-8 py-5 pb-32">
        {children}
      </main>

      <div className="hidden md:block fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-sm border-t border-border/40 z-10">
        <div className="flex items-center justify-center gap-3 px-4 py-2 text-xs text-muted-foreground">
          {contentLinks.map(({ to, label }, i) => (
            <span key={to} className="flex items-center gap-3">
              {i > 0 && <span className="text-border">·</span>}
              <Link to={to} className="hover:text-foreground transition-colors">{label}</Link>
            </span>
          ))}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border grid grid-cols-5 gap-0 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] px-1 md:hidden z-40" style={{ transform: 'translateZ(0)' }}>
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to || (to !== '/dashboard' && to !== '/' && location.pathname.startsWith(to));
          return (
            <Link key={to} to={to}
              className={`flex flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] font-medium transition-colors min-w-0 ${active ? 'text-primary' : 'text-muted-foreground/70 hover:text-foreground'}`}>
              <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.6} />
              <span className="leading-tight">{label}</span>
            </Link>
          );
        })}
      </nav>
      <WidgetActionsSheet />
    </div>
  );
}
