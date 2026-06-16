import AppLayout from '@/components/AppLayout';
import SEO from '@/components/SEO';

export default function Privacy() {
  const lastUpdated = 'April 2026';

  return (
    <AppLayout>
      <SEO
        title="Privacy Policy | SAVO"
        description="How SAVO collects, uses, stores and protects your personal information in line with the New Zealand Privacy Act 2020."
        path="/privacy"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Privacy Policy',
          url: 'https://savo.co.nz/privacy',
          publisher: { '@type': 'Organization', name: 'SAVO', url: 'https://savo.co.nz' },
        }}
      />
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-xs text-muted-foreground">Last updated: {lastUpdated}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            SAVO ("we", "us", "our") is committed to protecting your privacy. This policy explains what information
            we collect, how we use it, and the rights you have under the New Zealand Privacy Act 2020.
          </p>
        </header>

        <div className="card-surface space-y-5">
          <Section title="1. Information We Collect">
            We collect information you provide directly: name, email address, phone number, vehicle details
            (make, model, registration, WOF/Rego expiry), insurance details, incident reports, photos and
            documents you upload. We also collect technical data such as device type, browser, IP address and
            interaction patterns to keep the service secure and improve performance.
          </Section>

          <Section title="2. How We Use Your Information">
            Your data is used to operate the service, store and process incident reports, send claim
            notifications and expiry reminders, communicate with you about your account, and connect you with
            panel shops, tow operators or insurers when you request it.
          </Section>

          <Section title="3. Data Storage & Security">
            Your data is stored on secure cloud infrastructure with industry-standard encryption in transit
            (TLS) and at rest. Access is protected by row-level security so only you (and any administrators
            you authorise) can view your records. Files in storage require signed URLs and expire automatically.
          </Section>

          <Section title="4. Data Sharing">
            We never sell your personal data. Information is shared only when you explicitly request it
            (e.g. sending a claim to your insurer or a courtesy car request to a partner), with service
            providers who help us operate the platform (email, SMS, hosting), or when required by law.
          </Section>

          <Section title="5. Your Rights">
            Under the NZ Privacy Act 2020 you may request access to, correction of, or deletion of your
            personal data at any time. You can delete your account in-app, or email{' '}
            <a className="text-primary underline underline-offset-2" href="mailto:support@savo.co.nz">
              support@savo.co.nz
            </a>
            .
          </Section>

          <Section title="6. Cookies & Analytics">
            We use essential cookies to maintain your session and a minimal analytics tag (Google Analytics)
            to understand aggregate usage. No third-party advertising or tracking cookies are used.
          </Section>

          <Section title="7. Children">
            SAVO is not intended for children under 16. We do not knowingly collect personal information from
            children. If you believe a child has provided data, contact us so we can remove it.
          </Section>

          <Section title="8. Changes to This Policy">
            We may update this Privacy Policy periodically. Material changes will be notified via email or an
            in-app notice. Continued use of the service after changes take effect constitutes acceptance.
          </Section>

          <Section title="9. Contact">
            For privacy enquiries or to exercise your rights, email{' '}
            <a className="text-primary underline underline-offset-2" href="mailto:support@savo.co.nz">
              support@savo.co.nz
            </a>
            . You also have the right to complain to the Office of the Privacy Commissioner (privacy.org.nz).
          </Section>
        </div>
      </div>
    </AppLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground mb-1.5">{title}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </section>
  );
}
