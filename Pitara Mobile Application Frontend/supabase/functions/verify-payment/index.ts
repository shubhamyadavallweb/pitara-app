// deno-lint-ignore-file
// @ts-nocheck

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Load Razorpay credentials either from env vars (preferred) or fall back to the primary provider row
let RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
let RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';

// Initialise Supabase client early (needed for provider fallback)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 🛟 Fallback: If Razorpay keys are not present in the environment, pull them from the `payment_providers` table
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  try {
    const { data: provider } = await supabase
      .from('payment_providers')
      .select('api_key, api_secret')
      .eq('is_primary', true)
      .eq('is_active', true)
      .maybeSingle();

    if (provider?.api_key && provider?.api_secret) {
      console.log('[verify-payment] Loaded Razorpay credentials from DB');
      RAZORPAY_KEY_ID = provider.api_key;
      RAZORPAY_KEY_SECRET = provider.api_secret;
    } else {
      console.warn('[verify-payment] No active Razorpay provider credentials found');
    }
  } catch (credErr) {
    console.error('[verify-payment] Failed to fetch Razorpay credentials:', credErr);
  }
}

// Helper to generate the Basic auth header on-demand (now that keys may be loaded dynamically)
function basicAuthHeader() {
  const token = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  return `Basic ${token}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function activateUserSubscription(userEmail: string, planId: string, planPeriodDays: number) {
  console.log(`Activating subscription for ${userEmail} with plan ${planId}`);
  
  const subscriptionEnd = new Date();
  subscriptionEnd.setDate(subscriptionEnd.getDate() + planPeriodDays);

  const { error: subscriberError } = await supabase
    .from('subscribers')
    .upsert({
      email: userEmail,
      subscribed: true,
      subscription_tier: planId,
      subscription_end: subscriptionEnd.toISOString(),
      updated_at: new Date().toISOString()
    }, { 
      onConflict: 'email',
      ignoreDuplicates: false 
    });

  if (subscriberError) {
    console.error('Failed to update subscriber:', subscriberError);
    throw subscriberError;
  }

  return { success: true, subscriptionEnd };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }), 
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required payment details' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying payment:', { razorpay_payment_id, razorpay_order_id });

    // Get payment details from Razorpay
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { Authorization: basicAuthHeader() }
    });

    if (!paymentResponse.ok) {
      throw new Error('Failed to verify payment with Razorpay');
    }

    const paymentData = await paymentResponse.json();
    
    if (paymentData.order_id !== razorpay_order_id) {
      throw new Error('Payment order ID mismatch');
    }

    /*
     * Razorpay might return the payment in an `authorized` state for a few seconds before it
     * is auto-captured (because we created the order with `payment_capture=1`). To provide a
     * smoother UX we:
     *   1. Accept both `captured` and `authorized` as valid success states.
     *   2. If the payment is only `authorized`, we **attempt a capture** immediately so the
     *      subscription can be activated right away. If the capture fails we still proceed
     *      and mark the payment as `authorized` – the webhook will reconcile later.
     */

    if (paymentData.status === 'authorized') {
      try {
        console.log('[verify-payment] Payment is authorised, attempting capture…');
        const captureResp = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}/capture`, {
          method: 'POST',
          headers: {
            Authorization: basicAuthHeader(),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: `amount=${paymentData.amount}`
        });

        if (captureResp.ok) {
          const captureJson = await captureResp.json();
          paymentData.status = captureJson.status;
          console.log('[verify-payment] Capture result:', captureJson.status);
        } else {
          console.warn('[verify-payment] Capture attempt failed (non-blocking)');
        }
      } catch (capErr) {
        console.error('[verify-payment] Capture error (non-blocking):', capErr);
      }
    }

    if (!['captured', 'authorized', 'paid'].includes(paymentData.status)) {
      return new Response(
        JSON.stringify({ error: 'Payment not completed', status: paymentData.status }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get our payment record
    const { data: ourPayment, error: paymentError } = await supabase
      .from('payments')
      .select('user_email, plan_id, status')
      .eq('razorpay_order_id', razorpay_order_id)
      .single();

    if (paymentError || !ourPayment) {
      throw new Error('Payment record not found in our database');
    }

    if (ourPayment.status === 'paid') {
      return new Response(
        JSON.stringify({ message: 'Payment already processed', alreadyProcessed: true }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment status
    await supabase
      .from('payments')
      .update({
        razorpay_payment_id: razorpay_payment_id,
        status: paymentData.status === 'authorized' ? 'authorized' : 'paid',
        razorpay_signature: razorpay_signature,
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_order_id', razorpay_order_id);

    // Get plan details
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('period_days')
      .eq('id', ourPayment.plan_id)
      .single();

    if (planError || !planData) {
      throw new Error('Plan details not found');
    }

    // Activate subscription
    const subscriptionResult = await activateUserSubscription(
      ourPayment.user_email,
      ourPayment.plan_id,
      planData.period_days
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment verified and subscription activated',
        subscriptionEnd: subscriptionResult.subscriptionEnd
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ error: 'Payment verification failed', details: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Disable JWT verification so this function can be called from webhook or client without auth
export const config = {
  auth: false,
}; 