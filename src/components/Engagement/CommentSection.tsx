
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Comment } from '../../types';
import { Send, MessageCircle, Trash2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

interface CommentSectionProps {
  parentId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ parentId }) => {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'comments'),
      where('parentId', '==', parentId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Comment[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Comment));
      setComments(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [parentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    try {
      await addDoc(collection(db, 'comments'), {
        parentId,
        userId: user.uid,
        userName: profile?.name || user.displayName || 'Anonymous User',
        text: newComment.trim(),
        createdAt: Date.now()
      });
      setNewComment('');
    } catch (err) {
      toast.error('Failed to post comment');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'comments', id));
      toast.success('Comment deleted');
    } catch (err) {
      toast.error('Could not delete comment');
    }
  };

  return (
    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
        <MessageCircle size={14} />
        {comments.length} Comments
      </div>

      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3 text-sm group">
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
               <User size={16} />
            </div>
            <div className="flex-grow">
               <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{comment.userName}</span>
                  {(user?.uid === comment.userId || profile?.role === 'admin') && (
                    <button 
                      onClick={() => comment.id && handleDelete(comment.id)}
                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
               </div>
               <p className="text-slate-600 leading-relaxed">{comment.text}</p>
            </div>
          </div>
        ))}
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2 mt-4">
          <input
            type="text"
            placeholder="Write a comment..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-12 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-50"
            disabled={!newComment.trim()}
          >
            <Send size={16} />
          </button>
        </form>
      ) : (
        <p className="text-center text-xs text-slate-400 py-2">Please login to join the conversation.</p>
      )}
    </div>
  );
};

export default CommentSection;
