
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { AREAS } from '../constants';
import { Role } from '../types';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { User, Phone, MapPin, CheckCircle2 } from 'lucide-react';

interface ProfileProps {
  setupMode?: boolean;
}

const Profile: React.FC<ProfileProps> = ({ setupMode = false }) => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    area: AREAS[0],
    role: 'user' as Role,
    isBloodDonor: false,
    bloodGroup: 'A+'
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        phone: profile.phone,
        area: profile.area,
        role: profile.role,
        isBloodDonor: profile.isBloodDonor || false,
        bloodGroup: profile.bloodGroup || 'A+'
      });
    } else if (user) {
      setFormData(prev => ({ ...prev, name: user.displayName || '' }));
    }
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      if (setupMode) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          ...formData,
          isVerified: false,
          createdAt: Date.now()
        });
        toast.success('Profile setup complete!');
        await refreshProfile();
        navigate('/');
      } else {
        await updateDoc(doc(db, 'users', user.uid), {
          ...formData
        });
        toast.success('Profile updated!');
        await refreshProfile();
      }
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="h-32 bg-emerald-600 px-8 pt-8 text-white">
          <h1 className="text-2xl font-bold tracking-tight">
            {setupMode ? 'Set up your profile' : 'My Profile'}
          </h1>
          <p className="text-emerald-100 opacity-90">
            Professional identity for the Gudalur community
          </p>
        </div>

        <div className="relative -mt-12 px-8 pb-8">
          <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-white p-1 shadow-lg ring-4 ring-emerald-50">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="h-full w-full rounded-[1.25rem] object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-[1.25rem] bg-slate-100 text-slate-400">
                <User size={40} />
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Display Name</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Phone Number</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Phone size={18} />
                </div>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                  placeholder="+91 00000 00000"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">Used for official community security verification</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Primary Area</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <MapPin size={18} />
                </div>
                <select
                  value={formData.area}
                  onChange={e => setFormData(p => ({ ...p, area: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none appearance-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                >
                  {AREAS.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isBloodDonor}
                  onChange={e => setFormData(p => ({ ...p, isBloodDonor: e.target.checked }))}
                  className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-semibold text-slate-700">Available as Blood Donor</span>
              </label>
              
              {formData.isBloodDonor && (
                <div className="mt-4">
                  <label className="mb-2 block text-xs font-bold text-slate-500 uppercase">Blood Group</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={e => setFormData(p => ({ ...p, bloodGroup: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm outline-none"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {profile?.isVerified && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-emerald-700 border border-emerald-100">
                <CheckCircle2 size={20} />
                <span className="text-sm font-semibold">Verified Reporter Badge Active</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                setupMode ? 'Complete Setup' : 'Save Changes'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
