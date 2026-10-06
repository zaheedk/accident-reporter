import { Link } from 'react-router-dom';
import { ChevronRight, Scale, Gavel } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import SEO from '@/components/SEO';
import LegalDisclaimer from '@/components/LegalDisclaimer';
import { RIGHTS_TOPICS } from '@/lib/rights-data';

export default function Rights() {
  return (
    <AppLayout>
      <SEO
        title="Know Your Rights After a Car Accident | NZ | SAVO"
        description="Plain-English guide to your rights after a car accident in New Zealand: not-at-fault claims, courtesy cars, choosing a repairer, declined claims and free disputes."
        path="/rights"
      />
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mb-2"><Scale className="w-3.5 h-3.5" />Know your rights</span>
          <h1 className="text-2xl font-bold text-foreground">Your rights after a car accident in NZ</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Insurance can feel stacked against you. These guides explain, in plain English, what you are usually entitled to and how to push back.
          </p>
        </div>

        <Link to="/fault-guide" className="card-surface-elevated flex items-center gap-4 hover:border-primary/30 transition-colors">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Gavel className="w-5 h-5 text-primary" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Who is at fault?</p>
            <p className="text-xs text-muted-foreground">Answer a few questions and see which NZ road rule applies.</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>

        <div className="space-y-3">
          {RIGHTS_TOPICS.map((t) => (
            <Link key={t.slug} to={`/rights/${t.slug}`} className="card-surface flex items-center gap-3 hover:border-primary/30 transition-colors">
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-foreground">{t.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{t.summary}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>

        <LegalDisclaimer />
      </div>
    </AppLayout>
  );
}
