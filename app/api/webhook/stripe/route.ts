import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2023-10-16' as any });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch (error: any) {
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { type, tableNumber, itemIds, splitCount, amount } = paymentIntent.metadata;

    try {
      if (type === 'own' || type === 'full') {
         // --- ΣΕΝΑΡΙΟ 1: Κλασική πληρωμή (Ολόκληρο ή Επιλεγμένα Πιάτα) ---
         const query = supabase.from('order_items').update({ is_paid: true, cash_requested: false }).eq('table_number', tableNumber).eq('is_paid', false);
         if (type === 'own' && itemIds) {
           query.in('id', itemIds.split(',').map(Number));
         }
         await query;

      } else if (type === 'create_new_split') {
         // --- ΣΕΝΑΡΙΟ 2: Ο 1ος πελάτης ξεκινάει τη μοιρασιά ---
         await supabase.from('active_splits').insert([{
           table_number: Number(tableNumber),
           split_amount: Number(amount),
           total_parts: Number(splitCount),
           paid_parts: 1 // Ο πρώτος μόλις πλήρωσε!
         }]);

      } else if (type === 'pay_existing_split') {
         // --- ΣΕΝΑΡΙΟ 3: Ο 2ος, 3ος κτλ πελάτης πληρώνει το μερίδιό του ---
         const { data: currentSplit } = await supabase.from('active_splits').select('*').eq('table_number', tableNumber).single();

         if (currentSplit) {
           const newPaidParts = currentSplit.paid_parts + 1;

           if (newPaidParts >= currentSplit.total_parts) {
             // 🏆 ΠΛΗΡΩΣΑΝ ΟΛΟΙ! Καθαρίζουμε όλο το τραπέζι και σβήνουμε το κλείδωμα!
             await supabase.from('order_items').update({ is_paid: true, cash_requested: false }).eq('table_number', tableNumber).eq('is_paid', false);
             await supabase.from('active_splits').delete().eq('id', currentSplit.id);
           } else {
             // ⏳ Δεν πλήρωσαν όλοι ακόμα, απλά ανεβάζουμε τον μετρητή πληρωμών
             await supabase.from('active_splits').update({ paid_parts: newPaidParts }).eq('id', currentSplit.id);
           }
         }
      }
    } catch (dbError) {
      console.error('Σφάλμα Webhook DB:', dbError);
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}