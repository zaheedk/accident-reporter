import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send, MessageSquare, ArrowDownRight, ArrowUpRight, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Message {
  id: string;
  direction: string;
  subject: string;
  body: string;
  from_email: string;
  to_email: string;
  created_at: string;
}

interface ClaimMessagesProps {
  claimId: string;
  insurerEmail: string;
  insurerName: string;
}

export default function ClaimMessages({ claimId, insurerEmail, insurerName }: ClaimMessagesProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`claim-messages-${claimId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'claim_messages',
        filter: `claim_id=eq.${claimId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [claimId]);

  async function loadMessages() {
    const { data, error } = await supabase
      .from('claim_messages')
      .select('*')
      .eq('claim_id', claimId)
      .order('created_at', { ascending: true });

    if (!error && data) setMessages(data);
    setLoading(false);
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      toast.error('Please enter a subject and message');
      return;
    }
    if (!insurerEmail) {
      toast.error('No insurer email address available');
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('send-to-insurer', {
        body: { claimId, insurerEmail, subject, body },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send');

      toast.success('Message sent to insurance company');
      setSubject('');
      setBody('');
      setShowCompose(false);
      // Message will appear via realtime, but also reload to be safe
      loadMessages();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="card-surface space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-muted-foreground flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Insurance Communication
        </h3>
        <button
          onClick={() => setShowCompose(!showCompose)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {showCompose ? 'Cancel' : '+ New Message'}
        </button>
      </div>

      {showCompose && (
        <div className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-[11px] text-muted-foreground">
            To: <span className="font-medium text-foreground">{insurerName}</span>
            {insurerEmail && <span className="ml-1">({insurerEmail})</span>}
          </p>
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <textarea
            placeholder="Write your message..."
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-4">Loading messages...</p>
      ) : messages.length === 0 ? (
        <div className="text-center py-6">
          <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No messages yet</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">Send a message to your insurance company to get started</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} formatDate={formatDate} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
