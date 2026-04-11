import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send, Inbox, ArrowDownRight, ArrowUpRight, Loader2, Plus, ArrowLeft, Reply } from 'lucide-react';
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`claim-messages-${claimId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'claim_messages',
        filter: `claim_id=eq.${claimId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [claimId]);

  async function loadMessages() {
    const { data, error } = await supabase
      .from('claim_messages')
      .select('*')
      .eq('claim_id', claimId)
      .order('created_at', { ascending: false });
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
      loadMessages();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  const formatFullDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Compose view
  if (showCompose) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 420 }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-muted/30">
          <button onClick={() => setShowCompose(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <h3 className="text-sm font-semibold text-foreground">New Message</h3>
        </div>
        <div className="flex-1 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground w-10">To:</span>
            <span className="font-medium text-foreground">{insurerName}</span>
            {insurerEmail && <span className="text-muted-foreground text-xs">({insurerEmail})</span>}
          </div>
          <div className="border-t border-border/40" />
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full text-sm font-medium text-foreground bg-transparent placeholder:text-muted-foreground/50 focus:outline-none py-1"
          />
          <div className="border-t border-border/40" />
          <textarea
            placeholder="Write your message..."
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={8}
            className="w-full text-sm text-foreground bg-transparent placeholder:text-muted-foreground/50 focus:outline-none resize-none leading-relaxed"
          />
        </div>
        <div className="px-4 py-3 border-t border-border/40 bg-muted/20">
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    );
  }

  // Message detail view
  if (selectedMsg) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 420 }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-muted/30">
          <button onClick={() => setSelectedMsg(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <h3 className="text-sm font-semibold text-foreground flex-1 truncate">{selectedMsg.subject}</h3>
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${selectedMsg.direction === 'outbound' ? 'bg-primary/10' : 'bg-emerald-500/10'}`}>
              {selectedMsg.direction === 'outbound'
                ? <ArrowUpRight className="w-4 h-4 text-primary" />
                : <ArrowDownRight className="w-4 h-4 text-emerald-600" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {selectedMsg.direction === 'outbound' ? 'You' : selectedMsg.from_email}
                </span>
                <span className="text-[11px] text-muted-foreground">{formatFullDate(selectedMsg.created_at)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedMsg.direction === 'outbound'
                  ? `To: ${selectedMsg.to_email}`
                  : `To: You`
                }
              </p>
            </div>
          </div>
          <div className="border-t border-border/40" />
          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pl-12">
            {selectedMsg.body || <span className="text-muted-foreground italic">No message content</span>}
          </div>
        </div>
        {selectedMsg.direction === 'inbound' && insurerEmail && (
          <div className="px-4 py-3 border-t border-border/40 bg-muted/20">
            <button
              onClick={() => {
                setSelectedMsg(null);
                setSubject(`Re: ${selectedMsg.subject}`);
                setShowCompose(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-xl hover:bg-primary/15 transition-colors"
            >
              <Reply className="w-4 h-4" /> Reply
            </button>
          </div>
        )}
      </div>
    );
  }

  // Inbox list view
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 420 }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Inbox</h3>
          {messages.length > 0 && (
            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">{messages.length}</span>
          )}
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Compose
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
          <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
            <Inbox className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1 text-center">Send a message to your insurance company to start a conversation</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {messages.map(msg => (
            <button
              key={msg.id}
              onClick={() => setSelectedMsg(msg)}
              className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.direction === 'outbound' ? 'bg-primary/10' : 'bg-emerald-500/10'}`}>
                  {msg.direction === 'outbound'
                    ? <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
                    : <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {msg.direction === 'outbound' ? 'You' : msg.from_email}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0">{formatDate(msg.created_at)}</span>
                  </div>
                  <p className="text-[13px] font-medium text-foreground truncate mt-0.5">{msg.subject}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.body || 'No content'}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
