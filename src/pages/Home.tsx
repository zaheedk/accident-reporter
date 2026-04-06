import { Link } from 'react-router-dom';
import { Shield, Camera, FileText, Clock, Phone, Wrench, Truck, ChevronRight, ArrowRight, CheckCircle2, BookOpen, HelpCircle, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } };

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="bg-dark-surface sticky top-0 z-30 border-b border-[hsl(var(--dark-surface))]">
        <div className="max-w-5xl mx-auto px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/savo-logo.svg" alt="Savo" className="h-9" />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth?mode=login">
              <Button variant="ghost" size="sm" className="text-dark-surface-foreground hover:bg-white/10 text-sm font-medium">
                Log in
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="text-sm font-semibold">
                Sign up free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <motion.section
          variants={stagger} initial="hidden" animate="visible"
          className="relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, hsl(213 52% 24%), hsl(213 52% 14%))' }}
        >
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, white 0%, transparent 60%)' }} />
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-24 relative z-10">
            <motion.div variants={fadeUp} className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/90 backdrop-blur-sm mb-5">
                <Shield className="w-3.5 h-3.5" /> Made for New Zealand drivers
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
                Capture the scene.<br />
                <span className="text-white/80">Protect your claim.</span>
              </h1>
              <p className="mt-4 text-base md:text-lg text-white/70 leading-relaxed max-w-md">
                Savo helps Kiwis document vehicle accidents properly, report to insurers fast, and get back on the road sooner.
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
          </div>
        </motion.section>

        {/* Trust bar */}
        <motion.section variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="border-b border-border bg-card">
          <div className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground font-medium">
            {['100% Free', 'NZ Insurance Compatible', 'Works on Any Phone', 'No App Download Needed'].map(item => (
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
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Everything you need after an accident</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">From capturing evidence at the scene to submitting your claim — Savo guides you through every step.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Camera, title: 'Photo Documentation', desc: 'Capture and organise damage photos, licence plates, and scene evidence with guided prompts.' },
              { icon: FileText, title: 'Smart Claim Reports', desc: 'Generate comprehensive incident reports that match what NZ insurers actually need.' },
              { icon: Clock, title: 'Fast Submissions', desc: 'Send your completed report directly to your insurance company in minutes, not days.' },
              { icon: Shield, title: 'Vehicle Vault', desc: 'Store all your vehicle details, policy numbers, and WOF/rego dates in one secure place.' },
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
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">How Savo works</h2>
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

        {/* Quick links / directories */}
        <motion.section variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="max-w-5xl mx-auto px-4 py-16 md:py-20">
          <motion.div variants={fadeUp} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Explore Savo</h2>
            <p className="mt-3 text-muted-foreground">Free resources and directories for NZ drivers</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { to: '/panel-shops', icon: Wrench, title: 'Panel Shops Directory', desc: 'Top-rated panel beaters across New Zealand', color: 'hsl(213, 52%, 24%)' },
              { to: '/tow-companies', icon: Truck, title: 'Tow Companies Directory', desc: 'Emergency towing services nationwide', color: 'hsl(152, 60%, 42%)' },
              { to: '/blog', icon: Newspaper, title: 'Insurance Claims Blog', desc: 'Tips and guides for NZ vehicle insurance', color: 'hsl(213, 52%, 24%)' },
              { to: '/how-it-works', icon: BookOpen, title: 'How It Works', desc: 'Learn how Savo simplifies the claims process', color: 'hsl(152, 60%, 42%)' },
              { to: '/faq', icon: HelpCircle, title: 'FAQ', desc: 'Common questions about claims and using Savo', color: 'hsl(213, 52%, 24%)' },
              { to: '/about', icon: Shield, title: 'About & Contact', desc: 'Get in touch with the Savo team', color: 'hsl(152, 60%, 42%)' },
            ].map(({ to, icon: Icon, title, desc, color }) => (
              <motion.div key={to} variants={fadeUp}>
                <Link to={to} className="card-surface-elevated flex items-center gap-4 group hover:border-primary/20 transition-all">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-foreground">{title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, hsl(213 52% 24%), hsl(213 52% 14%))' }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, white 0%, transparent 60%)' }} />
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20 text-center relative z-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">Ready to protect your next claim?</h2>
            <p className="mt-3 text-white/70 max-w-md mx-auto">Join thousands of Kiwi drivers who use Savo to handle vehicle incidents with confidence.</p>
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
                <img src="/savo-logo.svg" alt="Savo" className="h-8 invert" />
                <p className="mt-2 text-xs text-muted-foreground max-w-xs">Vehicle accident reporting made simple for New Zealand drivers.</p>
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
              © {new Date().getFullYear()} Savo. All rights reserved.
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
            name: 'Savo',
            url: 'https://savo.co.nz',
            description: 'Vehicle accident reporting and insurance claims management for New Zealand drivers.',
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
