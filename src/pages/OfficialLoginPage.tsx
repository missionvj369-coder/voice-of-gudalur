import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export const OfficialLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const resetToken = params.get('reset') || '';
  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [mode, setMode] = useState<'login'|'forgot'|'reset'>(resetToken?'reset':'login');

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (!email.includes('@') || !password) return setErr('Enter email and password');
    setBusy(true);
    try { await authApi.officialLogin({ email: email.trim().toLowerCase(), password }); navigate('/officials'); }
    catch (e: any) { if (e?.message?.includes('Password not set')) navigate(`/official/set-password?email=${encodeURIComponent(email)}`); else setErr(e?.message || 'Login failed'); }
    finally { setBusy(false); }
  };
  const forgot = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); if (!email.includes('@')) return setErr('Enter email');
    setBusy(true);
    try { const r = await authApi.officialForgotPassword({ email: email.trim().toLowerCase() }); if (r.resetToken) navigate(`/official/set-password?email=${encodeURIComponent(email)}&reset=${r.resetToken}`); else toast.success('Contact admin to reset.'); }
    catch (e: any) { setErr(e?.message || 'Failed'); } finally { setBusy(false); }
  };
  const setPw = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); if (password.length < 8) return setErr('Min 8 characters');
    setBusy(true);
    try { await authApi.officialSetPassword({ email: email.trim().toLowerCase(), password, resetToken }); navigate('/officials'); }
    catch (e: any) { setErr(e?.message || 'Failed'); } finally { setBusy(false); }
  };

  const inp = "w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-emerald-500";

  return (
    <div className="min-h-screen bg-[#1B5E20] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-emerald-500/10 items-center justify-center mb-4"><ShieldCheck className="w-8 h-8 text-emerald-500"/></div>
          <h1 className="text-xl font-black text-white">Government Official</h1>
          <p className="text-xs text-slate-400 mt-1">{mode==='login'?'Sign in':mode==='forgot'?'Reset password':'Set new password'}</p>
        </div>
        <div className="bg-[#2E7D32] rounded-2xl p-6 border border-[#AED581]/20 space-y-4">
          {mode==='login' && <form onSubmit={login} className="space-y-4">
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="official@dept.gov.in" className={inp}/>
            <div className="relative">
              <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className={`${inp} pr-12`}/>
              <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button>
            </div>
            {err && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={14}/>{err}</p>}
            <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-50">{busy?<span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <span className="flex items-center justify-center gap-2"><LogIn size={16}/>Sign In</span>}</button>
            <button type="button" onClick={()=>setMode('forgot')} className="w-full text-center text-xs text-slate-400 hover:text-white">Forgot password?</button>
          </form>}
          {mode==='forgot' && <form onSubmit={forgot} className="space-y-4">
            <p className="text-xs text-slate-400">Enter your email. Admin will reset your password.</p>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="official@dept.gov.in" className={inp}/>
            {err && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={14}/>{err}</p>}
            <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-50">{busy?'Sending...':'Request Reset'}</button>
            <button type="button" onClick={()=>setMode('login')} className="w-full text-center text-xs text-slate-400 hover:text-white">Back</button>
          </form>}
          {mode==='reset' && <form onSubmit={setPw} className="space-y-4">
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Confirm email" className={inp}/>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password (min 8 chars)" className={inp}/>
            {err && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={14}/>{err}</p>}
            <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-50">{busy?'Setting...':'Set Password & Login'}</button>
          </form>}
        </div>
      </div>
    </div>
  );
};

export default OfficialLoginPage;
