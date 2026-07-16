'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export default function AdminPage() {

const router = useRouter();

// Αρχικοποίηση του Supabase Client για τον browser
// Αρχικοποίηση του Auth Client
const supabaseAuth = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const handleLogout = async () => {
  await supabaseAuth.auth.signOut(); // <-- Χρησιμοποιούμε το supabaseAuth
  router.push('/login');
  router.refresh();
};

  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase.from('order_items').select('*').order('id', { ascending: true });
      if (data) setOrders(data);
    };
    fetchOrders();

    const channel = supabase.channel('admin_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, payload => {
        if (payload.eventType === 'INSERT') setOrders(prev => [...prev, payload.new]);
        if (payload.eventType === 'UPDATE') setOrders(prev => prev.map(item => item.id === payload.new.id ? payload.new : item));
        if (payload.eventType === 'DELETE') setOrders(prev => prev.filter(item => item.id !== payload.old.id));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const nextStatus = async (id: number, currentStatus: string, price: number) => {
    if (Number(price) < 0) return;

    let newStatus = 'pending';
    if (currentStatus === 'pending') newStatus = 'ready';
    else if (currentStatus === 'ready') newStatus = 'served';
    else if (currentStatus === 'served') newStatus = 'pending';
    await supabase.from('order_items').update({ status: newStatus }).eq('id', id);
  };

  const handleCash = async (table: string) => {
    const ids = orders.filter(o => o.table_number === table && o.cash_requested).map(o => o.id);
    await supabase.from('order_items').update({ is_paid: true, cash_requested: false }).in('id', ids);
  };

  // ΝΕΑ ΛΟΓΙΚΗ: Το κουμπί πλέον βάζει status = 'archived' για να το κρύψει από την οθόνη
  const clearTable = async (table: string) => {
    if (confirm(`Θέλετε να κλείσετε οριστικά και να αρχειοθετήσετε το τραπέζι ${table};`)) {
      await supabase.from('order_items').update({ status: 'archived' }).eq('table_number', table);
    }
  };

  // Φιλτράρουμε τις αρχειοθετημένες παραγγελίες για να μην φαίνονται στο UI
  const visibleOrders = orders.filter(o => o.status !== 'archived');
  const tableNumbers = Array.from(new Set(visibleOrders.map(o => o.table_number))).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-6 font-sans">
      
      <header className="mb-8 flex justify-between items-center border-b border-slate-700 pb-4">
          <div>
            <h1 className="text-3xl font-black">KITCHEN & POS</h1>
            <p className="text-slate-400 text-sm mt-1">Σύστημα διαχείρισης σε πραγματικό χρόνο</p>
          </div>
          
          <button 
            onClick={handleLogout} 
            className="bg-red-50 text-red-600 px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-red-100 active:scale-[0.98] transition-all"
          >
            Αποσύνδεση ➔
          </button>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tableNumbers.map(table => {
          // Πλέον παίρνουμε ΟΛΑ τα μη-αρχειοθετημένα είδη του τραπεζιού (ακόμα και τα πληρωμένα)
          const tableOrders = visibleOrders.filter(o => o.table_number === table);
          const cashTotal = tableOrders.filter(o => o.cash_requested).reduce((s, i) => s + Number(i.price), 0);
          
          // Ελέγχουμε αν έχουν πληρωθεί τα πάντα στο τραπέζι (για να αλλάξουμε το χρώμα του)
          const isTableFullyPaid = tableOrders.every(o => o.is_paid || Number(o.price) < 0);

          return (
            <div key={table} className={`rounded-2xl border-2 flex flex-col ${
              cashTotal > 0 ? 'bg-slate-800 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 
              isTableFullyPaid ? 'bg-emerald-950/20 border-emerald-800' : 'bg-slate-800 border-slate-700'
            }`}>
              
              <div className={`p-4 flex justify-between items-center ${
                cashTotal > 0 ? 'bg-red-500/20' : 
                isTableFullyPaid ? 'bg-emerald-900/30' : 'bg-slate-700/50'
              }`}>
                <h2 className={`text-2xl font-black ${isTableFullyPaid ? 'text-emerald-500' : ''}`}>
                  Τραπέζι {table}
                </h2>
                {cashTotal > 0 && <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full animate-pulse">ΠΛΗΡΩΜΗ!</span>}
                {isTableFullyPaid && cashTotal === 0 && <span className="text-emerald-500 text-xs font-black px-3 py-1 border border-emerald-500 rounded-full">ΕΞΟΦΛΗΜΕΝΟ</span>}
              </div>

              <div className="p-4 flex-1 space-y-3">
                {tableOrders.map(item => {
                  const isPaymentItem = Number(item.price) < 0;

                  return (
                    <div 
                      key={item.id} 
                      onClick={() => nextStatus(item.id, item.status, item.price)}
                      className={`p-3 rounded-xl border transition-all ${
                        isPaymentItem ? 'bg-emerald-950/40 border-emerald-500/50 cursor-default' :
                        item.status === 'served' ? 'bg-slate-800 border-slate-700 opacity-50 cursor-pointer' : 
                        item.status === 'ready' ? 'bg-green-900/40 border-green-500 cursor-pointer' : 
                        item.is_paid ? 'bg-slate-800/80 border-emerald-900/50 cursor-pointer' :
                        'bg-slate-700 border-slate-600 cursor-pointer'
                      } ${item.cash_requested ? 'ring-2 ring-red-500' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <p className={`font-bold text-lg ${item.status === 'served' || item.is_paid ? 'text-slate-400' : 'text-white'}`}>
                          {isPaymentItem ? `💳 Πληρωμή (Μερίδιο)` : item.name}
                        </p>
                        <span className={`text-lg font-bold ${isPaymentItem ? 'text-emerald-400' : item.is_paid ? 'text-slate-500 line-through' : 'text-white'}`}>
                          {Number(item.price).toFixed(2)}€
                        </span>
                      </div>
                      
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {!isPaymentItem && (
                          <span className={`text-[10px] px-2 py-1 rounded-md font-black uppercase tracking-wider ${
                            item.status === 'pending' ? 'bg-orange-500/20 text-orange-400' : 
                            item.status === 'ready' ? 'bg-green-500/20 text-green-400' : 
                            'bg-slate-700 text-slate-400'
                          }`}>
                            {item.status === 'pending' ? '👨‍🍳 ΣΤΗΝ ΚΟΥΖΙΝΑ' : item.status === 'ready' ? '🛎️ ΕΤΟΙΜΟ' : '✅ ΣΕΡΒΙΡΙΣΤΗΚΕ'}
                          </span>
                        )}
                        
                        <span className={`text-[10px] px-2 py-1 rounded-md font-black uppercase tracking-wider ${
                          isPaymentItem ? 'bg-emerald-500/20 text-emerald-400' :
                          item.is_paid ? 'bg-emerald-500/10 text-emerald-500' : 
                          item.cash_requested ? 'bg-red-500 text-white animate-pulse' : 
                          'bg-slate-700 text-slate-400'
                        }`}>
                          {isPaymentItem ? 'ONLINE ΕΞΟΦΛΗΣΗ' : item.is_paid ? '✅ ΠΛΗΡΩΘΗΚΕ' : item.cash_requested ? '💸 ΘΕΛΕΙ ΜΕΤΡΗΤΑ' : '⏳ ΑΠΛΗΡΩΤΟ'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-slate-900 border-t border-slate-700 space-y-3">
                {cashTotal > 0 && (
                  <button onClick={() => handleCash(table)} className="w-full bg-red-600 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-transform">
                    ΕΙΣΠΡΑΞΗ {cashTotal.toFixed(2)}€
                  </button>
                )}
                <button 
                  onClick={() => clearTable(table)} 
                  className={`w-full font-bold py-3 rounded-xl border active:scale-95 transition-transform ${
                    isTableFullyPaid 
                    ? 'bg-emerald-600/20 text-emerald-500 border-emerald-600/30 hover:bg-emerald-600/30' 
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Κλείσιμο Τραπεζιού
                </button>
              </div>

            </div>
          );
        })}
      </main>
    </div>
  );
}