
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { CATEGORIES, AREAS } from '../constants';
import { ReportCategory } from '../types';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Send, AlertTriangle, Loader2 } from 'lucide-react';

const NewReport: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0] as ReportCategory,
    area: AREAS[0],
    lat: 11.5034, // Default Gudalur lat
    lng: 76.4925  // Default Gudalur lng
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const getMyLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData(p => ({
          ...p,
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }));
        toast.success('Location updated');
      }, () => {
        toast.error('Failed to get location. Using default.');
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      let photoUrl = '';
      if (image) {
        const storageRef = ref(storage, `reports/${Date.now()}_${image.name}`);
        const snapshot = await uploadBytes(storageRef, image);
        photoUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, 'reports'), {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        photoUrl,
        location: {
          lat: formData.lat,
          lng: formData.lng,
          address: formData.area
        },
        reporterId: user.uid,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      toast.success('Report submitted! Awaiting verification.');
      navigate('/reports');
    } catch (error: any) {
      console.error("Report error:", error);
      toast.error('Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Report Issue</h1>
        <p className="text-slate-500">Submit a verified report for community safety</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 p-4">
             <h2 className="flex items-center gap-2 font-bold text-slate-800">
               <AlertTriangle size={18} className="text-emerald-600" />
               Basic Information
             </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Short Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 py-3 px-4 text-slate-900 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                placeholder="e.g., Elephant sighted near O'Valley"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
               <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData(p => ({ ...p, category: e.target.value as ReportCategory }))}
                    className="w-full rounded-xl border border-slate-200 py-3 px-4 text-slate-900 outline-none appearance-none bg-white transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Area</label>
                  <select
                    value={formData.area}
                    onChange={e => setFormData(p => ({ ...p, area: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 py-3 px-4 text-slate-900 outline-none appearance-none bg-white transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                  >
                    {AREAS.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
              <textarea
                required
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-slate-200 py-3 px-4 text-slate-900 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                placeholder="Provide detailed information..."
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
           {/* Photo Section */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
             <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <h2 className="flex items-center gap-2 font-bold text-slate-800">
                <Camera size={18} className="text-emerald-600" />
                Upload Photo
              </h2>
            </div>
            <div className="p-6">
              <label className="group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-10 transition-colors hover:border-emerald-400 hover:bg-emerald-50/10">
                {preview ? (
                  <img src={preview} alt="Preview" className="h-40 w-full rounded-lg object-cover" />
                ) : (
                  <>
                    <Camera size={32} className="mb-2 text-slate-400 group-hover:text-emerald-600" />
                    <span className="text-sm font-medium text-slate-500 group-hover:text-emerald-700">Click to capture or upload</span>
                    <span className="mt-1 text-xs text-slate-400">JPG, PNG up to 5MB</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
          </div>

          {/* Location Section */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
             <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <h2 className="flex items-center gap-2 font-bold text-slate-800">
                <MapPin size={18} className="text-emerald-600" />
                Incident Location
              </h2>
            </div>
            <div className="p-6">
               <div className="mb-4 rounded-xl bg-slate-50 p-4 text-xs font-mono text-slate-600">
                  <p>Lat: {formData.lat.toFixed(4)}</p>
                  <p>Lng: {formData.lng.toFixed(4)}</p>
               </div>
               <button
                type="button"
                onClick={getMyLocation}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-3 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-100"
               >
                 <MapPin size={16} />
                 Use My Current Location
               </button>
               <p className="mt-4 text-[10px] text-slate-400 leading-relaxed">
                 GPS coordinates help our response team locate the issue precisely. Required for Emergency & Elephant alerts.
               </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-slate-900 py-5 text-lg font-bold text-white transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              Submit Report
              <Send size={20} />
            </>
          )}
        </button>

        <p className="px-4 text-center text-[10px] text-slate-400">
          By submitting, you confirm that this information is accurate to the best of your knowledge. False reporting may lead to account suspension.
        </p>
      </form>
    </div>
  );
};

export default NewReport;
