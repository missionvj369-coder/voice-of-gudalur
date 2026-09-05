import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, LogOut, Users, Image as ImageIcon, Video, Trash2, PenLine,
  Upload, Download, Share2, FileText, Hash, CheckCircle2, Loader2, Link2,
} from 'lucide-react';
import { authApi, mediaApi, type MediaItem } from '../services/api';
import toast from 'react-hot-toast';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'media' | 'petitions'>('overview');
  const [stats, setStats] = useState<{ totalUsers: number; totalSigns: number; latestBatch: number; latestHash: string | null } | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploadKind, setUploadKind] = useState<'poster' | 'video'>('poster');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [signs, setSigns] = useState<Array<{ hash: string; name: string; village: string; batchNo: number; signedAt: string; verifyUrl: string }>>([]);

  /** Silent refresh — stats + hash ledger (no loading spinner). */
  const refreshData = useCallback(async () => {
    const [s, signsData] = await Promise.all([
      authApi.adminStats(),
      authApi.adminSigns(),
    ]);
    setStats(s);
    setSigns((signsData as any).signs || []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [, m] = await Promise.all([
        refreshData(),
        mediaApi.list(),
      ]);
      setMedia(m as MediaItem[]);
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) { navigate('/admin'); return; }
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [navigate, refreshData]);

  useEffect(() => { load(); }, [load]);

  /** LIVE: silent refresh every 15s — stats + hash-ledger update in place. */
  useEffect(() => {
    const t = setInterval(() => { void refreshData().catch(() => {}); }, 15000);
    return () => clearInterval(t);
  }, [refreshData]);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return toast.error('Add a title');
    if (!uploadFile) return toast.error('Choose a file');
    setUploading(true);
    try {
      const r = await mediaApi.upload({
        kind: uploadKind,
        title: uploadTitle.trim(),
        description: uploadDesc.trim() || undefined,
        file: uploadFile,
      });
      toast.success(r.message || 'Published');
      setUploadTitle(''); setUploadDesc(''); setUploadFile(null);
      setMedia(await mediaApi.list());
    } catch (err: any) {
      toast.error(err?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

    const removeMedia = async (id: string) => {
    if (!confirm('Remove this media from the frontend?')) return;
    setDeletingId(id);
    try {
      await mediaApi.remove(id);
      setMedia((list) => list.filter((m) => m.id !== id));
      toast.success('Removed');
    } catch {
      toast.error('Remove failed');
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (item: MediaItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDesc(item.description || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDesc('');
  };

  const saveEdit = async (id: string) => {
    if (!editTitle.trim()) return toast.error('Title cannot be empty');
    setSavingId(id);
    try {
      const r = await mediaApi.update(id, { title: editTitle.trim(), description: editDesc.trim() || undefined });
      setMedia((list) => list.map((m) => m.id === id ? { ...m, title: editTitle.trim(), description: editDesc.trim() || null } : m));
      toast.success(r.message || 'Updated');
      cancelEdit();
    } catch (err: any) {
      toast.error(err?.error || 'Update failed');
    } finally {
      setSavingId(null);
    }
  };

  const logout = async () => {
    try { await authApi.adminLogout(); } catch { /* ignore */ }
    navigate('/admin');
  };
// ─── Petition ledger: download + share ──────────────────────────────
  const buildCsv = () => {
    const header = 'Signature Hash,Batch,Name,Place,Signed On,Verify URL';
    const rows = signs.map((s) =>
      [
        s.hash,
        s.batchNo,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(s.village || '').replace(/"/g, '""')}"`,
        new Date(s.signedAt).toISOString(),
        `${window.location.origin}${s.verifyUrl}`,
      ].join(','),
    );
    return [header, ...rows].join('\n');
  };

  const downloadLedger = () => {
    if (!signs.length) return toast.error('No signatures to download');
    const blob = new Blob([buildCsv()], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vog-petition-ledger-${stats ? `batch-${stats.latestBatch}` : 'all'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    toast.success('Petition ledger downloaded');
  };

  const shareLedger = () => {
    if (!signs.length) return;
    const text =
      `📜 *VOICE OF GUDALUR — Petition Signature Ledger*\n` +
      `${stats ? `Total verified signs: *${stats.totalSigns}*\n` : ''}` +
      `${stats ? `Latest batch: *#${stats.latestBatch}*\n` : ''}` +
      `${stats?.latestHash ? `Latest hash: \`${stats.latestHash}\`\n` : ''}` +
      `Verify any signature at ${window.location.origin}/verify-sign\n\n` +
      signs.slice(0, 25).map((s) => `• ${s.hash} — ${s.name} (${s.village || 'Gudalur'})`).join('\n');
    if (navigator.share) {
      navigator.share({ title: 'Voice of Gudalur Petition Ledger', text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    }
  };

  if (loading) return <div className="min-h-screen bg-[#1B5E20] flex items-center justify-center"><div className="h-8 w-8 border-2 border-[#AED581] border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-[#1B5E20] text-white">
      <header className="bg-[#2E7D32] border-b border-[#AED581]/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#AED581]"/><span className="font-bold">Admin Portal</span></div>
        <button onClick={logout} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><LogOut size={14}/>Logout</button>
      </header>

      <div className="max-w-5xl mx-auto p-4">
        <div className="flex gap-1 mb-4 flex-wrap">
          <button onClick={()=>setTab('overview')} className={`px-3 py-2 rounded-lg text-xs font-bold ${tab==='overview'?'bg-amber-600':'bg-slate-800'}`}><Users size={12} className="inline mr-1"/>Overview</button>
          <button onClick={()=>setTab('petitions')} className={`px-3 py-2 rounded-lg text-xs font-bold ${tab==='petitions'?'bg-amber-600':'bg-slate-800'}`}><FileText size={12} className="inline mr-1"/>Petitions</button>
          <button onClick={()=>setTab('media')} className={`px-3 py-2 rounded-lg text-xs font-bold ${tab==='media'?'bg-amber-600':'bg-slate-800'}`}><ImageIcon size={12} className="inline mr-1"/>Movement Media</button>
        </div>

        {/* ── Overview: stats ── */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-[#2E7D32] rounded-2xl p-5 border border-[#AED581]/20">
                <p className="text-3xl font-black text-[#AED581]">{stats?.totalUsers ?? 0}</p>
                <p className="text-xs text-slate-300 mt-1">Total Residents Registered</p>
              </div>
              <div className="bg-[#2E7D32] rounded-2xl p-5 border border-[#AED581]/20">
                <p className="text-3xl font-black text-[#AED581]">{stats?.totalSigns ?? 0}</p>
                <p className="text-xs text-slate-300 mt-1">Petitions Signed</p>
              </div>
              <div className="bg-[#2E7D32] rounded-2xl p-5 border border-[#AED581]/20 col-span-2 md:col-span-1">
                <p className="text-sm font-black text-[#AED581]">Batch #{stats?.latestBatch ?? '—'}</p>
                <p className="text-[10px] text-slate-400 mt-1 break-all font-mono flex items-center gap-1">
                  <Hash size={10} className="shrink-0" /> {stats?.latestHash ?? 'No signatures yet'}
                </p>
              </div>
            </div>

            {/* LIVE — every hash under the live count */}
            <div className="rounded-2xl bg-[#2E7D32] border border-[#AED581]/20 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-[#1B5E20]">
                <p className="text-xs font-black text-[#AED581] flex items-center gap-2">
                  <Hash size={13} /> Live Signature Hashes
                </p>
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span className="text-[10px] font-bold text-emerald-300">LIVE · {signs.length}</span>
                </span>
              </div>
              {signs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-5">No signatures yet — hashes appear here live.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-[#AED581]/10">
                  {signs.slice(0, 30).map((s) => (
                    <a
                      key={s.hash}
                      href={s.verifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-5 py-2 hover:bg-[#1B5E20]/60 transition"
                    >
                      <Hash size={11} className="text-[#AED581] shrink-0" />
                      <span className="flex-1 min-w-0 font-mono text-[10px] font-bold text-white truncate">{s.hash}</span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[40%]">{s.name} · {s.village || 'Gudalur'}</span>
                      <span className="text-[9px] text-slate-500 shrink-0">B#{s.batchNo}</span>
                    </a>
                  ))}
                </div>
              )}
              <div className="px-5 py-2 bg-[#1B5E20] flex items-center justify-between">
                <span className="text-[9px] text-slate-500">Auto-refreshes every 15s · tap a hash to verify</span>
                <button onClick={() => setTab('petitions')} className="text-[9px] font-bold text-[#AED581] hover:text-white">View full ledger →</button>
              </div>
            </div>

            <div className="rounded-2xl bg-[#2E7D32] p-5 border border-[#AED581]/20 text-sm">
              <p className="font-bold mb-2 text-[#AED581]">Petition ledger — every signature is a hash</p>
              <p className="text-slate-300 text-xs leading-relaxed">
                Every petition sign is recorded as a unique machine-verifiable hash on the public docket ledger.
                Download the complete ledger as CSV or share it instantly.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <button onClick={downloadLedger} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-500 transition">
                  <Download size={14}/> Download CSV
                </button>
                <button onClick={shareLedger} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:opacity-90 transition">
                  <Share2 size={14}/> Share Ledger
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-[#2E7D32] p-5 border border-[#AED581]/20 text-sm">
              <p className="font-bold mb-2 text-[#AED581]">Movement media</p>
              <p className="text-slate-300 text-xs leading-relaxed">
                Posters & videos published here appear in the "Support the Movement" section on the public
                homepage, ready to share to Instagram, Facebook, WhatsApp, Snapchat and ShareChat.
              </p>
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-300"><ImageIcon size={14} className="text-[#AED581]"/> {media.filter((m)=>m.kind==='poster').length} posters</div>
                <div className="flex items-center gap-1.5 text-xs text-slate-300"><Video size={14} className="text-[#AED581]"/> {media.filter((m)=>m.kind==='video').length} videos</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Petitions: hash-ledger ── */}
        {tab === 'petitions' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#AED581]">All Petitions Signed ({signs.length})</p>
              <div className="flex gap-2">
                <button onClick={downloadLedger} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-500"><Download size={13}/>Download CSV</button>
                <button onClick={shareLedger} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366] text-white text-xs font-bold hover:opacity-90"><Share2 size={13}/>Share</button>
              </div>
            </div>
            {signs.length === 0 ? (
              <p className="text-center text-slate-500 py-10">No petition signatures yet.</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {signs.map((s) => (
                  <div key={s.hash} className="bg-[#2E7D32] rounded-xl p-3.5 border border-[#AED581]/15 flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[11px] font-bold text-[#AED581] break-all flex items-center gap-1.5">
                        <Hash size={11} className="shrink-0"/> {s.hash}
                      </p>
                      <p className="text-xs text-slate-300 mt-0.5">{s.name} · {s.village || 'Gudalur'} · Batch #{s.batchNo}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{new Date(s.signedAt).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <a
                        href={s.verifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-[#1B5E20]/60 text-emerald-300 hover:text-emerald-100"
                        title="Verify signature"
                      >
                        <CheckCircle2 size={14}/>
                      </a>
                      <button
                        onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}${s.verifyUrl}`); toast.success('Verify link copied'); }}
                        className="p-2 rounded-lg bg-[#1B5E20]/60 text-slate-300 hover:text-white"
                        title="Copy verify link"
                      >
                        <Link2 size={14}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Media: upload + manage ── */}
        {tab === 'media' && (
          <div className="space-y-4">
            <form onSubmit={upload} className="bg-[#2E7D32] rounded-2xl p-5 border border-[#AED581]/20 space-y-4">
              <p className="font-bold text-[#AED581]">Publish poster / video</p>
              <div className="flex gap-2">
                <button type="button" onClick={()=>setUploadKind('poster')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${uploadKind==='poster'?'bg-amber-600 border-amber-500 text-white':'bg-slate-800 border-slate-700 text-slate-300'}`}>
                  <ImageIcon size={14} className="inline mr-1"/> Poster
                </button>
                <button type="button" onClick={()=>setUploadKind('video')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${uploadKind==='video'?'bg-amber-600 border-amber-500 text-white':'bg-slate-800 border-slate-700 text-slate-300'}`}>
                  <Video size={14} className="inline mr-1"/> Video
                </button>
              </div>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e)=>setUploadTitle(e.target.value)}
                placeholder="Title (shown on the frontend)"
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-amber-500"
              />
              <textarea
                value={uploadDesc}
                onChange={(e)=>setUploadDesc(e.target.value)}
                placeholder="Short description (optional)"
                rows={2}
                maxLength={300}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-amber-500 resize-none"
              />
              <label className="flex items-center justify-center border-2 border-dashed border-slate-600 rounded-xl p-6 cursor-pointer hover:border-amber-500 transition text-center">
                {uploadFile ? (
                  <span className="text-xs text-emerald-300 flex items-center gap-2"><CheckCircle2 size={16}/> {uploadFile.name} ({(uploadFile.size/1024/1024).toFixed(2)} MB)</span>
                ) : (
                  <span className="text-xs text-slate-400 flex items-center gap-2"><Upload size={16}/> Choose {uploadKind === 'video' ? 'video' : 'image'} file</span>
                )}
                <input type="file" accept={uploadKind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/png,image/jpeg,image/webp,image/gif,image/avif'} className="hidden" onChange={(e)=>setUploadFile(e.target.files?.[0] ?? null)}/>
              </label>
              <button type="submit" disabled={uploading} className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {uploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>} {uploading ? 'Publishing…' : 'Publish to Frontend'}
              </button>
            </form>

            <p className="text-sm font-bold text-[#AED581]">Published media ({media.length})</p>
            {media.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No posters or videos published yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {media.map((m) => (
                  <div key={m.id} className="bg-[#2E7D32] rounded-2xl overflow-hidden border border-[#AED581]/15">
                    <div className="aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
                      {m.kind === 'poster' ? (
                        <img src={m.url} alt={m.title} className="w-full h-full object-contain" loading="lazy" />
                      ) : (
                        <video src={m.url} className="w-full h-full object-contain" controls playsInline preload="metadata" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        {m.kind === 'poster' ? <ImageIcon size={12} className="text-[#AED581]"/> : <Video size={12} className="text-[#AED581]"/>}
                        {m.title}
                      </p>
                      {m.description && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{m.description}</p>}
                      {editingId === m.id ? (
                        <div className="space-y-2">
                          <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={100} className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-white text-xs outline-none focus:border-amber-500" placeholder="Title" />
                          <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={300} rows={2} className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-white text-xs outline-none focus:border-amber-500 resize-none" placeholder="Description (optional)" />
                          <div className="flex gap-1.5">
                            <button onClick={() => saveEdit(m.id)} disabled={savingId === m.id} className="flex-1 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-500 disabled:opacity-50 flex items-center justify-center gap-1">
                              {savingId === m.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Save
                            </button>
                            <button onClick={cancelEdit} className="py-1.5 px-3 rounded-lg bg-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-600">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[10px] text-slate-500">{new Date(m.createdAt).toLocaleDateString('en-IN')}</span>
                            <div className="flex gap-1.5">
                              <button onClick={() => startEdit(m)} className="p-2 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/40 hover:text-amber-200 transition" title="Edit"><PenLine size={14} /></button>
                              <button onClick={() => { void removeMedia(m.id); }} disabled={deletingId === m.id} className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/40 hover:text-red-200 transition" title="Delete">
                                {deletingId === m.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
