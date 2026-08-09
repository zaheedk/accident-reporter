import { Link } from 'react-router-dom';
import { Car, ShieldCheck, Clock, Wallet, CheckCircle2, ArrowRight } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';

const SITE_ORIGIN = 'https://www.savo.co.nz';
const PATH = '/not-at-fault-car-hire';

/** Tracked outbound links so Free 2 Drive can attribute SAVO-sourced leads. */
const f2d = (path: string, content: string) =>
  `https://www.free2drive.co.nz${path}?utm_source=savo&utm_medium=referral&utm_campaign=not-at-fault-car-hire&utm_content=${content}`;

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is not-at-fault car hire in New Zealand?',
    a: "It's a replacement vehicle provided to you while your car is off the road after a crash someone else caused. Because you've been deprived of your vehicle by another driver's negligence, the reasonable cost of a replacement is a recoverable loss — so a specialist provider supplies the car and recovers the hire cost from the at-fault driver's insurer.",
  },
  {
    q: 'Who pays for the hire car if the accident was not my fault?',
    a: "The at-fault driver's insurer. You are not asked for a bond, a daily rate or an excess. The provider carries the cost and recovers it directly, which is why the arrangement is set up separately from your own insurance claim.",
  },
  {
    q: 'Do I need comprehensive insurance to get one?',
    a: 'No. Not-at-fault replacement hire does not rely on your own policy at all — it relies on the other driver being liable. Third-party-only and uninsured drivers can still be eligible, provided the at-fault driver is identified and insured.',
  },
  {
    q: 'Is this the same as a panelbeater courtesy car?',
    a: 'No. A courtesy car is a goodwill loan from the repairer, usually a small hatchback, subject to availability, and typically only for the days your car is physically in the workshop. A not-at-fault replacement is matched to the vehicle you normally drive and is available from the day of the accident — including while liability, assessment and parts delays hold everything up.',
  },
  {
    q: 'How long can I keep the replacement vehicle?',
    a: 'Generally for as long as you are reasonably without your own car — through assessment, repair and, if your car is written off, until settlement is paid so you can replace it. That is often far longer than a courtesy car is available.',
  },
  {
    q: 'What if my car was written off?',
    a: "You are still entitled to a replacement while you're without a vehicle. Cover normally continues until the at-fault insurer settles the value of your car, giving you time to buy a replacement instead of being pushed into a rushed purchase.",
  },
  {
    q: 'What do I need to arrange one?',
    a: "The date and location of the crash, the other driver's name, registration and insurer if you have it, photos of the damage, and your licence. Capturing all of this at the scene — SAVO's report does it in one pass — is what makes the arrangement quick.",
  },
  {
    q: 'Does it affect my no-claims bonus or excess?',
    a: "No. It sits outside your own policy, so there's no claim against your cover, no excess to pay for the hire, and no impact on your no-claims discount.",
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'BreadcrumbList',
      '@id': `${SITE_ORIGIN}${PATH}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Not-at-fault car hire', item: `${SITE_ORIGIN}${PATH}` },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_ORIGIN}${PATH}#faq`,
      mainEntity: FAQ.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
};

const STEPS = [
  { title: 'Capture the crash properly', body: "Photos, the other driver's details, rego, location and time. SAVO's accident report collects everything an insurer or hire provider will ask for in one go." },
  { title: 'Confirm the other driver is at fault', body: 'Rear-ended, hit while parked, failed give-way — if liability sits with the other party, you are eligible. Unsure? Run our free fault guide.' },
  { title: 'Request the replacement vehicle', body: 'A specialist provider such as Free 2 Drive delivers a like-for-like vehicle, usually within a day, and handles the paperwork with the at-fault insurer.' },
  { title: 'Drive while your car is sorted', body: 'Keep the vehicle through assessment and repair — or, if your car is written off, until settlement lands.' },
];

