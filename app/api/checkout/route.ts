import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

export async function POST(req: Request) {
  try {
    const { type, tableNumber, itemIds, splitCount } = await req.json();
    let finalAmount = 0;
    let webhookType = type; 

    // ΚΑΤΑΡΓΗΣΑΜΕ ΤΟ active_splits! Δεν ψάχνουμε πλέον για κλειδωμένα τραπέζια.

    if (type === 'own' && itemIds && itemIds.length > 0) {
      const { data, error } = await supabase.from('order_items').select('price').in('id', itemIds).eq('is_paid', false);
      if (error) throw error;
      finalAmount = data?.reduce((sum, item) => sum + Number(item.price), 0) || 0;
      
    } else if (type === 'full' || type === 'equal') {
      // Παίρνουμε ΟΛΑ τα απλήρωτα είδη (θετικά πιάτα ΚΑΙ αρνητικές πληρωμές)
      const { data, error } = await supabase.from('order_items').select('price').eq('table_number', tableNumber).eq('is_paid', false);
      if (error) throw error;

      // 1. Το Τελικό Υπόλοιπο (Φαγητό ΜΕΙΟΝ Πληρωμές)
      const totalRemaining = data?.reduce((sum, item) => sum + Number(item.price), 0) || 0;
      
      // 2. Η Αξία του Φαγητού ΜΟΝΟ (Αγνοούμε τα αρνητικά)
      const unpaidFoodTotal = data?.filter(item => Number(item.price) > 0).reduce((sum, item) => sum + Number(item.price), 0) || 0;

      if (type === 'full') {
        finalAmount = totalRemaining;
      } else if (type === 'equal') {
        // ΝΕΑ ΜΑΘΗΜΑΤΙΚΑ: Υπολογίζουμε το μερίδιο με βάση το ΦΑΓΗΤΟ!
        const share = unpaidFoodTotal / splitCount;
        // Ποτέ δεν χρεώνουμε παραπάνω από το τελικό υπόλοιπο
        finalAmount = Math.min(share, totalRemaining);
        webhookType = 'equal'; // Το Webhook θα το αγνοήσει, γιατί τη δουλειά την κάνει πλέον το νέο μας Frontend!
      }
    }

    if (finalAmount <= 0) return NextResponse.json({ error: 'Μη έγκυρο ποσό' }, { status: 400 });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalAmount * 100),
      currency: 'eur',
      metadata: {
        type: webhookType, 
        tableNumber: tableNumber.toString(),
        itemIds: itemIds ? itemIds.join(',') : '',
        splitCount: splitCount ? splitCount.toString() : '0',
        amount: finalAmount.toString()
      },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error('Σφάλμα Checkout API:', error);
    return NextResponse.json({ error: 'Εσωτερικό σφάλμα' }, { status: 500 });
  }
}