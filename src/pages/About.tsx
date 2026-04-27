import AppLayout from '@/components/AppLayout';
import { Mail, Phone, MapPin, Send, Lightbulb, ShieldCheck, Heart, Quote } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';

export default function About() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'contact_confirmation',
          to: form.email,
          data: { name: form.name, message: form.message },
        },
      });
      toast.success('Message sent! We\'ll get back to you soon.');
      setForm({ name: '', email: '', message: '' });
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <SEO
        title="About SAVO — NZ's Free Car Accident & Claims Helper"
        description="Learn about SAVO, the free New Zealand app helping drivers document accidents, lodge insurance claims and find trusted panel shops and tow companies."
        path="/about"
      />
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">About SAVO</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            SAVO is a free New Zealand–made app that helps drivers document accidents properly the first time, so insurance claims go through smoothly — without the back-and-forth, missing details, or rejected paperwork.
          </p>
        </div>

        {/* Founder's story */}
        <div className="card-surface space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">How SAVO Started — A Kiwi Story</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            SAVO was born out of frustration. After a minor accident on a wet Auckland morning, our founder did what most Kiwis do — exchanged a few details with the other driver, snapped a couple of photos, and assumed the insurer would take it from there.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Weeks later, the claim stalled. The insurer kept coming back asking for more: a clearer photo of the other driver's licence, the exact location, the time, the direction of travel, witness contact details, the third party's insurer, even the angle of impact. Every missing piece meant another phone call, another email, another delay — and eventually, a claim that was partially declined because the evidence wasn't strong enough.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Standing on the side of the road in shock, no one remembers a checklist. That's the problem SAVO set out to solve.
          </p>
          <blockquote className="border-l-2 border-primary pl-4 py-1 text-sm italic text-foreground/80">
            <Quote className="w-4 h-4 text-primary mb-1" />
            "I lost hundreds of dollars and weeks of stress simply because I didn't know what details my insurer needed at the scene. I built SAVO so no other Kiwi has to learn that lesson the hard way."
            <footer className="not-italic text-xs text-muted-foreground mt-2">— SAVO Founder, Auckland</footer>
          </blockquote>
        </div>

        {/* What we do */}
        <div className="card-surface space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Built Around What Insurers Actually Need</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We worked backwards from real claim forms used by NZ insurers — IAG, AA, Tower, State, AMI, Vero and others — to figure out exactly what details get a claim approved on the first attempt. SAVO's guided capture flow walks you through every one of them, step by step, even when you're shaken up.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary">•</span> Guided photo prompts for damage, plates, scene angles and the other driver's licence</li>
            <li className="flex gap-2"><span className="text-primary">•</span> Auto-captured GPS location, time, and weather conditions</li>
            <li className="flex gap-2"><span className="text-primary">•</span> Structured fields for third-party details, insurer, witnesses and police reference</li>
            <li className="flex gap-2"><span className="text-primary">•</span> One-tap PDF report you can email straight to your insurer</li>
            <li className="flex gap-2"><span className="text-primary">•</span> Saved vehicle profiles with Rego, WOF and insurance expiry reminders</li>
          </ul>
        </div>

        {/* Impact */}
        <div className="card-surface space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Helping Kiwis Claim with Confidence</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Today, hundreds of New Zealanders use SAVO at the roadside, in supermarket carparks, and after motorway prangs to capture everything their insurer will need — before they leave the scene. Users tell us their claims are processed faster, with fewer follow-up calls, and far less stress.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            SAVO is, and always will be, free for everyday drivers. Because being prepared after an accident shouldn't be a paid privilege — it should be standard.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {[
              { num: '500+', label: 'Incidents processed' },
              { num: '50+', label: 'Partner shops' },
              { num: '4.8★', label: 'User rating' },
            ].map(({ num, label }) => (
              <div key={label} className="text-center p-4 rounded-xl bg-muted/50">
                <div className="text-xl font-bold text-foreground">{num}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface space-y-4">
          <h2 className="text-base font-semibold text-foreground">Contact Us</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Mail className="w-4 h-4 text-primary" /> support@savo.co.nz
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Phone className="w-4 h-4 text-primary" /> +64 27 535 3037
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" /> Auckland, New Zealand
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card-surface space-y-4">
          <h2 className="text-base font-semibold text-foreground">Send a Message</h2>
          <div>
            <label className="form-label">Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          </div>
          <div>
            <label className="form-label">Message</label>
            <textarea className="form-input min-h-[100px] resize-none" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required />
          </div>
          <button type="submit" disabled={sending} className="btn-primary w-full">
            <Send className="w-4 h-4" />
            {sending ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}