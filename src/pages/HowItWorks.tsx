import AppLayout from '@/components/AppLayout';
import { Car, FileText, Wrench, CheckCircle2, ArrowRight } from 'lucide-react';
import SEO from '@/components/SEO';

const steps = [
  {
    icon: Car,
    title: 'Add Your Vehicle',
    desc: 'Register your vehicle details — make, model, rego, WOF & registration expiry — so they\'re ready when you need them.',
  },
  {
    icon: FileText,
    title: 'File an Incident Report',
    desc: 'Our step-by-step wizard walks you through documenting the incident: date, location, third parties, witnesses, and conditions.',
  },
  {
    icon: Wrench,
    title: 'Choose a Panel Shop',
    desc: 'Browse our network of trusted panel shops, compare ratings, and select a repairer that suits you.',
  },
  {
    icon: CheckCircle2,
    title: 'Track & Submit',
    desc: 'Review your completed report, attach photos, and submit it to your insurer. Keep track of everything in one place.',
  },
];

export default function HowItWorks() {
  return (
    <AppLayout>
      <SEO
        title="How SAVO Works — Document, Lodge & Track Car Accident Claims | NZ"
        description="See how SAVO walks NZ drivers through documenting an accident, lodging an insurance claim, requesting a courtesy car and choosing a panel beater — step by step."
        path="/how-it-works"
      />
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">How It Works</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            SAVO takes the hassle out of insurance incidents in four simple steps.
          </p>
        </div>

        <div className="space-y-4">
          {steps.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="card-surface flex gap-4 items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="step-badge step-badge-active text-[11px]">{i + 1}</span>
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-3 hidden sm:block" />
              )}
            </div>
          ))}
        </div>

        <div className="card-surface bg-primary/5 border border-primary/10">
          <h3 className="text-sm font-semibold text-foreground mb-2">Ready to get started?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first incident report in minutes — no paperwork required.
          </p>
          <a href="/claims/new" className="btn-primary inline-flex">
            Start an Incident Report
          </a>
        </div>
      </div>
    </AppLayout>
  );
}