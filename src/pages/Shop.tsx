import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { 
  ShoppingBag, Search, Tag, Filter, User, Package, 
  Plus, X, Heart, ShieldCheck, Truck, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

const CATEGORIES = ['Tea', 'Spices', 'Honey', 'Handicraft', 'Local Produce', 'Other'];

const Shop: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    description: '',
    category: 'Tea',
    stock: 10
  });

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Product[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
      setLoading(false);
    }, () => toast.error('Failed to load products'));
    return unsubscribe;
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'products'), {
        ...newProduct,
        sellerId: user.uid,
        sellerName: user.displayName || 'Gudalur Merchant',
        createdAt: Date.now()
      });
      toast.success('Product listed in Gudalur Market!');
      setShowAddForm(false);
    } catch (err) {
      toast.error('Listing failed');
    }
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between border-b pb-12 border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600 font-black text-[10px] uppercase tracking-[0.3em] mb-4">
             <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
             Direct Trade Portal
          </div>
          <h1 className="text-6xl font-serif italic font-bold tracking-tight text-slate-900 leading-[0.9]">
            {t('shop.title')}
          </h1>
          <p className="text-slate-500 font-medium text-xl leading-relaxed max-w-xl mt-4">
            {t('shop.subtitle')}
          </p>
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-3 rounded-2xl bg-slate-900 px-8 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl shadow-slate-200 hover:scale-110 active:scale-95 transition-all group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          {t('shop.register')}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search local tea, spices, honey..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm outline-none transition-all focus:border-amber-500 focus:ring-4 focus:ring-amber-50"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCategory === 'All' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-100'}`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCategory === cat ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-500 border-slate-100 hover:border-amber-100'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
           <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
           <p className="text-sm font-bold text-slate-500">Loading fresh harvest...</p>
        </div>
      ) : (
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map(product => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group flex flex-col overflow-hidden rounded-[40px] border border-slate-100 bg-white shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-slate-50">
                  {product.photoUrl ? (
                    <img src={product.photoUrl} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-200">
                      <ShoppingBag size={80} strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute top-6 left-6">
                    <span className="rounded-xl bg-white/90 px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-900 backdrop-blur-xl border border-white/20 shadow-lg">
                      {product.category}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>

                <div className="flex flex-1 flex-col p-10">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-2xl font-black text-slate-900 leading-none tracking-tight">{product.name}</h3>
                    <p className="text-2xl font-mono font-black text-amber-600">₹{product.price}</p>
                  </div>
                  
                  <p className="mb-8 text-sm font-medium text-slate-400 line-clamp-2 leading-relaxed">
                    {product.description || 'Authentic hill produce, ethically sourced from the Gudalur sholas.'}
                  </p>

                  <div className="mb-8 mt-auto flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                       <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                          {product.sellerName?.charAt(0) || 'M'}
                       </div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{product.sellerName}</p>
                    </div>
                    {product.stock > 0 ? (
                      <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                        <Package size={12} /> {product.stock} Left
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Sold Out</span>
                    )}
                  </div>

                  <button
                    onClick={() => toast.success('Order synchronized! The merchant will contact you for delivery.')}
                    disabled={product.stock === 0}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-emerald-600 disabled:opacity-50 shadow-xl shadow-slate-200"
                  >
                    Direct Connect
                    <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Form Portal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">List Your Product</h2>
                  <p className="text-xs font-medium text-slate-500">Reach the entire Gudalur community</p>
                </div>
                <button onClick={() => setShowAddForm(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Product Name</label>
                  <input
                    required
                    placeholder="e.g. Organic Ooty Tea"
                    value={newProduct.name}
                    onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Price (₹)</label>
                    <input
                      required
                      type="number"
                      value={newProduct.price}
                      onChange={e => setNewProduct(p => ({ ...p, price: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                    <select
                      value={newProduct.category}
                      onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                  <textarea
                    required
                    placeholder="Describe your product heritage..."
                    rows={3}
                    value={newProduct.description}
                    onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-amber-600 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-amber-100 transition-all hover:bg-amber-700 active:scale-95"
                >
                  Post to Shop
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Shop;
