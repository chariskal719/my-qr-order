'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../utils/supabase';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, ExpressCheckoutElement, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const translations = {
  gr: {
    cart: "Το Καλάθι μου",
    pay: "Πληρωμή",
    send: "Αποστολή Παραγγελίας",
    notesLabel: "Σημειώσεις",
    notesPlaceholder: "π.χ. χωρίς κρεμμύδι...",
    total: "Σύνολο",
    splitBill: "Διαχωρισμός Λογαριασμού",
    emptyCart: "Το καλάθι είναι άδειο",
    close: "Κλείσιμο",
    payAll: "Πληρωμή όλου του ποσού",
    payOwn: "Πληρώνω τα δικά μου",
    cash: "Μετρητά",
    table: "Τραπέζι",
    tableOrder: "Παραγγελία Τραπεζιού",
    paymentSelection: "Επιλογή Πληρωμής",
    items: "είδη",
    back: "← Πίσω",
    chooseWhatToPay: "Επιλέξτε τι θα πληρώσετε:",
    people: "Άτομα",
    remaining: "Υπόλοιπο",
    processing: "Επεξεργασία...",
    orPayWithCard: "ή πληρωμή με κάρτα",
    terms: "Όροι Χρήσης",
    privacy: "Πολιτική Απορρήτου",
    support: "Υποστήριξη",
    bankConnecting: "Σύνδεση με τράπεζα..." ,
    splitAmount: "Το μερίδιό σου"

  },
  en: {
    cart: "My Cart",
    pay: "Checkout",
    send: "Send to Kitchen",
    notesLabel: "Notes",
    notesPlaceholder: "e.g. no onions...",
    total: "Total",
    splitBill: "Split Bill",
    emptyCart: "Cart is empty",
    close: "Close",
    payAll: "Pay in full",
    payOwn: "Pay my items",
    cash: "Cash",
    table: "Table",
    tableOrder: "Table Order",
    paymentSelection: "Select Payment",
    items: "items",
    back: "← Back",
    chooseWhatToPay: "Choose what to pay:",
    people: "People",
    remaining: "Remaining",
    processing: "Processing...",
    orPayWithCard: "or pay with card",
    terms: "Terms of Use",
    privacy: "Privacy Policy",
    support: "Support",
    bankConnecting: "Connecting to bank..." ,
    splitAmount: "Your share"

  }
};

export const dynamic = 'force-dynamic';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

const menuItems = [
  { id: 1, name: 'Χωριάτικη Σαλάτα', price: 8.50, description: 'Ντομάτα, αγγούρι, φέτα, ελιές, λάδι', category: 'Σαλάτες' },
  { id: 2, name: 'Burger Μοσχαρίσιο', price: 12.00, description: 'Με τσένταρ, μπέικον και πατάτες', category: 'Κυρίως' },
  { id: 3, name: 'Μπύρα Lager 500ml', price: 4.50, description: 'Παγωμένη βαρελίσια', category: 'Ποτά' },
  { id: 4, name: 'Πράσινη Σαλάτα', price: 7.00, description: 'Μαρούλι, ρόκα, παρμεζάνα', category: 'Σαλάτες' },
  { id: 5, name: 'Pasta Carbonara', price: 11.00, description: 'Αυθεντική συνταγή με guanciale', category: 'Κυρίως' },
];


function UnifiedCheckoutForm({ onSuccess, amount }: { onSuccess: () => void, amount: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  // Η κύρια λογική πληρωμής που είναι κοινή
  const processPayment = async () => {
    if (!stripe || !elements) return;
    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/menu",
      },
      redirect: 'if_required',
    });

    if (error) {
      alert(`Σφάλμα: ${error.message}`);
      setIsLoading(false);
    } else {
      onSuccess();
    }
  };

  // Όταν πατάει το Apple/Google Pay
  const handleExpressConfirm = () => {
    processPayment();
  };

  // Όταν πατάει Πληρωμή στην απλή κάρτα
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Σταματάει το refresh της σελίδας
    processPayment();
  };

  

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Γρήγορη Πληρωμή (Apple/Google Pay) */}
      <div className="bg-white rounded-2xl overflow-hidden p-1 border-2 border-[#800020]">
        <ExpressCheckoutElement onConfirm={handleExpressConfirm} />
      </div>

      {/* Διαχωριστικό "ή" */}
      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="flex-shrink mx-4 text-gray-400 text-sm font-medium">or pay with card</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      {/* 2. Κλασική Κάρτα */}
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#EADDCA] shadow-sm">
          <PaymentElement options={{ layout: 'accordion' }} />
        </div>
        
        <button 
          disabled={isLoading || !stripe || !elements} 
          className="w-full bg-[#800020] text-white py-4 rounded-2xl font-bold shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
        >
          {isLoading ? "Processing..." : `Pay ${amount}€`}
        </button>
      </form>
    </div>
  );
}

