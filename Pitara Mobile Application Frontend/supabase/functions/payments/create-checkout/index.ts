// deno-lint-ignore-file
// @ts-nocheck

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

interface CreateCheckoutPayload {
  plan_id: string;
  customer_name?: string;
  customer_email?: string;
}

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
// Use the default injected service role key in Edge Functions. Fallback to legacy name for local dev.
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';

console.log('Environment check:', {
  hasRazorpayKey: !!RAZORPAY_KEY_ID,
  hasRazorpaySecret: !!RAZORPAY_KEY_SECRET,
  hasSupabaseUrl: !!SUPABASE_URL,
  hasSupabaseKey: !!SUPABASE_SERVICE_KEY
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function basicAuthHeader() {
  const token = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  return `Basic ${token}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

serve(async (req: Request) => {
  // CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }), 
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('Processing create-checkout request');
    
    const payload = (await req.json()) as CreateCheckoutPayload;
    console.log('Received payload:', { plan_id: payload.plan_id });
    
    if (!payload.plan_id) {
      return new Response(JSON.stringify({ error: 'plan_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if required environment variables are set
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Missing Razorpay credentials');
      return new Response(JSON.stringify({ error: 'Payment service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    /*
     * Translate our public plan_id (the one stored in the `plans` table)
     * to the real Razorpay plan id. We expect a column called
     * `razorpay_plan_id` to exist. If not found we bail early.
     */
    console.log('Fetching plan from database:', payload.plan_id);
    const { data: planRow, error: planErr } = await supabase
      // @ts-ignore – plans table may not be in generated types
      .from<any>('plans')
      .select('razorpay_plan_id, name, price')
      .eq('id', payload.plan_id)
      .maybeSingle();

    if (planErr) {
      console.error('Failed to fetch plan', planErr);
      return new Response(JSON.stringify({ error: 'Failed to fetch plan details' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Plan data from DB:', planRow);

    if (!planRow) {
      return new Response(JSON.stringify({
        error: `Plan ${payload.plan_id} not found`,
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!planRow.razorpay_plan_id) {
      // For now, create a simple payment link instead of subscription
      console.log('No Razorpay plan ID, creating payment link instead');
      
      const paymentData = {
        amount: parseInt(planRow.price) * 100, // Convert to paise
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        payment_capture: 1,
        notes: {
          plan_id: payload.plan_id,
          plan_name: planRow.name
        }
      };

      // Create Razorpay order instead of subscription
      const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: basicAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!orderResponse.ok) {
        const err = await orderResponse.text();
        console.error('Razorpay order creation failed:', err);
        return new Response(JSON.stringify({ error: 'Failed to create payment order' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const orderData = await orderResponse.json();
      console.log('Razorpay order created:', orderData.id);

      // Create a simple checkout URL (you may want to implement a proper checkout page)
      const checkoutUrl = `https://checkout.razorpay.com/v1/checkout.js?key_id=${RAZORPAY_KEY_ID}&order_id=${orderData.id}&amount=${paymentData.amount}&currency=${paymentData.currency}&name=Pitara&description=${planRow.name} Plan&prefill[email]=${payload.customer_email || ''}&prefill[name]=${payload.customer_name || ''}`;

      return new Response(
        JSON.stringify({ 
          order_id: orderData.id, 
          checkout_url: checkoutUrl,
          razorpay_key: RAZORPAY_KEY_ID,
          amount: paymentData.amount,
          currency: paymentData.currency
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const razorpayPlanId = planRow.razorpay_plan_id;
    console.log('Creating Razorpay subscription with plan:', razorpayPlanId);

    // Create Subscription in Razorpay
    const response = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: razorpayPlanId,
        customer_notify: 1,
        total_count: 12,
        ...(payload.customer_email
          ? {
              customer_notify: 1,
              customer: {
                name: payload.customer_name,
                email: payload.customer_email,
              },
            }
          : {}),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Razorpay subscription creation failed:', err);
      return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { id: subscription_id, short_url } = await response.json();
    console.log('Razorpay subscription created:', subscription_id);

    return new Response(
      JSON.stringify({ subscription_id, checkout_url: short_url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      details: err.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 