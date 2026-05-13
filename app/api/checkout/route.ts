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
    let webhookType = type; // Θα το περάσουμε στο Stripe για να ξέρει το Webhook τι να κάνει

    // 1. Ελέγχουμε αν υπάρχει ΗΔΗ ενεργό split για αυτό το τραπέζι στη βάση
    const { data: activeSplit } = await supabase
      .from('active_splits')
      .select('*')
      .eq('table_number', tableNumber)
      .maybeSingle();

    if (activeSplit) {
      // Αν το τραπέζι είναι κλειδωμένο σε split, το ποσό είναι αυστηρά το μερίδιο!
      finalAmount = Number(activeSplit.split_amount);
      webhookType = 'pay_existing_split'; // Λέμε στο Webhook ότι κάποιος πληρώνει το μερίδιό του
    } else {
      // 2. Αν δεν υπάρχει split, υπολογίζουμε το ποσό ανάλογα με το τι διάλεξε
      if (type === 'own' && itemIds && itemIds.length > 0) {
        const { data, error } = await supabase.from('order_items').select('price').in('id', itemIds).eq('is_paid', false);
        if (error) throw error;
        finalAmount = data?.reduce((sum, item) => sum + Number(item.price), 0) || 0;
      } else if (type === 'full' || type === 'equal') {
        const { data, error } = await supabase.from('order_items').select('price').eq('table_number', tableNumber).eq('is_paid', false);
        if (error) throw error;
        const totalRemaining = data?.reduce((sum, item) => sum + Number(item.price), 0) || 0;

        if (type === 'full') {
          finalAmount = totalRemaining;
        } else if (type === 'equal') {
          finalAmount = totalRemaining / splitCount;
          webhookType = 'create_new_split'; // Λέμε στο Webhook "Ο πρώτος πλήρωσε, φτιάξε το κλείδωμα!"
        }
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