export default function NotAtFaultCarHire() {
  return (
    <AppLayout>
      <SEO
        title="Not-At-Fault Car Hire NZ — Free Replacement Vehicle After a Crash"
        description="Not at fault in a New Zealand crash? You can get a like-for-like replacement vehicle at no cost to you, paid by the at-fault driver's insurer. How it works, who qualifies, and how to arrange one."
        path={PATH}
        jsonLd={jsonLd}
      />

      <div className="space-y-10">
        {/* Hero */}
        <header className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Replacement vehicles</p>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground leading-snug">
            Not-at-fault car hire in New Zealand
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If someone else caused the crash, you shouldn&apos;t be the one without a car. In New Zealand you can be
            given a like-for-like replacement vehicle from the day of the accident — with the hire cost recovered from
            the at-fault driver&apos;s insurer, not from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="w-full sm:w-auto">
              <a href={f2d('/not-at-fault-car-hire', 'hero')} target="_blank" rel="noopener">
                Request a replacement vehicle <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/claims/new">Start an accident report</Link>
            </Button>
          </div>
        </header>

        {/* Value props */}
        <section className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: Wallet, title: 'Nothing to pay', body: 'No bond, no daily rate, no excess. The cost is recovered from the at-fault insurer.' },
            { icon: Car, title: 'Like-for-like', body: 'A ute for a ute, a seven-seater for a seven-seater — not whatever hatchback is spare.' },
            { icon: Clock, title: 'From day one', body: 'Available while liability, assessment and parts delays drag on — not just repair days.' },
            { icon: ShieldCheck, title: 'No effect on your policy', body: 'Sits outside your own cover, so your no-claims bonus is untouched.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="card-surface space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section className="space-y-4">
          <h2 className="text-lg font-serif font-semibold text-foreground">How it works</h2>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card-surface flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground">
            Not sure who was at fault?{' '}
            <Link className="text-primary hover:underline" to="/fault-guide">
              Use the free SAVO fault guide
            </Link>{' '}
            before you call anyone.
          </p>
        </section>

        {/* Courtesy car vs replacement */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif font-semibold text-foreground">Courtesy car vs replacement vehicle</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium"> </th>
                  <th className="py-2 pr-3 font-medium">Panelbeater courtesy car</th>
                  <th className="py-2 font-medium">Not-at-fault replacement</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                {[
                  ['Who provides it', 'Your repairer or insurer, if one is spare', 'A replacement-vehicle specialist'],
                  ['Vehicle type', 'Usually a small hatchback', 'Matched to your own vehicle'],
                  ['When you get it', 'Once repairs actually start', 'From the day of the accident'],
                  ['Who pays', 'Absorbed by the shop — often capped', "The at-fault driver's insurer"],
                  ['If your car is written off', 'Usually unavailable', 'Continues until settlement'],
                ].map(([label, a, b]) => (
                  <tr key={label} className="border-t border-border align-top">
                    <td className="py-2 pr-3 text-muted-foreground">{label}</td>
                    <td className="py-2 pr-3">{a}</td>
                    <td className="py-2">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            Full breakdown in our guide:{' '}
            <Link className="text-primary hover:underline" to="/blog/courtesy-cars-not-at-fault-accidents-nz">
              courtesy car vs replacement vehicle in NZ
            </Link>
            .
          </p>
        </section>

        {/* Eligibility */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif font-semibold text-foreground">Who qualifies</h2>
          <ul className="space-y-2">
            {[
              'The other driver caused the crash and can be identified',
              'You held a valid NZ licence at the time',
              'Your vehicle is unsafe, undriveable or off the road for repairs',
              'You still need a vehicle for work, family or study',
            ].map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Comprehensive cover is not required — eligibility depends on the other driver&apos;s liability, not your
            policy.
          </p>
        </section>

        {/* FAQ */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif font-semibold text-foreground">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <div key={f.q} className="card-surface">
                <h3 className="text-sm font-semibold text-foreground">{f.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="rounded-lg border border-border bg-muted/40 p-5 space-y-3">
          <h2 className="text-lg font-serif font-semibold text-foreground">Get back on the road</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            SAVO captures the accident evidence that makes a replacement vehicle quick to arrange. Free 2 Drive supplies
            the car and deals with the at-fault insurer.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="w-full sm:w-auto">
              <a href={f2d('/not-at-fault-car-hire', 'footer')} target="_blank" rel="noopener">
                Request a replacement vehicle
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/blog/who-pays-hire-car-not-at-fault-accident-nz">Who pays for the hire car?</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            SAVO is independent. We don&apos;t charge for referrals and we don&apos;t act for insurers.
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
