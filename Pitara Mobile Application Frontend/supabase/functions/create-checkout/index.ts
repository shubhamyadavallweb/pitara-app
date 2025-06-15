// deno-lint-ignore-file
// @ts-nocheck

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

interface CreateCheckoutPayload {
  plan_id: string;
  customer_name?: string;
  customer_email?: string;
}

// Fetch primary provider from database (lazy loaded below)
let RAZORPAY_KEY_ID = '';
let RAZORPAY_KEY_SECRET = '';
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

    /*
     * STEP 1: Determine which payment provider to use.
     * We always pick the primary active provider first. If payment fails due
     * to provider error (non-HTTP 2xx), we will automatically fall back to
     * the next active provider ordered by created_at desc.
     */
    const { data: providers, error: providersErr } = await supabase
      .from('payment_providers')
      .select('*')
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (providersErr || !providers?.length) {
      console.error('No active payment providers found', providersErr);
      return new Response(JSON.stringify({ error: 'Payment service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // We'll iterate over providers until a payment succeeds
    let lastProviderError: string | null = null;

    for (const provider of providers) {
      if (provider.type !== 'razorpay') {
        console.log(`Provider ${provider.name} of type ${provider.type} not yet supported, skipping`);
        continue; // until we add Stripe/Paytm modules
      }

      RAZORPAY_KEY_ID = provider.api_key;
      RAZORPAY_KEY_SECRET = provider.api_secret;

      // Ensure keys exist
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        console.warn(`Provider ${provider.name} is missing credentials, skipping`);
        continue;
      }

      // Wrap the existing Razorpay logic in a try/catch so on failure we fall back
      try {
        const basicAuthHeader = () => {
          const token = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
          return `Basic ${token}`;
        };

        // Get user from session if available
        const authHeader = req.headers.get('authorization');
        let user = null;
        let user_id = null;
        
        if (authHeader) {
          try {
            const { data: { user: sessionUser } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
            user = sessionUser;
            user_id = user?.id;
          } catch (err) {
            console.log('No valid session, proceeding without user ID');
          }
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

        if (!planRow.razorpay_plan_id || planRow.razorpay_plan_id.startsWith('plan_')) {
          // For now, create a simple payment order instead of subscription
          console.log('No Razorpay plan ID, creating payment order instead');
          
          const paymentData = {
            amount: parseInt(planRow.price) * 100, // Convert to paise
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            payment_capture: 1,
            notes: {
              plan_id: payload.plan_id,
              plan_name: planRow.name,
              user_email: payload.customer_email || user?.email || 'unknown',
              user_id: user_id || 'unknown'
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

          // ✅ CRITICAL: Store payment details in database
          const { error: paymentInsertError } = await supabase
            .from('payments')
            .insert({
              razorpay_order_id: orderData.id,
              user_id: user_id,
              user_email: payload.customer_email || user?.email || 'unknown',
              plan_id: payload.plan_id,
              amount: paymentData.amount,
              currency: paymentData.currency,
              status: 'created',
              metadata: {
                plan_name: planRow.name,
                customer_name: payload.customer_name,
                receipt: paymentData.receipt
              }
            });

          if (paymentInsertError) {
            console.error('Failed to store payment in database:', paymentInsertError);
            // Continue anyway - don't fail the order creation
          }

          // Return order details for frontend to handle Razorpay checkout
          return new Response(
            JSON.stringify({ 
              order_id: orderData.id,
              razorpay_key: RAZORPAY_KEY_ID,
              amount: paymentData.amount,
              currency: paymentData.currency,
              name: 'Pitara',
              description: `${planRow.name} Plan`,
              prefill: {
                email: payload.customer_email || user?.email || '',
                name: payload.customer_name || user?.user_metadata?.full_name || ''
              }
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
      } catch (providerErr) {
        console.error(`Provider ${provider.name} failed`, providerErr);
        lastProviderError = (providerErr as Error)?.message ?? String(providerErr);
        // Continue to next provider
      }
    }

    // If we reach here, all providers failed
    return new Response(JSON.stringify({ error: lastProviderError || 'All payment providers failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

// Disable JWT verification for public access
export const config = {
  auth: false
}; 