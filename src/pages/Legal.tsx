import AppLayout from '@/components/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Legal() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Legal</h1>

        <Tabs defaultValue="terms" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="terms">Terms of Service</TabsTrigger>
            <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
          </TabsList>

          <TabsContent value="terms" className="card-surface space-y-5">
            <Section title="1. Acceptance of Terms">
              By accessing or using Savo ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
            </Section>
            <Section title="2. Description of Service">
              Savo provides a digital platform for documenting vehicle insurance claims, managing vehicle records, and connecting with panel repair shops. The Service is provided "as is" for informational and organisational purposes only.
            </Section>
            <Section title="3. User Accounts">
              You must create an account to use the Service. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. You must provide accurate and complete information.
            </Section>
            <Section title="4. Acceptable Use">
              You agree not to misuse the Service, submit false or misleading claim information, attempt to gain unauthorised access, or use the platform for any unlawful purpose.
            </Section>
            <Section title="5. Intellectual Property">
              All content, trademarks, and materials on Savo are owned by us or our licensors. You may not copy, modify, or distribute any part of the Service without written permission.
            </Section>
            <Section title="6. Limitation of Liability">
              Savo is not an insurance provider or legal advisor. We do not guarantee claim outcomes. To the fullest extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.
            </Section>
            <Section title="7. Modifications">
              We reserve the right to modify these terms at any time. Continued use of the Service constitutes acceptance of updated terms.
            </Section>
            <Section title="8. Governing Law">
              These terms are governed by the laws of New Zealand. Any disputes shall be resolved in the courts of New Zealand.
            </Section>
          </TabsContent>

          <TabsContent value="privacy" className="card-surface space-y-5">
            <Section title="1. Information We Collect">
              We collect information you provide directly: name, email, phone number, vehicle details, and claim information. We also collect usage data such as device type, browser, and interaction patterns.
            </Section>
            <Section title="2. How We Use Your Information">
              Your data is used to provide and improve the Service, process and store your claim reports, communicate with you about your account, and connect you with panel shops when requested.
            </Section>
            <Section title="3. Data Storage & Security">
              Your data is stored securely using industry-standard encryption and access controls. We use secure cloud infrastructure to protect your personal information.
            </Section>
            <Section title="4. Data Sharing">
              We do not sell your personal data. Information may be shared with panel shops you select, service providers who assist in operating the platform, and legal authorities when required by law.
            </Section>
            <Section title="5. Your Rights">
              You have the right to access, correct, or delete your personal data at any time. Contact us at support@savo.co.nz to exercise these rights.
            </Section>
            <Section title="6. Cookies">
              We use essential cookies to maintain your session and preferences. No third-party tracking cookies are used without your consent.
            </Section>
            <Section title="7. Changes to This Policy">
              We may update this Privacy Policy periodically. We will notify you of significant changes via email or in-app notification.
            </Section>
            <Section title="8. Contact">
              For privacy-related enquiries, email support@rift.co.nz or visit our Contact page.
            </Section>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
