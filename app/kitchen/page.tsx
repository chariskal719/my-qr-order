'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function KitchenDashboard() {
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);

  useEffect(() => {
    // Φέρνουμε ΜΟΝΟ όσα είναι σε αναμονή (pending)
    const fetchOrders = async () => {
      const { data } = await supabase.from('order_items').select('*').eq('status', 'pending');
      if (data) setPendingOrders(data);
    };
    fetchOrders();

    const channel = supabase
      .channel('kitchen_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
          setPendingOrders((prev) => [...prev, payload.new]);
        }
        if (payload.eventType === 'UPDATE') {
          if (payload.new.status === 'ready') {
            // Αν έγινε ready, το κρύβουμε από την κουζίνα
            setPendingOrders((prev) => prev.filter(o => o.id !== payload.new.id));
          }
        }
        if (payload.eventType === 'DELETE') {
          setPendingOrders((prev) => prev.filter(o => o.id !== payload.old.id));
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const markAsReady = async (id: number) => {
    const { error } = await supabase.from('order_items').update({ status: 'ready' }).eq('id', id);
    if (error) alert("Σφάλμα ενημέρωσης");
  };

  // Ομαδοποίηση ανά τραπέζι
  const tables = pendingOrders.reduce((acc: any, order) => {
    if (!acc[order.table_number]) acc[order.table_number] = [];
    acc[order.table_number].push(order);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 border-b border-gray-700 pb-4">
          <h1 className="text-4xl font-black tracking-tight">👨‍🍳 Κουζίνα <span className="text-orange-500 text-lg block">Ενεργές Παραγγελίες</span></h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Object.keys(tables).map((tableNum) => (
            <div key={tableNum} className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
              <div className="bg-gray-700 p-4 border-b border-gray-600">
                <h2 className="text-2xl font-bold">Τραπέζι {tableNum}</h2>
              </div>
              <div className="p-4 space-y-3">
                {tables[tableNum].map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg">
                    <span className="font-medium text-lg">{item.name}</span>

                    {item.notes && (
                      <div className="text-red-600 text-sm font-black mt-1 bg-red-50 p-2 rounded-md border border-red-200">
                        ⚠️ ΣΗΜΕΙΩΣΗ: {item.notes}
                      </div>
                    )}

                    <button 
                      onClick={() => markAsReady(item.id)}
                      className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                      Έτοιμο ✓
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(tables).length === 0 && (
            <div className="col-span-full text-center py-20">
              <p className="text-gray-500 text-xl italic">Δεν υπάρχουν παραγγελίες σε εκκρεμότητα. Καλή ξεκούραση!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}