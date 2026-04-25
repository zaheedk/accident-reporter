import AppLayout from '@/components/AppLayout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, MessageSquare } from 'lucide-react';
import SEO from '@/components/SEO';

const faqs = [
  {
    q: 'What is SAVO?',
    a: 'SAVO is a digital tool that helps you document and manage vehicle insurance incidents. It guides you through the entire process — from recording incident details to selecting a trusted panel shop for repairs.',
  },
  {
    q: 'Is SAVO free to use?',
    a: 'Yes! SAVO is completely free for vehicle owners. We make it easy to document incidents and connect with panel shops at no cost to you.',
  },
  {
    q: 'How do I file an incident report?',
    a: 'Tap "New Report" from the dashboard, then follow our step-by-step wizard. You\'ll enter incident details, vehicle information, third-party details, witness info, conditions, and damage/repairer preferences.',
  },
  {
    q: 'Can I save a draft and finish later?',
    a: 'Absolutely. Your incident report is saved as a draft automatically. Come back anytime to complete and submit it.',
  },
  {
    q: 'How do I add photos to my incident report?',
    a: 'After creating an incident report, open the incident detail page and use the photo upload section to attach images of the damage, the scene, or any relevant documents.',
  },
  {
    q: 'What are panel shops?',
    a: 'Panel shops are vehicle repair specialists. SAVO maintains a curated list of trusted panel shops with ratings, contact details, and locations to help you choose the right repairer.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. All your data is stored securely with encryption. Only you can access your incident reports, vehicles, and personal information through your authenticated account.',
  },
  {
    q: 'Can I edit a saved incident report?',
    a: 'Yes! You can edit your incident report at any time. Simply open the report and tap the edit button to make changes.',
  },
  {
    q: 'How do I contact support?',
    a: 'Visit our About & Contact page, or email us directly at support@savo.co.nz. We aim to respond within 24 hours.',
  },
];

export default function FAQ() {
  return (
    <AppLayout>
      <SEO
        title="FAQ — Car Insurance Claims & SAVO Help | NZ"
        description="Answers to the most common questions about SAVO, car accident reporting in New Zealand, lodging insurance claims, and using courtesy cars and panel shops."
        path="/faq"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">FAQ & Help Centre</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Find answers to common questions about using SAVO.
          </p>
        </div>

        <div className="card-surface p-0 overflow-hidden">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map(({ q, a }, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border/60 last:border-0">
                <AccordionTrigger className="px-5 py-4 text-sm font-medium text-foreground hover:no-underline hover:bg-muted/30 [&[data-state=open]]:bg-muted/20">
                  <span className="flex items-center gap-2.5 text-left">
                    <HelpCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    {q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed pl-[42px]">
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="card-surface flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Still have questions?</h3>
            <p className="text-sm text-muted-foreground mb-3">We're here to help. Reach out and we'll get back to you within 24 hours.</p>
            <a href="/about" className="btn-secondary text-xs h-8 px-3.5 inline-flex">Contact Support</a>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}