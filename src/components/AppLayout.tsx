import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, FileText, Plus, Wrench, Truck, Info, HelpCircle, BookOpen, Shield, Menu, X, LogOut, Newspaper } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name, avatar_url').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user?.id]);

  const initials = (profile?.display_name || user?.email || '?')
    .split(/[\s@]/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/vehicles', icon: Car, label: t('nav.vehicles') },
    { to: '/claims', icon: FileText, label: t('nav.claims') },
    { to: '/panel-shops', icon: Wrench, label: t('nav.shops') },
  ];

  const contentLinks = [
    { to: '/panel-shops', icon: Wrench, label: t('nav.shops') },
    { to: '/tow-companies', icon: Truck, label: t('nav.towCompanies') },
    { to: '/about', icon: Info, label: t('nav.aboutContact') },
    { to: '/how-it-works', icon: BookOpen, label: t('nav.howItWorks') },
    { to: '/faq', icon: HelpCircle, label: t('nav.faqHelp') },
    { to: '/legal', icon: Shield, label: t('nav.termsPrivacy') },
    { to: '/blog', icon: Newspaper, label: 'Blog' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-dark-surface px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between border-b border-[hsl(var(--dark-surface))] sticky top-0 z-30">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <img src="/savo-logo.svg" alt="SAVO" className="h-9" />
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link to="/claims/new" className="h-8 px-3.5 text-xs rounded-lg bg-primary text-primary-foreground font-semibold inline-flex items-center gap-1.5 transition-all active:scale-[0.98]" style={{ boxShadow: '0 2px 8px hsla(22, 90%, 52%, 0.3)' }}>
            <Plus className="w-3.5 h-3.5" />
            {t('nav.newReport')}
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} className="w-8 h-8 rounded-lg flex items-center justify-center text-dark-surface-muted hover:text-dark-surface-foreground transition-colors">
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
          <div className="border-t border-border/50 my-2" />
          <Link to="/profile" onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${location.pathname === '/profile' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
            <Avatar className="w-6 h-6 text-[10px]">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile?.display_name || ''} />}
              <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <span className="flex flex-col leading-tight">
              <span>{t('nav.profile')}</span>
              {profile?.display_name && <span className="text-xs text-muted-foreground font-normal">{profile.display_name}</span>}
            </span>
          </Link>
          <div className="border-t border-border/50 my-2" />
          <LanguageSwitcher />
          {user && (
            <>
              <div className="border-t border-border/50 my-2" />
              <button onClick={() => { setMenuOpen(false); signOut(); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-destructive hover:bg-destructive/10 w-full text-left">
                <LogOut className="w-4 h-4" />
                {t('common.signOut')}
              </button>
            </>
          )}
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-5 pb-32">
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

      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/50 flex justify-around py-2 px-4 md:hidden z-20">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
          return (
            <Link key={to} to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all ${active ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`p-1 rounded-lg transition-colors ${active ? 'bg-primary/10' : ''}`}>
                <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.5} />
              </div>
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