function MenuContent() {

  const [lang, setLang] = useState<'gr' | 'en'>('gr');
  const t = translations[lang];


  const searchParams = useSearchParams();
  const tableNumber = searchParams.get('table') || '0';

  const [selectedCategory, setSelectedCategory] = useState('Προτεινόμενα');
  const [cart, setCart] = useState<{ [key: number]: number }>({});
  const [dbCart, setDbCart] = useState<any[]>([]);
  
  const [showCartModal, setShowCartModal] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState<'full' | 'own' | 'equal' | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [splitCount, setSplitCount] = useState(2);
  
  const [stripeMode, setStripeMode] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const [itemNotes, setItemNotes] = useState<{ [key: number]: string }>({});

  const displayedItems = selectedCategory === 'Προτεινόμενα' ? menuItems : menuItems.filter(item => item.category === selectedCategory);
  const [activeSplit, setActiveSplit] = useState<any>(null);
  
useEffect(() => {
    if (!tableNumber) return;

    const fetchCartAndSplit = async () => {
      const { data: cartData } = await supabase
        .from('order_items')
        .select('*')
        .eq('table_number', tableNumber);
      
      if (cartData) setDbCart(cartData);

      // ΒΑΖΟΥΜΕ ΤΟ order() ΓΙΑ ΝΑ ΕΡΧΕΤΑΙ ΠΑΝΤΑ ΤΟ ΠΙΟ ΠΡΟΣΦΑΤΟ, ΑΓΝΟΩΝΤΑΣ ΤΑ ΖΟΜΠΙ
      const { data: allSplits } = await supabase
        .from('active_splits')
        .select('*')
        .order('created_at', { ascending: false }); 

      if (allSplits) {
        const mySplit = allSplits.find(s => String(s.table_number) === String(tableNumber));
        if (mySplit) {
          setActiveSplit(mySplit);
          setShowPaymentOptions(true);
        } else {
          setActiveSplit(null);
        }
      }
    };

    fetchCartAndSplit();

    const channel = supabase.channel('menu_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => { fetchCartAndSplit(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_splits' }, () => { fetchCartAndSplit(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableNumber]);
 
  

  useEffect(() => {
    setStripeMode(false);
    setClientSecret(null);
  }, [paymentMethod, selectedItemIds, splitCount]);

  const unpaidDbItems = dbCart.filter(item => !item.is_paid);
  const totalUnpaid = unpaidDbItems.reduce((sum, item) => sum + Number(item.price), 0);
  
  // Τα πιάτα που μπορούν να επιλεγούν (αγνοούμε τις "αρνητικές" πληρωμές split)
  const selectableItems = unpaidDbItems.filter(item => item.price > 0 && !item.cash_requested);

  let amountToPay = 0;
if (activeSplit) {
  amountToPay = Number(activeSplit.split_amount);
} else if (paymentMethod === 'full') {
  amountToPay = totalUnpaid;
} else if (paymentMethod === 'own') {
  amountToPay = unpaidDbItems.filter(i => selectedItemIds.includes(i.id)).reduce((s, i) => s + Number(i.price), 0);
} else if (paymentMethod === 'equal') {
  amountToPay = totalUnpaid / splitCount;
}

const handleStripeSetup = async () => {
    if (amountToPay <= 0) return;
    setStripeMode(true);
    
    // Διορθώνουμε τα δεδομένα που στέλνουμε στην τράπεζα αν είναι κλειδωμένο!
    const currentType = activeSplit ? 'equal' : paymentMethod;
    const currentParts = activeSplit ? activeSplit.total_parts : (paymentMethod === 'equal' ? splitCount : 1);
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: currentType, 
          tableNumber, 
          itemIds: paymentMethod === 'own' ? selectedItemIds : [],
          splitCount: currentParts,
          amount: amountToPay // Το στέλνουμε καλού-κακού αν το χρειάζεται το backend
        }),
      });
      const data = await response.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else { 
        setStripeMode(false); 
        alert("Σφάλμα επικοινωνίας με την τράπεζα: Το backend δεν επέστρεψε κωδικό."); 
      }
    } catch (err) { 
      setStripeMode(false); 
      alert("Πρόβλημα σύνδεσης με τον server."); 
    }
  };

  const handleCashPayment = async () => {
    if (amountToPay <= 0) return;

    if (paymentMethod === 'equal') {
      await supabase.from('order_items').insert([{
        table_number: tableNumber,
        name: '⏳ {t.cash} (Split)',
        price: -Math.abs(amountToPay),
        status: 'served',
        is_paid: false,
        cash_requested: true
      }]);
    } else {
      const itemsToPay = paymentMethod === 'own' ? selectedItemIds : unpaidDbItems.map(i => i.id);
      await supabase.from('order_items').update({ cash_requested: true }).in('id', itemsToPay);
    }

    alert("🙋‍♂️ Ο σερβιτόρος ειδοποιήθηκε!");
    window.location.reload(); // Ανανέωση αμέσως!
  };

  const addToCart = (id: number) => setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  const removeFromCart = (id: number) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[id] > 1) newCart[id] -= 1;
      else delete newCart[id];
      if (Object.keys(newCart).length === 0) setShowCartModal(false);
      return newCart;
    });
  };

