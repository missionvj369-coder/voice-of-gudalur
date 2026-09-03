import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, Users, Plus, Check, X, Key } from 'lucide-react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

interface Official { id: number; email: string; name: string; status: string; hasPassword: boolean; }

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'list' | 'add'>('list');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const r = await authApi.adminListOfficials(); setOfficials(r.officials || []); }
    catch (e: any) { if (e?.status === 401) { navigate('/admin'); return; } toast.error('Load failed'); }
    finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); if (!email.includes('@')) return toast.error('Invalid email');
    setBusy(true);
    try { const r = await authApi.adminAddOfficial({ email: email.trim(), name: name.trim() }); toast.success(r.message); setEmail(''); setName(''); load(); setTab('list'); }
    catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setBusy(false); }
  };
  const approve = async (id: number) => { try { await authApi.adminApproveOfficial(id); toast.success('Approved'); load(); } catch {} };
  const reject = async (id: number) => { if (!confirm('Remove?')) return; try { await authApi.adminRejectOfficial(id); load(); } catch {} };
  const resetPw = async (id: number) => { if (!confirm('Reset password?')) return; try { await authApi.adminResetOfficialPassword(id); toast.success('Password reset'); load(); } catch {} };
  const logout = async () => { try { await authApi.adminLogout(); } catch {} navigate('/admin'); };

  if (loading) return <div className="min-h-screen bg-[#1B5E20] flex items-center justify-center"><div className="h-8 w-8 border-2 border-[#AED581] border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-[#1B5E20] text-white">
      <header className="bg-[#2E7D32] border-b border-[#AED581]/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#AED581]"/><span className="font-bold">Admin Portal</span></div>
        <button onClick={logout} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><LogOut size={14}/>Logout</button>
      </header>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex gap-1 mb-4">
          <button onClick={()=>setTab('list')} className={`px-3 py-2 rounded-lg text-xs font-bold ${tab==='list'?'bg-amber-600':'bg-slate-800'}`}><Users size={12} className="inline mr-1"/>Officials</button>
          <button onClick={()=>setTab('add')} className={`px-3 py-2 rounded-lg text-xs font-bold ${tab==='add'?'bg-amber-600':'bg-slate-800'}`}><Plus size={12} className="inline mr-1"/>Add</button>
        </div>
        {tab==='list' && officials.map(o=>(
          <div key={o.id} className="bg-[#2E7D32] rounded-xl p-4 border border-[#AED581]/20 mb-2 flex items-center justify-between">
            <div><p className="font-bold">{o.name||o.email}</p><p className="text-xs text-slate-400">{o.email} · {o.status}</p></div>
            <div className="flex gap-1">
              {o.status==='PENDING' && <button onClick={()=>approve(o.id)} className="p-2 rounded bg-emerald-600/20 text-emerald-400"><Check size={14}/></button>}
              {o.status==='APPROVED' && <button onClick={()=>resetPw(o.id)} className="p-2 rounded bg-amber-600/20 text-amber-400"><Key size={14}/></button>}
              <button onClick={()=>reject(o.id)} className="p-2 rounded bg-red-600/20 text-red-400"><X size={14}/></button>
            </div>
          </div>
        ))}
        {tab==='list' && officials.length===0 && <p className="text-center text-slate-500 py-8">No officials yet.</p>}
        {tab==='add' && (
          <form onSubmit={add} className="bg-[#2E7D32] rounded-xl p-6 border border-[#AED581]/20 space-y-4">
            <p className="font-bold">Grant access to a government official</p>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="official@department.gov.in" className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-amber-500"/>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-amber-500"/>
            <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold text-sm disabled:opacity-50">{busy?'Adding...':'Grant Access'}</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
