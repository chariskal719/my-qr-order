'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase'; // Προσοχή να είναι σωστό το path σου
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function KitchenDashboard() {

    const [orders, setOrders] = useState<any[]>([]);

    const router = useRouter();

    // Αρχικοποίηση του Auth Client για την κουζίνα
    const supabaseAuth = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleLogout = async () => {
      await supabaseAuth.auth.signOut(); // Σβήνει το session
      router.refresh();                  // Ο φρουρός (middleware) αναλαμβάνει τα υπόλοιπα αυτόματα!
    };

  

  useEffect(() => {
  // Δημιουργούμε το αντικείμενο του ήχου (δείχνει στο public/bell.mp3)
  const notificationSound = new Audio('/bell.mp3');

  const fetchOrders = async () => {
    const { data } = await supabase.from('order_items').select('*').order('id', { ascending: true });
    if (data) setOrders(data);
  };
  fetchOrders();

  const channel = supabase.channel('kitchen_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, payload => {
      
      // 🔔 ΑΝ Η ΑΛΛΑΓΗ ΕΙΝΑΙ ΝΕΑ ΠΑΡΑΓΓΕΛΙΑ (INSERT), ΠΑΙΞΕ ΤΟΝ ΗΧΟ!
      if (payload.eventType === 'INSERT') {
        notificationSound.play().catch(err => {
          console.log("Ο browser μπλόκαρε την αυτόματη αναπαραγωγή ήχου μέχρι ο χρήστης να αλληλεπιδράσει με τη σελίδα:", err);
        });
        
        setOrders(prev => [...prev, payload.new]);
      }
      
      if (payload.eventType === 'UPDATE') {
        setOrders(prev => prev.map(item => item.id === payload.new.id ? payload.new : item));
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  const markAsReady = async (id: number) => {
    const { error } = await supabase.from('order_items').update({ status: 'ready' }).eq('id', id);
    if (error) alert("Σφάλμα ενημέρωσης");
  };

  const printTableOrder = () => {
    window.print();
  };

  // 1. Κρατάμε ΜΟΝΟ τις παραγγελίες που δεν είναι έτοιμες
  const activeOrders = orders.filter(order => order.status !== 'ready');

  // 2. Ομαδοποίηση ανά τραπέζι
  const tables = activeOrders.reduce((acc: any, order) => {
    if (!acc[order.table_number]) acc[order.table_number] = [];
    acc[order.table_number].push(order);
    return acc;
  }, {});

  return (
    // Προσθέσαμε print:bg-white print:text-black για να τυπώνεται σωστά στο χαρτί
    <div className="min-h-screen bg-gray-900 print:bg-white p-8 print:p-0 text-white print:text-black">
      <div className="max-w-6xl mx-auto">
        
        <header className="mb-8 flex justify-between items-center border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-3xl font-black">ΚΟΥΖΙΝΑ</h1>
          <p className="text-slate-400 text-sm mt-1">Νέες παραγγελίες σε πραγματικό χρόνο</p>
        </div>
        
        <button 
          onClick={handleLogout} 
          className="bg-red-50 text-red-600 px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-red-100 active:scale-[0.98] transition-all"
        >
          Αποσύνδεση ➔
        </button>
      </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:block print:w-full">
          {Object.keys(tables).map((tableNum) => (
            <div key={tableNum} className="bg-gray-800 print:bg-white print:border-black rounded-2xl border border-gray-700 overflow-hidden shadow-xl print:shadow-none print:mb-8 print:break-inside-avoid">
              
              <div className="bg-gray-700 print:bg-gray-100 p-4 border-b border-gray-600 print:border-black flex justify-between items-center">
                <h2 className="text-2xl font-bold">Τραπέζι {tableNum}</h2>
                
                {/* Κουμπί Εκτύπωσης - Κρύβεται κατά την εκτύπωση (print:hidden) */}
                <button 
                  onClick={printTableOrder} 
                  className="text-gray-300 hover:text-white bg-gray-600 hover:bg-gray-500 p-2 rounded-lg transition-colors print:hidden"
                  title="Εκτύπωση Παραγγελίας"
                >
                  🖨️ Εκτύπωση
                </button>
              </div>

              <div className="p-4 space-y-3">
                {tables[tableNum].map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-700/50 print:bg-transparent print:border-b print:border-gray-300 print:rounded-none p-3 rounded-lg">
                    <span className="font-medium text-lg">{item.name}</span>

                    {item.notes && (
                      <div className="text-red-600 print:text-black text-sm font-black mt-1 bg-red-50 print:bg-transparent p-2 rounded-md border border-red-200 print:border-none">
                        ⚠️ ΣΗΜΕΙΩΣΗ: {item.notes}
                      </div>
                    )}

                    {/* Το κουμπί Έτοιμο κρύβεται στο χαρτί */}
                    <button 
                      onClick={() => markAsReady(item.id)}
                      className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-lg transition-colors print:hidden"
                    >
                      Έτοιμο ✓
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(tables).length === 0 && (
            <div className="col-span-full text-center py-20 print:hidden">
              <p className="text-gray-500 text-xl italic">Δεν υπάρχουν παραγγελίες σε εκκρεμότητα. Καλή ξεκούραση!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}