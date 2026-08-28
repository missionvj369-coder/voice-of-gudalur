import React, { useState } from 'react';
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
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLang?: Language;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  initialLang
}) => {
  const { lang: appLang } = useLanguage();
  const { profile } = useAuth();
  
  const [selectedLang, setSelectedLang] = useState<Language>(initialLang || appLang || 'en');
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedRecipients, setCopiedRecipients] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'recipients'>('preview');

  const content = EMAIL_PETITION_DATA[selectedLang] || EMAIL_PETITION_DATA.en;
  
  const toEmails = EMAIL_RECIPIENTS.to.map(r => r.email).join(',');
  const ccEmails = EMAIL_RECIPIENTS.cc.map(r => r.email).join(',');
  const toCsv = toEmails.split(',').map(encodeURIComponent).join(',');
  const ccCsv = ccEmails.split(',').map(encodeURIComponent).join(',');

  // Auto sender identity from the registered Citizen Card (Title / CC / Subject auto-filled).
  const senderName = profile?.name?.trim() || '';
  const senderLine = senderName
    ? `\n\n=== CITIZEN SENDER (PETITION IS ADDRESSED FROM) ===\n\nFull Name: ${senderName}\nGudalur Resident ID: ${profile?.gudalurId || 'Unregistered'}\nLocality: ${profile?.localityName || 'Gudalur'}\nContact (kept private): ${profile?.phone || '-'}\n=== END OF SENDER DETAILS ===`
    : '';
  
  const fullBody = `${content.salutation}\n\n${content.body}\n\n${content.signoff}${senderLine}`;

  // mailto: To/CC keep real commas so every recipient expands in the mail app.
  const mailtoUrl = `mailto:${toEmails}?cc=${ccEmails}&subject=${encodeURIComponent(content.subject)}&body=${encodeURIComponent(fullBody)}`;

  // Gmail Web Compose: recipients encoded per-address (commas preserved).
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${toCsv}&cc=${ccCsv}&su=${encodeURIComponent(content.subject)}&body=${encodeURIComponent(fullBody)}`;

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

  const handleDirectSend = () => {
    // Anchor-click is the most reliable cross-browser way to hand off to the OS mail handler.
    try {
      const a = document.createElement('a');
      a.href = mailtoUrl;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.location.href = mailtoUrl;
    }
    toast.success('Opening your default email app - To, CC, Subject and sender are pre-filled. If nothing opens, use Copy All Text + Gmail Web.', { icon: '\u2709\uFE0F' });
  };
  const handleOpenGmail = () => {
    window.open(gmailUrl, '_blank');
    toast.success('Opening Gmail Web composer...', {
      icon: '✉️'
    });
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

        {/* Footer Actions — compact row pinned below the scrollable email content */}
        <div className="bg-slate-50 border-t border-slate-200 px-3 py-2.5 flex flex-col gap-2 shrink-0">
          <div className="flex items-stretch gap-2 w-full">
            <button
              onClick={handleOpenGmail}
              title="Open this petition in the Gmail Web composer"
              className="flex-1 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition"
            >
              <ExternalLink size={12} />
              <span>Gmail Web</span>
            </button>

            <button
              onClick={handleDirectSend}
              title="Open your default email app with everything pre-filled"
              className="flex-1 px-2.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition"
            >
              <Send size={12} />
              <span>Launch Email App</span>
            </button>

            <button
              onClick={() => handleCopy(`Subject: ${content.subject}\n\nTo: ${toEmails}\nCC: ${ccEmails}\n\n${fullBody}`, 'all')}
              title="Copy the full email — subject, recipients and body"
              className="flex-1 px-2.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1.5 transition"
            >
              {copiedAll ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copiedAll ? 'Copied' : 'Copy All'}</span>
            </button>
          </div>

          <p className="text-center text-[9px] text-slate-500">
            To, CC, Subject and your registered sender details are pre-filled automatically — just review and press send.
          </p>
        </div>

      </motion.div>
    </div>
  );
};
