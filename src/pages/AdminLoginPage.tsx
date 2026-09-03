import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

/**
 * Hidden admin login page — only accessible at /admin.
 * Not linked from any navigation; must be typed directly.
 * Credentials: GDR 000000 / 18thDimension@369
 */
export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [gudalurId, setGudalurId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!gudalurId.trim() || !password) {
      setError('Enter your GDR ID and password');
      return;
    }
    setBusy(true);
    try {
      await authApi.adminLogin({ gudalurId: gudalurId.trim(), password });
      toast.success('Admin access granted');
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1B5E20] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 mb-4">
            <Shield className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-black text-white">Voice of Gudalur</h1>
          <p className="text-xs text-slate-400 mt-1">Admin Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#2E7D32] rounded-2xl p-6 border border-[#AED581]/20 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">GDR ID</label>
            <input
              type="text"
              value={gudalurId}
              onChange={(e) => setGudalurId(e.target.value.toUpperCase())}
              placeholder="GDR 000000"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition"
          >
            {busy ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={16} />
                <span>Login as Admin</span>
              </>
            )}
          </button>
        </form>

        <p className="text-[10px] text-slate-600 text-center mt-4">
          This page is not publicly accessible. Authorized personnel only.
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
