import AppLayout from '@/components/AppLayout';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">About SAVO</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            SAVO makes vehicle insurance incidents simple, fast, and stress-free. We guide you through every step — from documenting the incident to connecting with trusted panel shops for repairs.
          </p>
        </div>

        <div className="card-surface space-y-4">
          <h2 className="text-base font-semibold text-foreground">Our Mission</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Filing an incident report after a vehicle accident shouldn't be complicated. We built SAVO to eliminate the paperwork headaches, keep your records organised, and get you back on the road faster.
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
              <Phone className="w-4 h-4 text-primary" /> 0800 SAVO (7286)
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