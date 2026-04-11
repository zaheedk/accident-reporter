import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Camera, FileText, Clock, Phone, Wrench, Truck, ChevronRight, ArrowRight, CheckCircle2, BookOpen, HelpCircle, Newspaper, Menu, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
const heroScene = '/hero-scene.jpg';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } };

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  const contentLinks = [
    { to: '/panel-shops', icon: Wrench, label: 'Panel Shops' },
    { to: '/tow-companies', icon: Truck, label: 'Tow Companies' },
    { to: '/how-it-works', icon: BookOpen, label: 'How It Works' },
    { to: '/blog', icon: Newspaper, label: 'Blog' },
    { to: '/faq', icon: HelpCircle, label: 'FAQ' },
    { to: '/about', icon: Info, label: 'About & Contact' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="bg-card sticky top-0 z-30 border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/savo-logo.svg" alt="SAVO" className="h-11" width="110" height="44" />
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground font-medium">
            {contentLinks.map(({ to, label }) => (
              <Link key={to} to={to} className="hover:text-foreground transition-colors">{label.replace('Panel ', '').replace(' Companies', '')}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth?mode=login">
              <Button variant="ghost" size="sm" className="text-foreground hover:bg-muted text-sm font-medium">
                Log in
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
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
            <Link to="/auth?mode=login" onClick={() => setMenuOpen(false)}
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
          className="relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, hsl(213 52% 24%), hsl(213 52% 14%))' }}
        >
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, white 0%, transparent 60%)' }} />
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-24 relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-16">
            <motion.div variants={fadeUp} className="flex-1 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/90 backdrop-blur-sm mb-5">
                <Shield className="w-3.5 h-3.5" /> Made for New Zealand drivers
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
                Car accident?<br />
                <span className="text-white/80">We've got you covered.</span>
              </h1>
              <p className="mt-4 text-base md:text-lg text-white/70 leading-relaxed max-w-md">
                SAVO helps New Zealand drivers document accidents, lodge insurance claims, request courtesy cars, and find panel beaters — all in one free app.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/auth?mode=signup">
                  <Button size="lg" className="text-sm font-bold gap-2 h-12 px-6">
                    Get started — it's free <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/how-it-works">
                  <Button variant="outline" size="lg" className="text-sm font-semibold h-12 px-6 border-white/20 text-white bg-white/10 hover:bg-white/20">
                    How it works
                  </Button>
                </Link>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="flex-shrink-0 w-64 md:w-80 lg:w-96">
              <img
                src={heroScene}
                alt="Person documenting car accident with smartphone"
                className="w-full rounded-2xl shadow-2xl border border-white/10"
                width={800}
                height={800}
                loading="eager"
                fetchPriority="high"
              />
            </motion.div>
          </div>
        </motion.section>

        {/* Trust bar */}
        <motion.section variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="border-b border-border bg-card">
          <div className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground font-medium">
            {['100% Free', 'Courtesy Car Requests', 'All NZ Insurers', 'Works on Any Phone'].map(item => (
              <motion.div key={item} variants={fadeUp} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                {item}
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Features */}
        <motion.section variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="max-w-5xl mx-auto px-4 py-16 md:py-20">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Everything you need after a car accident</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">From capturing evidence to lodging your insurance claim and arranging a courtesy car — SAVO handles it all.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Camera, title: 'Photo Documentation', desc: 'Capture and organise damage photos, licence plates, and scene evidence with guided prompts.' },
              { icon: FileText, title: 'Smart Claim Reports', desc: 'Generate comprehensive incident reports that match what NZ insurers actually need.' },
              { icon: Clock, title: 'Fast Insurance Claims', desc: 'Lodge your insurance claim directly with any NZ insurer in minutes, not days.' },
              { icon: Phone, title: 'Courtesy Car Requests', desc: 'Request a courtesy car through your insurer or our partners so you stay mobile while repairs happen.' },
              { icon: Wrench, title: 'Find Panel Beaters', desc: 'Browse top-rated panel shops near you with ratings, distance, and one-tap calling.' },
              { icon: Truck, title: 'Emergency Towing', desc: 'Find and call the nearest tow company instantly when you need help on the road.' },
            ].map(({ icon: Icon, title, desc }) => (
              <motion.div key={title} variants={fadeUp} className="card-surface-elevated group hover:border-primary/20 transition-all">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
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
              <Link to="/auth?mode=signup">
                <Button size="lg" className="text-sm font-bold gap-2 h-12 px-8">
                  Start for free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.section>


        {/* CTA */}
        <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, hsl(213 52% 24%), hsl(213 52% 14%))' }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, white 0%, transparent 60%)' }} />
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20 text-center relative z-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">Ready to protect your next claim?</h2>
            <p className="mt-3 text-white/70 max-w-md mx-auto">Join Kiwi drivers who use SAVO to document accidents, lodge insurance claims, and arrange courtesy cars with confidence.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="text-sm font-bold gap-2 h-12 px-8 bg-white text-primary hover:bg-white/90">
                  Create free account <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/auth?mode=login">
                <Button variant="outline" size="lg" className="text-sm font-semibold h-12 px-6 border-white/20 text-white bg-white/10 hover:bg-white/20">
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
            <div className="mt-8 pt-6 border-t border-border/50 text-[11px] text-muted-foreground text-center">
              © {new Date().getFullYear()} SAVO. All rights reserved.
            </div>
          </div>
        </footer>
      </main>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org(',
            ')@type': 'WebApplication',
            name: 'SAVO',
            url: 'https://savo.co.nz(',
            description: ')Car accident documentation, insurance claims, courtesy car requests, and panel beater finder for New Zealand drivers.',
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