const sendOrder = async () => {
    const itemsToInsert: any[] = [];
    Object.entries(cart).forEach(([id, qty]) => {
      const item = menuItems.find(m => m.id === Number(id));
      if (item) {
        for (let i = 0; i < qty; i++) {
          itemsToInsert.push({ 
            table_number: tableNumber, 
            item_id: item.id, 
            name: item.name, 
            price: item.price, 
            status: 'pending', 
            is_paid: false, 
            cash_requested: false,
            notes: itemNotes[item.id] || null
          });
        }
      }
    });

    const { error } = await supabase.from('order_items').insert(itemsToInsert);
    
    if (!error) { 
      // Αδειάζουμε το τοπικό καλάθι και μετά κάνουμε σκληρό refresh
      setCart({});
      setItemNotes({});
      setShowCartModal(false);
      
      // Αντί για alert που μπλοκάρει το κινητό, κάνουμε reload.
      // Έτσι η εφαρμογή ξαναδιαβάζει τη βάση από το μηδέν.
      window.location.reload(); 
    } else {
      console.error("Error inserting:", error);
      alert("Κάτι πήγε στραβά, δοκίμασε ξανά.");
    }
  };

  const totalInCart = Object.entries(cart).reduce((sum, [id, qty]) => sum + (menuItems.find(m => m.id === Number(id))?.price || 0) * qty, 0);
  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 pb-32 font-sans selection:bg-black selection:text-white">
      
      {/* --- STICKY HEADER & CATEGORIES (NEXT-GEN UI) --- */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 transition-all">
        <header className="px-5 py-4 flex justify-between items-center max-w-2xl mx-auto">
          
          {/* Τίτλος & Ένδειξη Τραπεζιού με παλμό (Pulse) */}
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">VINTAGE BISTRO</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{t.table} {tableNumber}</p>
            </div>
          </div>

          {/* Μινιμαλιστικό Κουμπί Γλώσσας (Pill style) */}
          <div className="flex items-center gap-1 bg-white rounded-full p-1 border border-gray-200 shadow-sm">
            <button 
              onClick={() => setLang('gr')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === 'gr' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              GR
            </button>
            <button 
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === 'en' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              EN
            </button>
          </div>
        </header>

        {/* Κατηγορίες (Pill Tabs) */}
        <div className="px-5 pb-3 max-w-2xl mx-auto">
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar items-center pb-2 px-1">
            {['Προτεινόμενα', 'Σαλάτες', 'Κυρίως', 'Ποτά'].map((cat) => (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory(cat)} 
                className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 ${
                  selectedCategory === cat 
                  ? 'bg-gray-900 text-white shadow-lg scale-[1.02]' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="p-5 max-w-2xl mx-auto space-y-4 pt-4">

       {/* --- CLEAN PREMIUM PRODUCT CARDS --- */}
        {displayedItems.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            
            {/* Minimal Image Placeholder */}
            <div className="w-[84px] h-[84px] bg-gray-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-gray-100">
              <span className="text-3xl opacity-40 grayscale">🍽️</span>
            </div>

            <div className="flex flex-col justify-center flex-grow pr-2">
              <h3 className="font-bold text-gray-900 text-[17px] leading-tight">{item.name}</h3>
              <p className="text-xs text-gray-400 mt-1.5 leading-snug line-clamp-2">{item.description}</p>
              <p className="font-black text-[15px] mt-2 text-gray-900">{item.price.toFixed(2)}€</p>
            </div>

            <div className="flex flex-col items-end justify-center min-w-[40px]">
              {cart[item.id] > 0 ? (
                <div className="flex flex-col items-center justify-between bg-gray-50 rounded-full border border-gray-100 h-full py-1">
                  <button onClick={() => addToCart(item.id)} className="w-8 h-8 flex items-center justify-center text-gray-900 font-bold text-xl active:scale-95">+</button>
                  <span className="font-bold text-[#800020] text-sm my-1">{cart[item.id]}</span>
                  <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center text-gray-900 font-bold text-xl active:scale-95">-</button>
                </div>
              ) : (
                <button onClick={() => addToCart(item.id)} className="bg-gray-50 border border-gray-100 text-gray-900 w-10 h-10 rounded-full font-bold active:scale-95 transition-transform flex items-center justify-center shadow-sm hover:bg-gray-100">
                  <span className="text-2xl mb-0.5">+</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {dbCart.length > 0 && (
          <div className="mt-10 bg-white p-6 rounded-[32px] border border-[#EADDCA]">
            <h2 className="text-xs font-black uppercase tracking-widest mb-4 opacity-40">Παραγγελία Τραπεζιού</h2>
            {dbCart.map((item, idx) => (
              <div key={idx} className={`flex justify-between py-2 border-b border-gray-50 last:border-0 ${item.price < 0 ? 'text-green-600 font-bold' : ''}`}>
                <span className={item.is_paid ? 'line-through opacity-30' : ''}>{item.name}</span>
                <span className="font-bold">{Number(item.price).toFixed(2)}€</span>
              </div>
            ))}
            {totalUnpaid > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4 px-2">
                  <span className="font-bold text-lg">{t.total}</span>
                  <span className="font-black text-2xl text-[#800020]">{totalUnpaid.toFixed(2)}€</span>
                </div>
                <button onClick={() => setShowPaymentOptions(true)} className="w-full bg-[#800020] text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform">
                  {t.paymentSelection}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- PROFESSIONAL FOOTER --- */}
      <footer className="p-10 pb-40 text-center space-y-4">
        <div className="flex justify-center gap-6 text-[11px] font-bold text-[#800020] opacity-40 uppercase tracking-widest">
          <button className="hover:opacity-100">{t.terms}</button>
          <button className="hover:opacity-100">{t.privacy}</button>
          <button className="hover:opacity-100">{t.support}</button>
        </div>
        
        <div className="pt-4 border-t border-[#EADDCA] max-w-[150px] mx-auto opacity-20"></div>
        
        <p className="text-[10px] font-medium text-gray-400">
          © 2026 QuickSplit Hospitality Solutions.<br/>
          Built for <span className="text-[#800020] font-bold">Vintage Bistro</span>
        </p>
      </footer>

       {/* --- CLEAN PREMIUM STICKY BOTTOM BAR --- */}
      {Object.keys(cart).length > 0 && !showCartModal && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 p-4 pb-8 z-50 flex justify-between items-center rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.06)] md:max-w-2xl md:mx-auto animate-in slide-in-from-bottom-10">
          
          <button className="flex flex-col pl-4 text-left" onClick={() => setShowCartModal(true)}>
            <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">{t.cart} • {cartItemCount} {t.items}</span>
            <span className="text-gray-900 font-black text-2xl tracking-tight">
              {totalInCart.toFixed(2)}€
            </span>
          </button>

          <button 
            onClick={() => setShowCartModal(true)}
            className="bg-[#800020] text-white px-8 py-3.5 rounded-full font-bold text-base shadow-[0_8px_20px_rgba(128,0,32,0.25)] transition-all active:scale-95 flex items-center gap-2"
          >
            {t.pay}
            <span className="bg-white/20 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
               →
            </span>
          </button>
        </div>
      )}

      {showCartModal && (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-md flex items-end">
          <div className="bg-white w-full max-h-[85vh] overflow-y-auto rounded-t-[40px] p-8 pb-12 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] md:max-w-2xl md:mx-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight"> {t.cart} </h2>
              <button onClick={() => setShowCartModal(false)} className="font-bold text-sm text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-wider">{t.close}</button>
            </div>
            
            <div className="space-y-4 mb-8">
              {Object.entries(cart).map(([id, qty]) => {
                const item = menuItems.find(m => m.id === Number(id));
                if (!item) return null;
                const itemId = Number(id);
                return (
                  <div key={id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-gray-900">{item.name} <span className="text-gray-400 font-medium">x{qty}</span></h4>
                      <p className="text-gray-900 font-black text-base">{(item.price * qty).toFixed(2)}€</p>
                    </div>
                    <input
                      type="text"
                      placeholder={t.notesPlaceholder}
                      value={itemNotes[itemId] || ""}
                      onChange={(e) => setItemNotes(prev => ({ ...prev, [itemId]: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-[#800020] transition-colors placeholder-gray-400"
                    />
                  </div>
                );
              })}
            </div>
            
            <button onClick={sendOrder} className="w-full bg-[#800020] text-white py-4 rounded-2xl font-bold shadow-[0_8px_25px_rgba(128,0,32,0.3)] hover:opacity-95 active:scale-[0.99] transition-all text-base"> 
              {t.send} ({totalInCart.toFixed(2)}€)
            </button>
          </div>
        </div>
      )}
      {showPaymentOptions && (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-md flex items-end">
          <div className="bg-white w-full max-h-[90vh] overflow-y-auto rounded-t-[40px] p-8 pb-12 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] md:max-w-2xl md:mx-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight"> {t.pay} </h2>
              <button onClick={() => {setShowPaymentOptions(false); setPaymentMethod(null); setStripeMode(false); setClientSecret(null);}} className="font-bold text-sm text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-wider">{t.close}</button>
            </div>

            {/* --- ΣΤΑΔΙΟ 2: ΥΠΑΡΧΕΙ ΗΔΗ ΚΛΕΙΔΩΜΕΝΟΣ ΡΕΦΕΝΕΣ --- */}
            {activeSplit ? (
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mt-2 mb-6 text-center">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 bg-[#800020]/10 text-[#800020] rounded-full text-2xl">
                  🔒
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Λογαριασμός Κλειδωμένος</h3>
                
                <p className="text-sm font-bold text-gray-900 mb-1">
                  Πλήρωσαν <span className="text-[#800020]">{activeSplit.paid_parts}</span> από <span className="text-[#800020]">{activeSplit.total_parts}</span> άτομα
                </p>
                <p className="text-xs text-gray-500 mb-6 font-medium">
                  Απομένουν: {(Number(activeSplit.split_amount) * (activeSplit.total_parts - activeSplit.paid_parts)).toFixed(2)}€ για το τραπέζι
                </p>

                <div className="bg-white rounded-2xl py-5 mb-6 border border-gray-100 shadow-sm">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Το Μερίδιό Σου</p>
                  <p className="text-4xl font-black text-gray-900">{Number(activeSplit.split_amount).toFixed(2)}€</p>
                </div>

                {!stripeMode ? (
                  <button onClick={handleStripeSetup} className="w-full bg-[#800020] text-white py-4 rounded-2xl font-bold text-lg shadow-[0_8px_25px_rgba(128,0,32,0.25)] hover:opacity-95 active:scale-[0.99] transition-all">
                    Πληρωμή ({Number(activeSplit.split_amount).toFixed(2)}€)
                  </button>
                ) : (
                  clientSecret ? (
                    <div className="mt-4 text-left">
                      <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret }}>
                        <UnifiedCheckoutForm
                          amount={Number(activeSplit.split_amount).toFixed(2)}
                          onSuccess={async () => {
                            // Μετατρέπουμε ρητά σε αριθμούς για να μην μπερδευτεί ποτέ η Javascript
                            const currentPaid = Number(activeSplit.paid_parts);
                            const totalParts = Number(activeSplit.total_parts);
                            const newPaidParts = currentPaid + 1;
                            
                            if (newPaidParts >= totalParts) {
                              // ΠΛΗΡΩΣΕ ΚΑΙ Ο ΤΕΛΕΥΤΑΙΟΣ: Εξοφλούμε τα πιάτα και σβήνουμε το κλείδωμα
                              const unpaidIds = unpaidDbItems.map(i => i.id);
                              await supabase.from('order_items').update({ is_paid: true }).in('id', unpaidIds);
                              await supabase.from('active_splits').delete().eq('id', activeSplit.id);
                            } else {
                              // ΠΛΗΡΩΣΕ ΕΝΔΙΑΜΕΣΟΣ: Απλά αυξάνουμε το μετρητή
                              await supabase.from('active_splits').update({ paid_parts: newPaidParts }).eq('id', activeSplit.id);
                            }

                            // Νέο alert που σου επιβεβαιώνει ποιος πλήρωσε!
                            alert(`✅ Η πληρωμή ολοκληρώθηκε! (${newPaidParts}/${totalParts})`);
                            window.location.reload(); 
                          }}
                        />
                      </Elements>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-sm font-bold text-[#800020] animate-pulse">{t.bankConnecting}</div>
                  )
                )}
              </div>
            ) : (
              /* --- ΣΤΑΔΙΟ 1: ΝΕΑ ΠΛΗΡΩΜΗ (ΕΠΙΛΟΓΗ ΜΕΘΟΔΟΥ) --- */
              <div className="payment-options-container">
                {!paymentMethod ? (
                  <div className="flex flex-col gap-3">
                    <button onClick={() => setPaymentMethod('full')} className="w-full p-5 rounded-2xl border border-gray-100 bg-gray-50 font-bold text-gray-900 text-left hover:bg-gray-100 transition-colors flex justify-between items-center">
                      <span>💰 {t.payAll}</span> <span className="text-gray-400">→</span>
                    </button>
                    <button onClick={() => setPaymentMethod('own')} className="w-full p-5 rounded-2xl border border-gray-100 bg-gray-50 font-bold text-gray-900 text-left hover:bg-gray-100 transition-colors flex justify-between items-center">
                      <span>🍽️ {t.payOwn}</span> <span className="text-gray-400">→</span>
                    </button>
                    <button onClick={() => setPaymentMethod('equal')} className="w-full p-5 rounded-2xl border border-gray-100 bg-gray-50 font-bold text-gray-900 text-left hover:bg-gray-100 transition-colors flex justify-between items-center">
                      <span>➗ {t.splitBill}</span> <span className="text-gray-400">→</span>
                    </button>
                  </div>
                ) : (
                  <div className="mb-4">
                    <button onClick={() => { setPaymentMethod(null); setStripeMode(false); setClientSecret(null); }} className="text-gray-400 hover:text-gray-900 text-xs font-bold mb-4 flex items-center gap-1">
                      ← {t.back}
                    </button>
                    
                    {/* UI για 'Δικά μου' */}
                    {paymentMethod === 'own' && (
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6 space-y-1 max-h-[30vh] overflow-y-auto">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">{t.chooseWhatToPay}</p>
                        {selectableItems.map((item) => (
                          <label key={item.id} className="flex justify-between items-center p-3 hover:bg-white cursor-pointer rounded-xl transition-colors">
                            <div className="flex items-center gap-3">
                              <input type="checkbox" checked={selectedItemIds.includes(item.id)} onChange={() => {
                                setSelectedItemIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
                              }} className="w-5 h-5 accent-[#800020]" />
                              <span className="font-medium text-gray-900">{item.name}</span>
                            </div>
                            <span className="font-bold text-gray-900">{Number(item.price).toFixed(2)}€</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* UI για 'Ρεφενέ' */}
                    {paymentMethod === 'equal' && (
                      <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-6 flex justify-between items-center">
                        <span className="font-bold text-gray-900">{t.people} <span className="text-xs font-normal text-gray-400">({t.remaining}: {totalUnpaid.toFixed(2)}€)</span></span>
                        <div className="flex gap-4 items-center bg-white p-1.5 rounded-full border border-gray-100 shadow-sm">
                          <button onClick={() => setSplitCount(Math.max(2, splitCount - 1))} className="w-8 h-8 bg-gray-50 rounded-full font-bold flex items-center justify-center text-gray-900 hover:bg-gray-100">-</button>
                          <span className="font-bold text-gray-900 min-w-[16px] text-center">{splitCount}</span>
                          <button onClick={() => setSplitCount(splitCount + 1)} className="w-8 h-8 bg-gray-50 rounded-full font-bold flex items-center justify-center text-gray-900 hover:bg-gray-100">+</button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 pt-2">
                      {!stripeMode ? (
                        <button onClick={handleStripeSetup} className="w-full bg-[#800020] text-white py-4 rounded-2xl font-bold shadow-[0_8px_25px_rgba(128,0,32,0.25)]">
                          💳 {t.pay} {amountToPay.toFixed(2)}€
                        </button>
                      ) : (
                        clientSecret ? (
                          <div className="mt-2 text-left">
                            <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret }}>
                              <UnifiedCheckoutForm
                                amount={amountToPay.toFixed(2)}
                                onSuccess={async () => {
                                  
                                  if (paymentMethod === 'own') {
                                    // Πληρώνει τα δικά του
                                    await supabase.from('order_items').update({ is_paid: true }).in('id', selectedItemIds);
                                  } else if (paymentMethod === 'full') {
                                    // Πληρώνει τα πάντα
                                    const unpaidIds = unpaidDbItems.map(i => i.id);
                                    await supabase.from('order_items').update({ is_paid: true }).in('id', unpaidIds);
                                  } else if (paymentMethod === 'equal') {
                                    // ΕΔΩ ΚΛΕΙΔΩΝΕΙ Ο ΡΕΦΕΝΕΣ: Γράφει στη βάση και ΔΕΝ διαγράφει τα πιάτα
                                    const { error } = await supabase.from('active_splits').insert([{
                                      table_number: tableNumber,
                                      total_parts: splitCount,
                                      paid_parts: 1,
                                      split_amount: amountToPay
                                    }]);

                                    if (error) {
                                      alert("Σφάλμα κλειδώματος: " + error.message);
                                      return;
                                    }
                                  }

                                  alert("✅ Η πρώτη πληρωμή ολοκληρώθηκε επιτυχώς!");
                                  window.location.reload(); // Reload για να εμφανιστεί αμέσως το κλειδωμένο UI
                                }}
                              />
                            </Elements>
                          </div>
                        ) : (
                          <div className="py-4 text-center text-sm font-bold text-[#800020] animate-pulse">{t.bankConnecting}</div>
                        )
                      )}
                      
                      <button onClick={handleCashPayment} className="w-full border border-gray-200 text-gray-700 py-4 rounded-2xl font-bold mt-1 bg-gray-50 hover:bg-gray-100 transition-colors">
                        💵 {t.cash}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
    </div>
  );
}

export default function MenuPage() { 
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#800020] font-bold">Φόρτωση...</div>}>
      <MenuContent />
    </Suspense>
  ); 
}