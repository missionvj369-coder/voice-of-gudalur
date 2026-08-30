import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  Copy, 
  Check, 
  Globe, 
  Building, 
  ShieldCheck, 
  ExternalLink, 
  X,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EMAIL_RECIPIENTS, EMAIL_PETITION_DATA, EmailRecipient } from '../../data/emailPetitionData';
import { useLanguage, type Language } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { db, isSupabaseConfigured, generateEmailRef } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLang?: Language;
  /** Docket ref of an already-recorded submission (restored from the ledger). */
  initialDocketRef?: string | null;
  /** Receives the immutable docket ref the moment the submission is recorded. */
  onSubmissionRecorded?: (docketRef: string) => void;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  initialLang,
  initialDocketRef,
  onSubmissionRecorded
}) => {
  const { lang: appLang } = useLanguage();
  const { profile } = useAuth();
  
  const [selectedLang, setSelectedLang] = useState<Language>(initialLang || appLang || 'en');
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedRecipients, setCopiedRecipients] = useState(false);
    const [activeTab, setActiveTab] = useState<'preview' | 'recipients'>('preview');
  const [recording, setRecording] = useState(false);
  const [submissionDone, setSubmissionDone] = useState(false);
  const [submissionError, setSubmissionError] = useState(false);
  const [docketRef, setDocketRef] = useState<string | null>(null);
  const [sendInitiated, setSendInitiated] = useState(false);
  const [rescueOpen, setRescueOpen] = useState(false);
  const [waShareUrl, setWaShareUrl] = useState<string | null>(null);

  /** WhatsApp celebration share — prefilled message + voiceofgudalur.com link. */
  const buildWhatsAppShareUrl = (docket: string | null) => {
    const msg = `🌿 I signed the *Voice of Gudalur* petition — Right to Life for Gudalur.${docket ? `\n🧾 Official Docket: ${docket}` : ''}\n✉️ Sent to the Hon'ble Chief Minister & all departments.\n\n🇮🇳 Read, Sign & Send yours:\nhttps://voiceofgudalur.com\n\n📎 Tip: download your signed petition PDF on the petition page and attach it here.`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  };

  // Restore a previously recorded submission so the docket stays visible when the modal reopens.
  useEffect(() => {
    if (isOpen && initialDocketRef && !submissionDone) {
      setDocketRef(initialDocketRef);
      setSubmissionDone(true);
    }
  }, [isOpen, initialDocketRef, submissionDone]);

  const content = EMAIL_PETITION_DATA[selectedLang] || EMAIL_PETITION_DATA.en;
  
  const toEmails = EMAIL_RECIPIENTS.to.map(r => r.email).join(',');
  const ccEmails = EMAIL_RECIPIENTS.cc.map(r => r.email).join(',');

  // Auto sender identity from the registered Citizen Card (Title / CC / Subject auto-filled).
  const senderName = profile?.name?.trim() || '';
  // Clean, professional petition signature block — no internal markers, no privacy flags.
  const senderLine = senderName
    ? `\n\nRespectfully submitted,\n${senderName}\nGudalur Resident ID: ${profile?.gudalurId || '—'}\n${profile?.localityName || 'Gudalur'}, The Nilgiris${profile?.pincode ? ` — PIN ${profile.pincode}` : ''}\nMobile: ${profile?.phone || '—'}`
    : '';
  
  const fullBody = `${content.salutation}\n\n${content.body}\n\n${content.signoff}${senderLine}`;

  // The complete, clipboard-ready copy of the petition email (used as a safety net and rescue).
  const fullEmail = `To: ${toEmails}\nCC: ${ccEmails}\nSubject: ${content.subject}\n\n${fullBody}`;

  // ONE STANDARD, DETERMINISTIC: the Gmail Web composer. It works identically on
  // every phone, tablet and desktop with zero OS configuration, carries the FULL
  // petition body (no mailto length caps), and every recipient is pre-filled.
  // The complete email ALSO rides on the clipboard so users of any other mail
  // app can simply Paste it.

  // Gmail Web rescue (used ONLY when the default mail app could not be opened).
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${toEmails.split(',').map(encodeURIComponent).join(',')}&cc=${ccEmails.split(',').map(encodeURIComponent).join(',')}&su=${encodeURIComponent(content.subject)}&body=${encodeURIComponent(fullBody)}`;

  const handleCopy = async (text: string, type: 'subject' | 'body' | 'all' | 'recipients') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'subject') {
        setCopiedSubject(true);
        setTimeout(() => setCopiedSubject(false), 2000);
      } else if (type === 'body') {
        setCopiedBody(true);
        setTimeout(() => setCopiedBody(false), 2000);
      } else if (type === 'all') {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      } else if (type === 'recipients') {
        setCopiedRecipients(true);
        setTimeout(() => setCopiedRecipients(false), 2000);
      }
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy text.');
    }
  };

    /** Step 1 — ONE STANDARD hand-off: open the Gmail composer (works on every device). */
  const handleDirectSend = () => {
    // Full petition on the clipboard FIRST — works for any other mail app via paste.
    try { navigator.clipboard?.writeText(fullEmail); } catch { /* best-effort */ }

    // Open the Gmail composer synchronously, inside the user gesture.
    let opened = false;
    try {
      const win = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
      opened = !!win;
    } catch { opened = false; }

    setSendInitiated(true);
    setRescueOpen(false);
    if (opened) {
      toast.success('Gmail is open with the full petition pre-filled. Press SEND in Gmail, then tap the green record button here — that writes your official docket.', { icon: '✉️', duration: 9000 });
    } else {
      setRescueOpen(true);
      toast.error('The composer could not open (popup blocked). The full email is on your clipboard — allow popups and retry below.', { duration: 7000 });
    }
  };

  /** Step 2 — the resident confirms the email was actually sent; ONLY THEN is the ledger row
   *  written — and the citizen is taken straight to WhatsApp to grow the movement. */
  const handleConfirmSent = async () => {
    if (submissionDone || recording) return;
    const ref = await recordSubmission();
    const url = buildWhatsAppShareUrl(ref);
    setWaShareUrl(url);
    // Direct hand-off to WhatsApp immediately after recording (same interaction —
    // if the browser blocks it, the green button on the success panel is one tap away).
    try { window.open(url, '_blank', 'noopener,noreferrer'); } catch { /* button below */ }
  };

  /** Retry opening the Gmail composer (used when the first attempt was popup-blocked). */
  const handleOpenGmailFallback = () => {
    try { navigator.clipboard?.writeText(fullEmail); } catch { /* clipboard is the rescue */ }
    try {
      const win = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
      if (win) { setRescueOpen(false); setSendInitiated(true); }
    } catch { /* clipboard already holds the full email */ }
  };


  /**
   * Records a REAL official submission in the proof ledger (manifesto_submissions).
   * Fires automatically the moment the send action is triggered — the send action IS
   * the record. Returns an immutable docket ref used on the signed PDF as proof.
   */
  const recordSubmission = async () => {
    if (submissionDone || recording) return;
        setRecording(true);
    try {
      if (!isSupabaseConfigured()) {
        // Cloud ledger offline — local docket ref so the signed PDF still proves intent.
        const localRef = generateEmailRef();
        const localRec = {
          docket_ref: localRef,
          sender_name: profile?.name?.trim() || 'Gudalur Citizen',
          sender_phone: profile?.phone || '',
          gudalur_id: profile?.gudalurId,
          locality: profile?.localityName,
          to_emails: toEmails,
          cc_emails: ccEmails,
          subject: content.subject,
          lang: selectedLang,
          sent_at: Date.now(),
          synced: false,
        };
        try {
          const existing = JSON.parse(localStorage.getItem('og_pending_emails') || '[]');
          existing.push(localRec);
          localStorage.setItem('og_pending_emails', JSON.stringify(existing));
        } catch { /* best-effort */ }
        setDocketRef(localRef);
        setSubmissionDone(true);
        // NOTE: device-only records never unlock the PDF — only the official
        // cloud ledger docket does. A retry is offered in the footer.
        return;
      }
      const result = await db.addManifestoSubmission({
        senderName: profile?.name?.trim() || 'Gudalur Citizen',
        senderPhone: profile?.phone || '',
        gudalurId: profile?.gudalurId,
        locality: profile?.localityName,
        toEmails,
        ccEmails,
        subject: content.subject,
        lang: selectedLang,
      });
      if (result.error) {
        console.error('Email submission record error:', result.error);
        // Never lose the citizen's action: keep a local pending record with its own docket.
        const localRef = generateEmailRef();
        try {
          const existing = JSON.parse(localStorage.getItem('og_pending_emails') || '[]');
          existing.push({
            docket_ref: localRef,
            sender_name: profile?.name?.trim() || 'Gudalur Citizen',
            sender_phone: profile?.phone || '',
            gudalur_id: profile?.gudalurId,
            locality: profile?.localityName,
            to_emails: toEmails,
            cc_emails: ccEmails,
            subject: content.subject,
            lang: selectedLang,
            sent_at: Date.now(),
            synced: false,
          });
          localStorage.setItem('og_pending_emails', JSON.stringify(existing));
        } catch { /* best-effort */ }
        setDocketRef(localRef);
        setSubmissionDone(true);
        setSubmissionError(true);
        return localRef;
      }
      const ref = result.ref || '';
      setDocketRef(ref);
                          setSubmissionDone(true);
      onSubmissionRecorded?.(ref);
      setWaShareUrl(buildWhatsAppShareUrl(ref));
      toast.success(`Submission recorded in the official ledger — Docket ${ref}`, { icon: '🧾', duration: 6000 });
      return ref;
    } catch (err) {
      console.error('Email submission record flow error:', err);
      // Any unexpected failure still saves the citizen's action locally with its own docket.
      const localRef = generateEmailRef();
      try {
        const existing = JSON.parse(localStorage.getItem('og_pending_emails') || '[]');
        existing.push({
          docket_ref: localRef,
          sender_name: profile?.name?.trim() || 'Gudalur Citizen',
          sender_phone: profile?.phone || '',
          gudalur_id: profile?.gudalurId,
          locality: profile?.localityName,
          to_emails: toEmails,
          cc_emails: ccEmails,
          subject: content.subject,
          lang: selectedLang,
          sent_at: Date.now(),
          synced: false,
        });
        localStorage.setItem('og_pending_emails', JSON.stringify(existing));
      } catch { /* best-effort */ }
      setDocketRef(localRef);
      setSubmissionDone(true);
      setSubmissionError(true);
      return localRef;
    } finally {
      setRecording(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white p-5 sm:p-6 flex items-center justify-between shrink-0 border-b border-emerald-900/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-rose-600/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold uppercase tracking-wider">
                Official Citizen Representation
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-medium hidden sm:inline">
                CM Cell + NTCA + UN Bodies
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-serif font-black tracking-tight text-white flex items-center gap-2">
              <Mail className="text-emerald-400 shrink-0" size={20} />
              <span>Send Official Citizen Petition Email</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action & Language Selection Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Globe size={14} className="text-emerald-600" />
              Language:
            </span>
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-300 shadow-xs">
              {(['en', 'ta', 'ml', 'kn'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setSelectedLang(l)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                    selectedLang === l
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  )}
                >
                  {l === 'en' ? 'English' : l === 'ta' ? 'தமிழ்' : l === 'ml' ? 'മലയാളം' : 'ಕನ್ನಡ'}
                </button>
              ))}
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                'px-3 py-1 rounded-lg transition',
                activeTab === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Email Preview
            </button>
            <button
              onClick={() => setActiveTab('recipients')}
              className={cn(
                'px-3 py-1 rounded-lg transition flex items-center gap-1',
                activeTab === 'recipients' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <span>Recipients</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-[10px] font-bold">10</span>
            </button>
          </div>

        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 text-xs sm:text-sm">
          
          {activeTab === 'preview' ? (
            <div className="space-y-4">
              
              {/* Recipients Quick Bar */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">TO (2):</span>
                    <span className="font-mono text-slate-800 font-semibold">{toEmails}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(`${toEmails}\nCC: ${ccEmails}`, 'recipients')}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 text-[11px]"
                  >
                    {copiedRecipients ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedRecipients ? 'Copied' : 'Copy All Emails'}</span>
                  </button>
                </div>
                <div className="text-slate-500 text-[11px] flex flex-wrap gap-1 items-center">
                  <span className="font-bold uppercase tracking-wider text-[10px]">CC (8):</span>
                  <span className="font-mono text-slate-700 truncate max-w-full">
                    ms-ntca@nic.in, ig-ntca@nic.in, collrnlg@tn.nic.in, mlagudalur@tn.gov.in, tnfwccb@gmail.com, info@iucn.org, unep-news@un.org, ohchr-info@un.org
                  </span>
                </div>
              </div>

              {/* Subject Field */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Subject Line
                  </span>
                  <button
                    onClick={() => handleCopy(content.subject, 'subject')}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px] flex items-center gap-1"
                  >
                    {copiedSubject ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedSubject ? 'Copied' : 'Copy Subject'}</span>
                  </button>
                </div>
                <p className="font-serif font-bold text-slate-900 text-sm sm:text-base leading-snug">
                  {content.subject}
                </p>
              </div>

              {/* Email Content Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Message Body ({selectedLang.toUpperCase()})
                  </span>
                  <button
                    onClick={() => handleCopy(fullBody, 'body')}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px] flex items-center gap-1"
                  >
                    {copiedBody ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedBody ? 'Copied' : 'Copy Body'}</span>
                  </button>
                </div>

                <div className="whitespace-pre-line text-slate-700 leading-relaxed font-sans text-xs sm:text-sm font-normal">
                  {fullBody}
                </div>
              </div>

            </div>
          ) : (
            /* Detailed Recipients List */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-bold text-slate-900 text-sm sm:text-base">
                    Official Representation Roster
                  </h4>
                  <p className="text-xs text-slate-500">
                    All petitions are automatically addressed to key State Executive authorities, National Wildlife regulators, and UN bodies.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(`${toEmails}\nCC: ${ccEmails}`, 'recipients')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5"
                >
                  {copiedRecipients ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>Copy All Addresses</span>
                </button>
              </div>

              <div className="space-y-3">
                <h5 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Primary Recipients (TO)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EMAIL_RECIPIENTS.to.map((r, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
                          Primary
                        </span>
                        <Building size={14} className="text-emerald-700" />
                      </div>
                      <p className="font-bold text-slate-900 text-xs">{r.name}</p>
                      <p className="font-mono text-[11px] text-emerald-800 font-semibold">{r.email}</p>
                      <p className="text-[10px] text-slate-500">{r.role}</p>
                    </div>
                  ))}
                </div>

                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider pt-2">
                  Carbon Copy Recipients (CC)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EMAIL_RECIPIENTS.cc.map((r, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                          r.category === 'cc_national' ? "bg-amber-100 text-amber-800" :
                          r.category === 'cc_global' ? "bg-blue-100 text-blue-800" :
                          "bg-slate-200 text-slate-700"
                        )}>
                          {r.category === 'cc_national' ? 'National NTCA' : r.category === 'cc_global' ? 'Global Body' : 'State / District'}
                        </span>
                        <ShieldCheck size={14} className="text-slate-400" />
                      </div>
                      <p className="font-bold text-slate-900 text-xs">{r.name}</p>
                      <p className="font-mono text-[11px] text-slate-800 font-medium">{r.email}</p>
                      <p className="text-[10px] text-slate-500">{r.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions — Step 1: open composer · Step 2: record AFTER the email is sent */}
        <div className="bg-slate-50 border-t border-slate-200 px-3 py-2.5 flex flex-col gap-2 shrink-0">
          {recording && (
            <div className="rounded-2xl border border-slate-300 bg-white p-2.5 text-center">
              <p className="text-[11px] font-black text-slate-700">Recording your official submission…</p>
            </div>
          )}

          {!submissionDone ? (
            <>
              <button
                onClick={handleDirectSend}
                title="Opens the Gmail composer with every recipient, the subject and the full petition pre-filled"
                className="w-full px-3 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg"
              >
                <Send size={14} />
                <span>{sendInitiated ? 'Open the Email Composer Again' : 'Open Email Composer — Petition Pre-filled'}</span>
              </button>
              {sendInitiated && (
                <button
                  onClick={handleConfirmSent}
                  disabled={recording}
                  className="w-full px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg disabled:opacity-60"
                >
                  <CheckCircle2 size={14} />
                  <span>{recording ? 'Recording…' : 'I have sent the email — record my submission'}</span>
                </button>
              )}
              <p className="text-center text-[9px] text-slate-500">
                Recipients, subject and full petition are pre-filled — press SEND in the composer, then record above to unlock your PDF. The full email is also on your clipboard for any other mail app.
              </p>
            </>
          ) : (
            <div className={`rounded-2xl border p-3 text-center ${submissionError ? 'border-amber-300 bg-amber-50/90' : 'border-emerald-300 bg-emerald-50/90'}`}>
              <CheckCircle2 size={16} className={`inline mr-1 ${submissionError ? 'text-amber-600' : 'text-emerald-600'}`} />
              <span className={`text-[11px] font-black ${submissionError ? 'text-amber-900' : 'text-emerald-900'}`}>
                {submissionError ? 'Saved on this device only — the official ledger could not be reached.' : 'Official submission recorded as proof.'}
              </span>
              <span className="block text-[10px] font-mono font-bold text-slate-700 mt-0.5">Docket Ref: {docketRef}</span>
              {submissionError ? (
                <>
                  <span className="block text-[9px] text-amber-700 mt-0.5">Your PDF unlocks from the official ledger — retry once connectivity returns.</span>
                  <button
                    onClick={() => { setSubmissionDone(false); setSubmissionError(false); setDocketRef(null); recordSubmission(); }}
                    className="mt-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold text-[10px] transition"
                  >
                    Retry recording now
                  </button>
                </>
              ) : (
                <>
                  <span className="block text-[9px] text-emerald-700 mt-0.5">This docket is printed on your signed petition PDF — download it from the petition page.</span>
                  {waShareUrl && (
                    <button
                      onClick={() => { try { window.open(waShareUrl, '_blank', 'noopener,noreferrer'); } catch { /* retry anytime */ } }}
                      className="mt-2 w-full px-3 py-2 rounded-lg bg-[#25D366] hover:bg-[#1fb955] text-white font-black text-[11px] transition shadow"
                    >
                      📤 Share your action on WhatsApp
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {rescueOpen && !submissionDone && (
            <button
              onClick={handleOpenGmailFallback}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] transition"
            >
              Composer did not open? Try again (email is on your clipboard)
            </button>
          )}
        </div>

      </motion.div>
    </div>
  );
};
