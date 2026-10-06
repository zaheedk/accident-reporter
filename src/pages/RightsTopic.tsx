import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import SEO from '@/components/SEO';
import LegalDisclaimer from '@/components/LegalDisclaimer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getRightsTopic } from '@/lib/rights-data';

export default function RightsTopic() {
  const { slug = '' } = useParams();
  const topic = getRightsTopic(slug);
  if (!topic) return <Navigate to="/rights" replace />;

  const url = `https://www.savo.co.nz/rights/${topic.slug}`;
  return (
    <AppLayout>
      <SEO
        title={`${topic.title} | NZ Driver Rights | SAVO`}
        description={topic.summary}
        path={`/rights/${topic.slug}`}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'FAQPage',
              '@id': `${url}#faq`,
              mainEntity: topic.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
            },
            {
              '@type': 'BreadcrumbList',
              '@id': `${url}#breadcrumb`,
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.savo.co.nz/' },
                { '@type': 'ListItem', position: 2, name: 'Know your rights', item: 'https://www.savo.co.nz/rights' },
                { '@type': 'ListItem', position: 3, name: topic.title, item: url },
              ],
            },
          ],
        }}
      />
      <article className="max-w-2xl mx-auto space-y-6">
        <Link to="/rights" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-3.5 h-3.5" />All rights guides
        </Link>
        <header>
          <h1 className="text-2xl font-bold text-foreground">{topic.title}</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{topic.summary}</p>
        </header>

        <LegalDisclaimer compact />

        {topic.sections.map((s) => (
          <section key={s.heading} className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">{s.heading}</h2>
            {s.body.map((p, i) => <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>)}
          </section>
        ))}

        {topic.faqs.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">Common questions</h2>
            <Accordion type="single" collapsible className="card-surface">
              {topic.faqs.map((f, i) => (
                <AccordionItem key={i} value={`f${i}`}>
                  <AccordionTrigger className="text-sm text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}

        {topic.related && (
          <div className="space-y-2">
            {topic.related.map((r) => (
              <Link key={r.to} to={r.to} className="card-surface flex items-center justify-between text-sm font-semibold text-foreground hover:border-primary/30">
                {r.label}<ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}

        <LegalDisclaimer />
      </article>
    </AppLayout>
  );
}
