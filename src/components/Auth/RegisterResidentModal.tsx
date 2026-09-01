import React, { useState, useRef } from 'react';
import { ShieldCheck, MapPin, Phone, Mail, User, Check, X, Compass, Loader2, IdCard, Copy, CheckCircle2, LogIn, QrCode, ScanLine, Keyboard, BadgeCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { GUDALUR_LOCALITIES } from '../../data/gudalurMasterData';
import { LoginResidentModal } from './LoginResidentModal';
import toast from 'react-hot-toast';
import type { UserProfile } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RegisterResidentModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { user, profile, registerResident, userCoords, acquireLiveLocation } = useAuth();
  const { lang, t } = useLanguage();

  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [localityId, setLocalityId] = useState(profile?.localityId || GUDALUR_LOCALITIES[0].id);
  const [localityText, setLocalityText] = useState(profile?.localityName || GUDALUR_LOCALITIES[0].name);
  const [customPlaceName, setCustomPlaceName] = useState(profile?.customPlaceName || '');
  const [pincode, setPincode] = useState(profile?.pincode || '643211');
  const [email, setEmail] = useState(profile?.email || '');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsCaptured, setGpsCaptured] = useState<boolean>(!!userCoords);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedProfile, setIssuedProfile] = useState<UserProfile | null>(null);
  const [idCopied, setIdCopied] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  // Step-based flow: Aadhaar first, then registration form
  const [step, setStep] = useState<'aadhaar' | 'register'>('aadhaar');

  /* ── Aadhaar verification (pyaadhaar) — scan the e-Aadhaar QR or enter the number ── */
  interface AadhaarResult {
    verified: boolean; method: 'qr' | 'number'; qr_type?: string;
    name?: string; dob?: string; gender?: string; last4?: string;
    referenceid?: string; address?: string; mobile_linked?: boolean | null;
  }
  const [aadhaarTab, setAadhaarTab] = useState<'qr' | 'number'>('qr');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarResult, setAadhaarResult] = useState<AadhaarResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<any>(null);

  const stopScanner = async () => {
    try { await scannerRef.current?.stop(); scannerRef.current?.clear(); } catch { /* already stopped */ }
    scannerRef.current = null;
    setScanning(false);
  };

  const verifyAadhaar = async (payload: { qrData?: string; aadhaarNumber?: string }) => {
    setVerifying(true);
    try {
      const res = await fetch('/api/aadhaar/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) throw new Error(data.error || 'Verification failed');
      setAadhaarResult(data);
      // Pre-fill the verified legal name (only if the resident hasn't typed one yet)
      if (data.method === 'qr' && data.name && !name.trim()) setName(data.name);
      toast.success(
        data.method === 'qr'
          ? `Aadhaar verified via QR: ${data.name} (••••${data.last4})`
          : `Aadhaar checksum verified (••••${data.last4})`
      );
    } catch (e: any) {
      toast.error(e.message || 'Aadhaar verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('aadhaar-qr-region', { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded: string) => {
          stopScanner();
          verifyAadhaar({ qrData: decoded });
        },
        () => { /* per-frame decode miss — ignore */ }
      );
      setScanning(true);
    } catch {
      toast.error('Camera unavailable or permission denied — use “Enter Aadhaar Number” instead');
      scannerRef.current = null;
      setScanning(false);
    }
  };

  const clearAadhaar = () => setAadhaarResult(null);

  if (showLogin) {
    return (
      <LoginResidentModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={onSuccess}
        onNeedRegister={() => setShowLogin(false)}
      />
    );
  }

  if (!isOpen) return null;

  const handleAcquireGps = async () => {
    setIsLocating(true);
    const coords = await acquireLiveLocation();
    setIsLocating(false);
    if (coords) {
      setGpsCaptured(true);
      toast.success(lang === 'ta' ? 'ஜிபிஎஸ் இருப்பிடம் பதிவு செய்யப்பட்டது!' : 'Live GPS location captured successfully!');
    } else {
      toast.error(lang === 'ta' ? 'இருப்பிட அனுமதி தேவை' : 'Please enable location permissions in your browser');
    }
  };

  const handleCopyId = () => {
    if (issuedProfile) {
      navigator.clipboard.writeText(
        `VOICE OF GUDALUR Resident ID: ${issuedProfile.gudalurId} | Phone: ${issuedProfile.phone} | Name: ${issuedProfile.name}`
      );
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2000);
      toast.success('Gudalur ID copied to clipboard!');
    }
  };

  // Locality combobox: type to filter the complete official Gudalur list, or add your own place below.
  const handleLocalityTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalityText(v);
    const lower = v.trim().toLowerCase();
    const match = GUDALUR_LOCALITIES.find((l) => l.name.toLowerCase() === lower);
    if (match) {
      setLocalityId(match.id);
      setPincode(match.pincode);
      setCustomPlaceName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(lang === 'ta' ? 'பெயரை உள்ளிடவும்' : 'Please enter your full name');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      toast.error(lang === 'ta' ? 'செல்லுபடியாகும் 10 இலக்க தொலைபேசி எண்ணை உள்ளிடவும்' : 'Please provide a valid 10-digit mobile number');
      return;
    }
    if (!pincode.trim() || pincode.trim().length !== 6) {
      toast.error(lang === 'ta' ? '6 இலக்க அஞ்சல் குறியீட்டை (Pincode) உள்ளிடவும்' : 'Please enter a valid 6-digit Pincode');
      return;
    }
    if (!aadhaarResult?.verified) {
      toast.error('Verify your Aadhaar first — scan the QR on your e-Aadhaar or enter the 12-digit number.', { duration: 5000 });
      return;
    }

    // If the resident typed a locality that isn't in the official list, save it as
    // their own estate / village / settlement so the record stays precise.
    let resolvedCustomPlace = customPlaceName.trim() || undefined;
    if (localityText.trim()) {
      const lower = localityText.trim().toLowerCase();
      if (!GUDALUR_LOCALITIES.some((l) => l.name.toLowerCase() === lower)) {
        resolvedCustomPlace = localityText.trim();
      }
    }

    setIsSubmitting(true);
    try {
      const registered = await registerResident({
        name: name.trim(),
        phone: phone.trim(),
        localityId,
        customPlaceName: resolvedCustomPlace,
        email: email.trim() || undefined,
        pincode: pincode.trim(),
        lat: userCoords?.lat,
        lng: userCoords?.lng,
        aadhaarVerified: true,
        aadhaarLast4: aadhaarResult.last4,
        aadhaarRef: aadhaarResult.method === 'qr' ? (aadhaarResult.referenceid || 'QR-VERIFIED') : 'CHKSUM-OK',
      });
      // Show the issued unique Gudalur ID on the success screen
      setIssuedProfile(registered);
    } catch (err: any) {
      console.error('Registration failed:', err);
      if (err?.code === 'DUPLICATE_PHONE' || /already registered/i.test(err?.message || '')) {
        toast.error(err.message, { duration: 6000 });
        setShowLogin(true);
      } else {
        toast.error(lang === 'ta' ? 'பதிவு செய்வதில் பிழை ஏற்பட்டது' : 'Failed to save resident registration');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ============ SUCCESS SCREEN — the issued unique Gudalur ID ============ */
  if (issuedProfile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-center space-y-5">
          <div className="mx-auto p-3 w-fit rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black font-serif text-slate-900">
              {lang === 'ta' ? 'பதிவு வெற்றி!' : 'Registration Successful!'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {lang === 'ta'
                ? 'உங்கள் தனிப்பட்ட கூடலூர் ஐடி உருவாக்கி சேமிக்கப்பட்டது. இதை சேமித்து வைக்கவும்.'
                : 'Your unique Gudalur ID was generated and saved. Keep it safe — login anytime with this ID + your phone number. No password needed.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Your Gudalur ID Number</p>
            <p className="text-2xl font-mono font-black tracking-wider">{issuedProfile.gudalurId}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-300 font-mono">
              <span>📞 {issuedProfile.phone}</span>
              <span>👤 {issuedProfile.name}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyId}
            className="w-full py-3 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 font-bold text-sm transition flex items-center justify-center gap-2"
          >
            {idCopied ? <Check size={18} className="text-emerald-600" /> : <Copy size={16} />}
            <span>{idCopied ? (lang === 'ta' ? 'நகலெடுக்கப்பட்டது!' : 'ID Copied!') : (lang === 'ta' ? 'ஐடியை நகலெடுக்க' : 'Copy & Save My ID')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onSuccess) onSuccess();
              onClose();
            }}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition"
          >
            {lang === 'ta' ? 'தொடரவும்' : 'Continue to My Resident Card'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-slate-900">
              {lang === 'ta' ? 'கூடலூர் குடிமக்கள் பதிவு' : 'Gudalur Resident Registration'}
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'ta'
                ? 'வனவிலங்கு பாதுகாப்பு எச்சரிக்கை & அதிகாரப்பூர்வ ஆதரவு அட்டை'
                : 'Verified local network for wildlife safety & civic demands'}
            </p>
          </div>
        </div>

        {/* Phone-only auth notice */}
        <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
          <IdCard size={20} className="text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900">
            <p className="font-bold">
              {lang === 'ta' ? 'தொலைபேசி எண் மட்டுமே — கடவுச்சொல் இல்லை' : 'Phone number only — no password'}
            </p>
            <p className="text-emerald-700 mt-0.5">
              {lang === 'ta'
                ? 'பதிவு செய்தவுடன் ஒரு தனிப்பட்ட கூடலூர் ஐடி (எ.கா. GDR000001) உருவாக்கப்பட்டு சேமிக்கப்படும். அந்த ஐடி அல்லது தொலைபேசி எண் மூலம் எப்போது வேண்டுமானாலும் உள்நுழையலாம்.'
                : 'On registration a unique Gudalur ID (e.g. GDR000001) is generated, saved to the official ledger and shown to you. Login anytime with that ID OR your phone number.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User size={14} className="text-emerald-600" />
              <span>{lang === 'ta' ? 'முழுப் பெயர் *' : 'Full Resident Name *'}</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. K. Sivakumar / Mary Joseph"
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition"
            />
          </div>

          {/* Mobile Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Phone size={14} className="text-emerald-600" />
              <span>{lang === 'ta' ? 'மொபைல் எண் (அவசர எச்சரிக்கைக்கு) *' : 'Mobile Number (For Emergency Alerts) *'}</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9488210421"
              maxLength={12}
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition"
            />
          </div>

          {/* Email Address (optional — used on the petition PDF; stored in the ledger) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Mail size={14} className="text-emerald-600" />
              <span>{lang === 'ta' ? 'மின்னஞ்சல் (விருப்பம்)' : 'Email Address (Optional)'}</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Printed on your signed petition PDF as your official contact.
            </p>
          </div>

          {/* ── AADHAAR VERIFICATION (pyaadhaar) — mandatory identity proof ── */}
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Aadhaar Verification * <span className="font-normal text-slate-400">(pyaadhaar · offline &amp; private)</span></span>
              </label>
              {aadhaarResult?.verified && (
                <button type="button" onClick={clearAadhaar} className="text-[10px] font-bold text-slate-400 hover:text-red-500 underline">
                  Reset
                </button>
              )}
            </div>

            {aadhaarResult?.verified ? (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-emerald-300">
                <BadgeCheck size={22} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1 min-w-0">
                  <p className="font-black text-emerald-800">
                    {aadhaarResult.method === 'qr' ? 'Verified via e-Aadhaar QR' : 'Verified via UIDAI checksum'}
                    {aadhaarResult.qr_type === 'old-qr' && ' (legacy QR)'}
                  </p>
                  <p className="font-mono font-bold text-slate-900">•••• {aadhaarResult.last4}</p>
                  {aadhaarResult.method === 'qr' && (
                    <>
                      <p className="text-slate-700"><span className="font-bold">Name:</span> {aadhaarResult.name} {aadhaarResult.dob && <span className="text-slate-400">· {aadhaarResult.dob}</span>}</p>
                      {aadhaarResult.address && <p className="text-slate-500 truncate"><span className="font-bold">Address:</span> {aadhaarResult.address}</p>}
                    </>
                  )}
                  <p className="text-[10px] text-slate-400">Full Aadhaar number is never stored — only the masked last 4 digits.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-1 rounded-xl bg-white border border-slate-200 p-1">
                  <button
                    type="button"
                    onClick={() => setAadhaarTab('qr')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-black transition ${aadhaarTab === 'qr' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    <ScanLine size={14} /> Scan Aadhaar QR
                  </button>
                  <button
                    type="button"
                    onClick={() => { stopScanner(); setAadhaarTab('number'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-black transition ${aadhaarTab === 'number' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    <Keyboard size={14} /> Enter Number
                  </button>
                </div>

                {aadhaarTab === 'qr' ? (
                  <div className="space-y-2">
                    <div id="aadhaar-qr-region" className={`rounded-xl overflow-hidden bg-slate-900 ${scanning ? 'w-full' : 'hidden'}`} />
                    <button
                      type="button"
                      onClick={scanning ? stopScanner : startScanner}
                      disabled={verifying}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black transition"
                    >
                      {verifying ? <Loader2 size={15} className="animate-spin" /> : <QrCode size={15} />}
                      {scanning ? 'Stop Camera' : verifying ? 'Verifying…' : 'Open Camera & Scan the QR on e-Aadhaar'}
                    </button>
{/* AADHAAR-PART2 */}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={aadhaarNumber}
                      onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      placeholder="12-digit Aadhaar number"
                      maxLength={12}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm font-mono tracking-widest outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (aadhaarNumber.length !== 12) { toast.error('Enter the full 12-digit Aadhaar number'); return; }
                        verifyAadhaar({ aadhaarNumber });
                      }}
                      disabled={verifying || aadhaarNumber.length !== 12}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black transition"
                    >
                      {verifying ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                      {verifying ? 'Verifying…' : 'Verify Number'}
                    </button>
{/* AADHAAR-PART3 */}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Locality & Pincode Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-600" />
                <span>{lang === 'ta' ? 'பகுதி / ஊர் *' : 'Locality / Area *'}</span>
              </label>
              <input
                list="gudalur-locality-list"
                value={localityText}
                onChange={handleLocalityTextChange}
                placeholder="Type or select your locality (e.g. New Bazar, Devala, O'Valley…)"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 text-xs font-medium bg-white outline-none transition"
              />
              <datalist id="gudalur-locality-list">
                {GUDALUR_LOCALITIES.map((loc) => (
                  <option key={loc.id} value={loc.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {lang === 'ta' ? 'அஞ்சல் குறியீடு (Pincode) *' : 'Pincode (Postal Code) *'}
              </label>
              <input
                type="text"
                required
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="643211"
                maxLength={6}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 text-sm outline-none transition font-mono"
              />
            </div>
          </div>

          {/* Option to specify custom estate / village name if not in main list */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {lang === 'ta'
                ? 'குறிப்பிட்ட எஸ்டேட் / கிராமம் / தெரு பெயர் (பட்டியலில் இல்லை எனில்)'
                : 'Specific Estate / Village / Hamlet (If not listed above)'}
            </label>
            <input
              type="text"
              value={customPlaceName}
              onChange={(e) => setCustomPlaceName(e.target.value)}
              placeholder="e.g. Seaforth Division 2 / Padanthorai Colony / Upper Glenrock"
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 text-sm outline-none transition"
            />
          </div>

          {/* Live GPS Location Capture */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${gpsCaptured ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                <Compass size={20} className={isLocating ? 'animate-spin' : ''} />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-800">
                  {gpsCaptured
                    ? (lang === 'ta' ? 'துல்லிய ஜிபிஎஸ் பதிவு செய்யப்பட்டது' : 'Live GPS Coordinates Tagged')
                    : (lang === 'ta' ? 'நேரடி ஜிபிஎஸ் இருப்பிடம்' : 'Live GPS Proximity Tag')}
                </p>
                <p className="text-slate-500">
                  {userCoords
                    ? `${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}`
                    : (lang === 'ta' ? 'வனவிலங்கு தூரத்தை கணக்கிட உதவுகிறது' : 'Calculates real distance to animal sightings')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAcquireGps}
              disabled={isLocating}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:border-emerald-600 text-slate-700 hover:text-emerald-700 text-xs font-bold rounded-xl transition shadow-2xs"
            >
              {isLocating ? <Loader2 size={14} className="animate-spin" /> : (lang === 'ta' ? 'இருப்பிடம் புதுப்பி' : 'Tag GPS')}
            </button>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Check size={18} />
                  <span>
                    {profile
                      ? (lang === 'ta' ? 'விவரங்களை புதுப்பிக்கவும்' : 'Update Resident Citizen Card')
                      : (lang === 'ta' ? 'குடிமக்கள் அட்டையை பதிவு செய்' : 'Complete Verified Registration')}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Already registered? Passwordless login */}
          <button
            type="button"
            onClick={() => setShowLogin(true)}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            <LogIn size={13} />
            <span>
              {lang === 'ta'
                ? 'ஏற்கனவே ஐடி உள்ளதா? தொலைபேசி + ஐடி மூலம் உள்நுழைக'
                : 'Already have an ID? Login with Phone + ID'}
            </span>
          </button>

        </form>

      </div>
    </div>
  );
};
