import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

export default function AccountDeletion() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Delete Your SAVO Account & Data"
        description="How to request deletion of your SAVO account and associated data, what is deleted, what is retained, and how long it takes."
      />
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">SAVO (nz.co.savo.app)</p>
          <h1 className="text-2xl font-bold text-foreground">Delete your account and data</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You can permanently delete your SAVO account and the personal data linked to it at any time.
            There are two ways to do this — in the app, or by emailing us.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Option 1 — Delete in the app</h2>
          <ol className="text-sm text-foreground list-decimal ml-5 space-y-1 leading-relaxed">
            <li>Open the SAVO app (or sign in on the web) and go to <strong>Profile</strong>.</li>
            <li>Tap <strong>Delete account</strong>.</li>
            <li>Type <strong>DELETE</strong> to confirm. Your account is removed immediately.</li>
          </ol>
          <p className="text-sm">
            <Link to="/delete-account" className="text-primary underline font-medium">
              Sign in and delete my account
            </Link>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Option 2 — Email request (no sign-in needed)</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Email{" "}
            <a href="mailto:support@savo.co.nz?subject=Account%20deletion%20request" className="text-primary underline font-medium">
              support@savo.co.nz
            </a>{" "}
            from the email address or phone number registered on your account with the subject
            “Account deletion request”. We verify your identity and delete the account within 7 days.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">What gets deleted</h2>
          <ul className="text-sm text-foreground list-disc ml-5 space-y-1 leading-relaxed">
            <li>Your login account (email, phone number, password credentials)</li>
            <li>Profile details — name, address, contact details</li>
            <li>Vehicles, WOF/registration and insurance records</li>
            <li>Incident reports, photos, dashcam videos and uploaded documents</li>
            <li>Messages with insurers, repairers and support</li>
            <li>Push notification tokens and device/widget links</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">What we may retain, and for how long</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Where the law requires it, we retain minimal records of transactions and communications sent to
            third parties (for example a claim already submitted to an insurer) for up to 7 years, as required
            by New Zealand record-keeping and financial obligations. These records are not used for any other
            purpose. Anonymised, non-identifying analytics may be kept indefinitely.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Delete only some of your data</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you want to keep your account but delete specific data (for example photos or a past claim),
            sign in and use the{" "}
            <Link to="/delete-data-request" className="text-primary underline font-medium">
              data deletion request
            </Link>{" "}
            form, or email support@savo.co.nz.
          </p>
        </section>

        <p className="text-xs text-muted-foreground">
          See our <Link to="/privacy" className="underline">Privacy Policy</Link> for full details on how we handle your information.
        </p>
      </main>
    </div>
  );
}
