import Free2DriveOffer from '@/components/Free2DriveOffer';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Camera, FileText, Clock, Phone, Wrench, Truck, ChevronRight, ChevronDown, ArrowRight, CheckCircle2, BookOpen, HelpCircle, Newspaper, Menu, X, Info, Scale, Gavel, User, Users, Briefcase, Building2, Hammer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import SEO from '@/components/SEO';
import LegalDisclaimer from '@/components/LegalDisclaimer';
import { RIGHTS_TOPICS } from '@/lib/rights-data';
import heroIllustration from '@/assets/illustrations/hero.jpg';
import rightsIllustration from '@/assets/illustrations/rights.jpg';
import captureIllustration from '@/assets/illustrations/capture.jpg';
import courtesyIllustration from '@/assets/illustrations/courtesy.jpg';
import wmScales from '@/assets/illustrations/wm-scales.jpg';
import wmClipboard from '@/assets/illustrations/wm-clipboard.jpg';
import wmWheel from '@/assets/illustrations/wm-wheel.jpg';

/** Soft hand-drawn wavy lines used as a faint section background */
const WavyLines = ({ className = '' }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 400 120" fill="none" preserveAspectRatio="none"
    className={`pointer-events-none select-none absolute text-primary ${className}`}>
    <path d="M0 20c50-25 100 25 150 0s100 25 150 0 75-15 100 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M0 60c50-25 100 25 150 0s100 25 150 0 75-15 100 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M0 100c50-25 100 25 150 0s100 25 150 0 75-15 100 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const FEATURES = [
  { icon: Camera, title: 'Photo Documentation', desc: 'Capture and organise damage photos, licence plates, and scene evidence with guided prompts.' },
  { icon: FileText, title: 'Smart Claim Reports', desc: 'Generate comprehensive incident reports that match what NZ insurers actually need.' },
  { icon: Clock, title: 'Fast Insurance Claims', desc: 'Lodge your insurance claim directly with any NZ insurer in minutes, not days.' },
  { icon: Phone, title: 'Courtesy Car Requests', desc: 'Request a courtesy car through your insurer or our partners so you stay mobile while repairs happen.' },
  { icon: Wrench, title: 'Find Panel Beaters', desc: 'Browse top-rated panel shops near you with ratings, distance, and one-tap calling.' },
  { icon: Truck, title: 'Emergency Towing', desc: 'Find and call the nearest tow company instantly when you need help on the road.' },
];

