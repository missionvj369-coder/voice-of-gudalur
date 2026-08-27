
import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, increment, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { CommunityPost, HelpRequest } from '../types';
import { 
  MessageSquare, Plus, Clock, CheckCircle2, UserCircle, Send, 
  ThumbsUp, Heart, Sparkles, Filter, ShieldCheck, TrendingUp,
  Award, Camera, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import CommentSection from '../components/Engagement/CommentSection';

const Community: React.FC = () => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<(CommunityPost | HelpRequest)[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [postType, setPostType] = useState<'status' | 'need'>('status');
  const [newContent, setNewContent] = useState({ title: '', content: '', category: 'Update' });
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'needs' | 'updates'>('all');

  useEffect(() => {
    // Combined listener simulation for "Purified Feed"
    const qPosts = query(collection(db, 'community_posts'), orderBy('createdAt', 'desc'), limit(30));
    const qNeeds = query(collection(db, 'help_requests'), orderBy('createdAt', 'desc'), limit(30));

    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      const postData = snapshot.docs.map(doc => ({ id: doc.id, type: 'post', ...doc.data() }));
      updateUnifiedFeed(postData);
    });

    const unsubNeeds = onSnapshot(qNeeds, (snapshot) => {
      const needData = snapshot.docs.map(doc => ({ id: doc.id, type: 'need', ...doc.data() }));
      updateUnifiedFeed(needData);
    });

    const updateUnifiedFeed = (newData: any[]) => {
      setPosts(prev => {
        const combined = [...prev, ...newData];
        // Deduplicate and sort
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        return unique.sort((a: any, b: any) => b.createdAt - a.createdAt);
      });
      setLoading(false);
    };

    return () => {
      unsubPosts();
      unsubNeeds();
    };
  }, []);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const currentUid = (user as any).uid || user.id || 'anon_user';
    const currentName = profile?.name || (user as any).displayName || (user as any).user_metadata?.full_name || 'Gudalur Resident';

    try {
      if (postType === 'status') {
        await addDoc(collection(db, 'community_posts'), {
          userId: currentUid,
          userName: currentName,
          userRole: profile?.role || 'LOCAL_MEMBER',
          content: newContent.content,
          category: newContent.category,
          likesCount: 0,
          createdAt: Date.now()
        });
      } else {
        await addDoc(collection(db, 'help_requests'), {
          userId: currentUid,
          userName: currentName,
          title: newContent.title,
          description: newContent.content,
          status: 'open',
          likesCount: 0,
          createdAt: Date.now()
        });
      }
      toast.success('Shared with Gudalur!');
      setShowForm(false);
      setNewContent({ title: '', content: '', category: 'Update' });
    } catch (err) {
      toast.error('Failed to share');
    }
  };

  const handleLike = async (id: string, type: string) => {
    const col = type === 'post' ? 'community_posts' : 'help_requests';
    try {
      await updateDoc(doc(db, col, id), {
        likesCount: increment(1)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPosts = posts.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'needs') return (p as any).type === 'need';
    if (filter === 'updates') return (p as any).type === 'post';
    return true;
  });

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between border-b pb-12 border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-[0.3em] mb-4">
             <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             Community Pulse Network
          </div>
          <h1 className="text-6xl font-serif italic font-bold tracking-tight text-slate-900 leading-[0.9]">
            The Town Square
          </h1>
          <p className="text-slate-500 font-medium text-xl leading-relaxed max-w-xl mt-4">
            The high-trust collective voice of Gudalur residents, activists, and guardians.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex rounded-3xl bg-slate-100 p-2 shadow-inner border border-slate-200/50">
              {['all', 'needs', 'updates'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={cn(
                    "rounded-2xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
                    filter === f ? "bg-white text-slate-900 shadow-xl" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {f === 'all' ? 'Unified' : f === 'needs' ? 'Help' : 'Pulse'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-3 rounded-2xl bg-slate-900 px-8 py-4 text-[10px] font-black text-white shadow-2xl shadow-slate-200 transition-all hover:scale-110 active:scale-95 group"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform" />
              Transmit Status
            </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handlePostSubmit}
              className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-2xl mb-12 space-y-8"
            >
              <div className="flex bg-slate-100 p-2 rounded-3xl w-fit border border-slate-200/50 shadow-inner">
                <button 
                  type="button" 
                  onClick={() => setPostType('status')}
                  className={cn(
                    "px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all",
                    postType === 'status' ? "bg-white text-slate-900 shadow-xl" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Verification Update
                </button>
                <button 
                  type="button" 
                  onClick={() => setPostType('need')}
                  className={cn(
                    "px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all",
                    postType === 'need' ? "bg-white text-slate-900 shadow-xl" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Direct Resource Need
                </button>
              </div>

              {postType === 'need' && (
                <input
                  type="text"
                  required
                  placeholder="Primary Requirement Title (e.g. Critical Blood Support)"
                  value={newContent.title}
                  onChange={e => setNewContent(p => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 py-5 px-8 outline-none focus:border-emerald-500 focus:bg-slate-50/50 transition-all text-lg font-bold tracking-tight"
                />
              )}

              <textarea
                required
                placeholder={postType === 'status' ? "Share high-integrity town intelligence..." : "Detail the specific requirement. Direct coordinates and contact protocols..."}
                rows={postType === 'status' ? 6 : 4}
                value={newContent.content}
                onChange={e => setNewContent(p => ({ ...p, content: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 py-6 px-8 outline-none focus:border-emerald-500 focus:bg-slate-50/50 transition-all text-lg leading-relaxed font-medium"
              />

              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    {postType === 'status' && (
                      <div className="relative group">
                        <select 
                          value={newContent.category}
                          onChange={e => setNewContent(p => ({ ...p, category: e.target.value }))}
                          className="text-[10px] font-black uppercase tracking-widest border border-slate-200 rounded-2xl px-6 py-3 bg-slate-50 outline-none hover:bg-white transition-all appearance-none pr-12"
                        >
                          <option value="Update">General Feed</option>
                          <option value="News">Town Intel</option>
                          <option value="Event">Town Assembly</option>
                          <option value="Achievement">Citizen Honor</option>
                        </select>
                        <TrendingUp size={12} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    )}
                 </div>
                 <div className="flex gap-4">
                   <button type="button" onClick={() => setShowForm(false)} className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Secure Abort</button>
                   <button type="submit" className="flex items-center gap-3 rounded-2xl bg-emerald-600 px-10 py-5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200">
                     <Send size={18} /> Transmit to Hub
                   </button>
                 </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-12">
        {filteredPosts.map((post: any) => (
          <motion.div
            key={post.id}
            layout
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "overflow-hidden rounded-[48px] border-2 bg-white shadow-xl hover:shadow-2xl transition-all",
              post.type === 'need' ? "border-orange-50 ring-4 ring-orange-50/20" : "border-slate-50"
            )}
          >
            <div className="p-12">
              <div className="mb-10 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="h-16 w-16 overflow-hidden rounded-3xl bg-slate-900 flex items-center justify-center text-emerald-400 border-4 border-white shadow-xl">
                    {post.userRole === 'admin' ? <ShieldCheck size={32} /> : <div className="text-xl font-black">{post.userName?.charAt(0)}</div>}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">{post.userName}</span>
                      {post.userRole === 'admin' && (
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[8px] font-black text-emerald-600 uppercase tracking-widest">VERIFIED GUARDIAN</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                       <span className={cn(
                         "text-[9px] font-black uppercase tracking-[0.2em]",
                         post.type === 'need' ? "text-orange-500" : "text-emerald-500"
                       )}>
                         {post.type === 'need' ? 'CRITICAL REQUIREMENT' : (post.category || 'COMMUNITY PULSE')}
                       </span>
                       <span className="h-1 w-1 rounded-full bg-slate-200" />
                       <span className="text-[9px] font-bold text-slate-300 flex items-center gap-1 uppercase tracking-widest">
                         <Clock size={12} /> {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-12">
                {post.type === 'need' && (
                  <h3 className="mb-4 text-4xl font-serif italic font-bold text-slate-900 tracking-tight leading-none">
                    {post.title}
                  </h3>
                )}
                <p className="text-2xl font-medium leading-relaxed text-slate-800 whitespace-pre-wrap font-serif italic">
                  "{post.type === 'need' ? post.description : post.content}"
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-50 pt-10">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleLike(post.id, post.type)}
                    className="group flex items-center gap-2 rounded-2xl bg-slate-50 px-6 py-3.5 text-[10px] font-black text-slate-600 hover:bg-red-50 hover:text-red-500 transition-all uppercase tracking-widest"
                  >
                    <Heart size={18} className={post.likesCount > 0 ? "fill-red-500 text-red-500" : "group-hover:scale-125 transition-transform"} />
                    {post.likesCount || 0}
                  </button>
                  <button 
                    onClick={() => setActiveComments(activeComments === post.id ? null : post.id)}
                    className="flex items-center gap-2 rounded-2xl bg-slate-50 px-6 py-3.5 text-[10px] font-black text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all uppercase tracking-widest"
                  >
                    <MessageSquare size={18} />
                    Intelligence Hub
                  </button>
                </div>
                
                {post.type === 'need' && post.status === 'open' && (
                  <div className="flex items-center gap-3 text-[10px] font-black text-white uppercase tracking-widest bg-orange-500 px-6 py-3.5 rounded-2xl shadow-lg shadow-orange-200">
                    <TrendingUp size={16} /> Rapid Response Active
                  </div>
                )}
              </div>

              <AnimatePresence>
                {activeComments === post.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-10 border-t border-slate-50 pt-10"
                  >
                    <CommentSection parentId={post.id} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}

        {loading && (
           <div className="space-y-12">
              {[1, 2].map(i => (
                <div key={i} className="h-64 w-full animate-pulse rounded-[48px] bg-slate-100 shadow-inner" />
              ))}
           </div>
        )}

        {!loading && filteredPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[48px] border-4 border-dashed border-slate-100 py-40 text-center">
             <Filter size={80} className="mb-8 text-slate-200" />
             <p className="text-3xl font-serif italic font-bold text-slate-900 mb-2">Sector Quiet</p>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No verified transmissions found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );

};

export default Community;