/** Features: accordion on mobile (titles only, tap to expand), full grid on desktop */
const FeaturesList = () => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      {/* Mobile accordion */}
      <div className="sm:hidden divide-y divide-border/60">
        {FEATURES.map(({ icon: Icon, title, desc }, i) => {
          const isOpen = open === i;
          return (
            <div key={title}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-3 py-4 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-card shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.3)] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="flex-1 text-sm font-bold text-foreground">{title}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <p className="pb-4 pl-[52px] text-xs text-muted-foreground leading-relaxed">{desc}</p>
              )}
            </div>
          );
        })}
      </div>
      {/* Desktop grid */}
      <div className="hidden sm:grid sm:grid-cols-2 gap-x-10">
        {FEATURES.map(({ icon: Icon, title, desc }, i, arr) => (
          <div key={title} className={`flex items-start gap-4 py-5 ${i < arr.length - (arr.length % 2 === 0 ? 2 : 1) ? 'border-b border-border/60' : ''}`}>
            <div className="w-12 h-12 rounded-full bg-card shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.3)] flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{title}</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } };

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  const contentLinks = [
    { to: '/rights', icon: Scale, label: 'Your Rights' },
    { to: '/fault-guide', icon: Gavel, label: 'Who\'s at Fault?' },
    { to: '/how-it-works', icon: BookOpen, label: 'How It Works' },
    { to: '/blog', icon: Newspaper, label: 'Blog' },
    { to: '/faq', icon: HelpCircle, label: 'FAQ' },
    { to: '/about', icon: Info, label: 'About & Contact' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="SAVO — Know Your Rights After a Car Accident | NZ"
        description="Had a car accident in NZ? Find out who is at fault, what you are entitled to, and how to handle your insurance claim smoothly. Free plain-English guides and tools."
        path="/"
        image="/hero-scene.jpg"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "SAVO",
          url: "https://www.savo.co.nz",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://www.savo.co.nz/blog?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />
      {/* Nav */}
      <header className="bg-card sticky top-0 z-30 border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/savo-logo.svg" alt="SAVO" className="h-11" width="110" height="44" />
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground font-medium">
            {contentLinks.map(({ to, label }) => (
              <Link key={to} to={to} className="hover:text-foreground transition-colors">{label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-foreground hover:bg-muted text-sm font-medium">
                Log in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="text-sm font-semibold">
                Sign up free
              </Button>
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors md:hidden">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-card border-t border-border/50 px-4 py-3 space-y-1 animate-in slide-in-from-top-2 duration-200" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            {contentLinks.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to} onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            <div className="border-t border-border/50 my-2" />
            <Link to="/login" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-primary hover:bg-primary/10 w-full">
              Log in / Sign up
            </Link>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <motion.section
          variants={stagger} initial="hidden" animate="visible"
          className="relative overflow-hidden bg-background"
        >
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-20 relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <motion.div variants={fadeUp} className="flex-1 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-secondary text-secondary-foreground mb-6">
                <Scale className="w-3.5 h-3.5 text-primary" /> Your claim rights, in plain English
              </span>
              <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-[1.05] tracking-tight">
                Had an accident?<br />
                <span className="text-primary">We've got your back.</span>
              </h1>
              <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
                Find out who is at fault, what you are entitled to, and how to get your insurance claim handled smoothly. Free for New Zealand drivers.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/fault-guide">
                  <Button size="lg" className="text-sm font-semibold gap-2 h-12 px-6 rounded-full">
                    Check who's at fault <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/rights">
                  <Button variant="outline" size="lg" className="text-sm font-semibold h-12 px-6 rounded-full">
                    Know your rights
                  </Button>
                </Link>
                <a
                  href="https://play.google.com/store/apps/details?id=nz.co.savo.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download SAVO on Google Play"
                  className="inline-flex items-center gap-2.5 h-12 px-5 rounded-full bg-foreground text-background hover:bg-foreground/85 transition-colors"
                >
                  <svg viewBox="0 0 512 512" className="w-6 h-6" aria-hidden="true">
                    <path fill="#EA4335" d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z"/>
                    <path fill="#FBBC04" d="M104.6 13L325.3 234.3l-60.1 60.1L104.6 499V13z"/>
                    <path fill="#4285F4" d="M385.4 174.2l-60.1 60.1 60.1 60.1L497 234.3l-111.6-60.1z"/>
                    <path fill="#34A853" d="M104.6 499l220.7-220.7 60.1 60.1L104.6 499z"/>
                  </svg>
                  <span className="flex flex-col leading-tight text-left">
                    <span className="text-[10px] font-medium opacity-80">GET IT ON</span>
                    <span className="text-sm font-semibold">Google Play</span>
                  </span>
                </a>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="flex-1 w-full max-w-xl">
              <img
                src={heroIllustration}
                alt="Friendly helper handing car keys to a relieved driver beside a green courtesy car"
                className="w-full h-auto"
                width={1280}
                height={896}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </motion.div>
          </div>
        </motion.section>

        {/* Trust bar */}
        <motion.section variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="border-y border-border bg-secondary/60">
          <div className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-secondary-foreground font-medium">
            {['100% Free', 'Based on NZ Road Rules', 'Insurer-Neutral', 'Plain English'].map(item => (
              <motion.div key={item} variants={fadeUp} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                {item}
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* How SAVO helps — illustrated */}
        <section className="max-w-6xl mx-auto px-4 pt-16 md:pt-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Less stress, from crash to keys</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Three simple ways SAVO helps after an accident.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { img: rightsIllustration, title: 'Cut through the confusion', text: 'Plain-English guides to who is at fault and what you are owed.', to: '/fault-guide', alt: 'Tangled arrows turning into one clear path' },
              { img: captureIllustration, title: 'Your claim in your pocket', text: 'Capture photos, location and details on the spot — calmly.', to: '/signup', alt: 'Person recording accident details on a phone' },
              { img: courtesyIllustration, title: 'Keep moving', text: 'Not at fault? Get a courtesy car while your car is repaired.', to: '/rights/courtesy-car', alt: 'Driver waving from a courtesy car while a mechanic repairs their car' },
            ].map(card => (
              <Link key={card.title} to={card.to} className="group rounded-3xl border border-border bg-card p-5 hover:border-primary/40 transition-colors">
                <img src={card.img} alt={card.alt} width={1280} height={896} loading="lazy" decoding="async" className="w-full h-auto rounded-2xl" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">{card.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{card.text}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">Learn more <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></span>
              </Link>
            ))}
          </div>
        </section>


        <section className="max-w-3xl mx-auto px-4 py-6"><Free2DriveOffer source="home" /></section>

        {/* Rights */}
        <section className="relative max-w-5xl mx-auto px-4 pt-16 md:pt-24 overflow-hidden">
          <img src={wmScales} alt="" aria-hidden="true" className="pointer-events-none select-none absolute -right-16 -top-4 w-44 opacity-[0.05] lg:-right-28 lg:-top-6 lg:w-[440px] lg:opacity-[0.07]" />
          <WavyLines className="left-0 bottom-0 w-72 h-24 opacity-[0.06] lg:w-[520px] lg:h-40 lg:opacity-[0.08]" />
          {/* playful doodles */}
          <svg aria-hidden="true" className="absolute -top-2 left-2 w-16 h-16 text-primary/25 hidden md:block" viewBox="0 0 64 64" fill="none">
            <path d="M6 40c8-18 20-26 30-24 8 2 10 12 4 16-6 5-16 1-14-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <svg aria-hidden="true" className="absolute top-10 right-4 w-10 h-10 text-primary/30 hidden md:block" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="3" strokeDasharray="4 7" strokeLinecap="round" />
          </svg>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">What you are entitled to</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Most drivers never find out what they can claim. Start with the question that matches your situation.</p>
          </div>
          {/* Mobile: top 2 topics + link to all */}
          <div className="grid gap-5 sm:hidden">
            {RIGHTS_TOPICS.slice(0, 2).map((t, i) => (
              <RightsCard key={t.slug} topic={t} index={i} />
            ))}
            <Link
              to="/rights"
              className="group rounded-[2rem] p-6 border-2 border-dashed border-primary/40 bg-card flex items-center justify-between gap-3 transition-all hover:border-primary"
            >
              <span className="text-sm font-bold text-foreground">See all {RIGHTS_TOPICS.length} guides</span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">View all <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          </div>
          {/* Desktop: full grid */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {RIGHTS_TOPICS.map((t, i) => (
              <RightsCard key={t.slug} topic={t} index={i} />
            ))}
          </div>
          <LegalDisclaimer compact className="mt-14 lg:mt-16" />
        </section>

        {/* Features */}
        <motion.section variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="relative max-w-5xl mx-auto px-4 py-16 md:py-20 overflow-hidden">
          <img src={wmClipboard} alt="" aria-hidden="true" className="pointer-events-none select-none absolute -left-16 top-10 w-44 opacity-[0.05] lg:-left-28 lg:top-16 lg:w-[440px] lg:opacity-[0.07]" />
          <WavyLines className="right-0 top-0 w-72 h-24 opacity-[0.06] lg:w-[520px] lg:h-40 lg:opacity-[0.08]" />
          <motion.div variants={fadeUp} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Then handle your claim smoothly</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">From capturing evidence to lodging your insurance claim and arranging a courtesy car — SAVO handles it all.</p>
          </motion.div>
          <div className="rounded-[2.5rem] bg-secondary/60 px-6 py-4 sm:py-8 md:px-12 md:py-12">
            <FeaturesList />
          </div>
        </motion.section>

        {/* How it works */}
        <motion.section variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="bg-card border-y border-border">
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
            <motion.div variants={fadeUp} className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">How SAVO works</h2>
              <p className="mt-3 text-muted-foreground">Three simple steps to protect your claim</p>
            </motion.div>
            <div className="grid sm:grid-cols-3 gap-8">
              {[
                { step: '1', title: 'Add your vehicle', desc: 'Enter your car details, insurance policy, and rego info once. It\'s saved securely for future claims.' },
                { step: '2', title: 'Report the incident', desc: 'Our guided wizard captures every detail your insurer needs — photos, third parties, witnesses, and more.' },
                { step: '3', title: 'Submit to your insurer', desc: 'Send your professional report directly to your insurance company with one tap.' },
              ].map(({ step, title, desc }) => (
                <motion.div key={step} variants={fadeUp} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-lg font-extrabold flex items-center justify-center mx-auto mb-4">
                    {step}
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{title}</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
            <motion.div variants={fadeUp} className="text-center mt-10">
              <Link to="/signup">
                <Button size="lg" className="text-sm font-bold gap-2 h-12 px-8">
                  Start for free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.section>

        {/* Audience segments */}
        <motion.section variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="relative max-w-5xl mx-auto px-4 py-16 md:py-20 overflow-hidden">
          <img src={wmWheel} alt="" aria-hidden="true" className="pointer-events-none select-none absolute -right-16 top-10 w-44 opacity-[0.05] lg:-right-28 lg:top-16 lg:w-[440px] lg:opacity-[0.07]" />
          <WavyLines className="left-0 bottom-0 w-72 h-24 opacity-[0.06] lg:w-[520px] lg:h-40 lg:opacity-[0.08]" />
          <motion.div variants={fadeUp} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Built for everyone on the road</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">Whether you're a single driver or managing a national fleet, SAVO has a tailored experience for you.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: User, title: 'For Drivers', desc: 'Document accidents, lodge claims, and request a courtesy car — free, forever.', href: '/signup', cta: 'Sign up free' },
              { icon: Users, title: 'For Families', desc: 'Manage every vehicle in your household from one account with shared access.', href: '/signup', cta: 'Get started' },
              { icon: Building2, title: 'For Fleets', desc: 'Assign vehicles to drivers, track WOF/rego expiries, and centralise claims.', href: '/fleet', cta: 'Explore fleet' },
              { icon: Briefcase, title: 'For Brokers', desc: 'Onboard clients, see their vehicles and claims, and accelerate settlements.', href: '/broker', cta: 'Broker portal' },
              { icon: Truck, title: 'For Rental Partners', desc: 'Auto-attach hire vehicles to customer accounts via inbound email PDFs.', href: '/rental-partner', cta: 'Partner with us' },
              { icon: Hammer, title: 'For Panel Shops', desc: 'Get listed in our directory and receive qualified repair leads near you.', href: '/panel-shops', cta: 'List your shop' },
            ].map(({ icon: Icon, title, desc, href, cta }, i) => (
              <motion.div key={title} variants={fadeUp} className={`group rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-16px_hsl(var(--primary)/0.25)] flex flex-col ${i % 2 === 0 ? 'bg-muted' : 'bg-secondary'}`}>
                <div className="w-12 h-12 rounded-full bg-card shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.3)] flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed flex-1">{desc}</p>
                <Link to={href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:gap-1.5 transition-all">
                  {cta} <ChevronRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>


        {/* CTA */}
        <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="relative overflow-hidden bg-secondary">
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Ready to protect your next claim?</h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">Join Kiwi drivers who use SAVO to document accidents, lodge insurance claims, and arrange courtesy cars with confidence.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/signup">
                <Button size="lg" className="text-sm font-semibold gap-2 h-12 px-8 rounded-full">
                  Create free account <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="text-sm font-semibold h-12 px-6 rounded-full bg-card">
                  Log in
                </Button>
              </Link>
            </div>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="bg-card border-t border-border">
          <div className="max-w-5xl mx-auto px-4 py-10">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-8">
              <div>
                <img src="/savo-logo.svg" alt="SAVO" className="h-8 invert" width="80" height="32" loading="lazy" />
                <p className="mt-2 text-xs text-muted-foreground max-w-xs">Car accident claims, courtesy cars, and insurance help — free for all New Zealand drivers.</p>
              </div>
              <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-xs">
                <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
                <Link to="/panel-shops" className="text-muted-foreground hover:text-foreground transition-colors">Panel Shops</Link>
                <Link to="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
                <Link to="/tow-companies" className="text-muted-foreground hover:text-foreground transition-colors">Tow Companies</Link>
                <Link to="/faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
                <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
                <Link to="/legal" className="text-muted-foreground hover:text-foreground transition-colors">Legal</Link>
                <a href="mailto:info@savo.co.nz" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-border/50 text-[11px] text-muted-foreground text-center space-y-2">
              <div className="flex items-center justify-center gap-3">
                <Link to="/legal" className="hover:text-foreground transition-colors">Terms</Link>
                <span>·</span>
                <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              </div>
              <div>© {new Date().getFullYear()} SAVO. All rights reserved.</div>
            </div>
          </div>
        </footer>
      </main>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'SAVO',
            url: 'https://www.savo.co.nz',
            description: 'Car accident documentation, insurance claims, courtesy car requests, and panel beater finder for New Zealand drivers.',
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'NZD' },
            areaServed: { '@type': 'Country', name: 'New Zealand' },
          }),
        }}
      />
    </div>
  );
}
