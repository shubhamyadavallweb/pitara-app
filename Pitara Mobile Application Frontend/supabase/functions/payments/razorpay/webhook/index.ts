// deno-lint-ignore-file
// @ts-nocheck

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
// Use the default injected service role key in Edge Functions. Fallback to legacy name for local dev.
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('[Webhook] Initializing...');

let webhookSecret = RAZORPAY_WEBHOOK_SECRET;

// Helper to lazy-load webhook secret from the database
async function getWebhookSecret() {
  if (webhookSecret) return webhookSecret;
  
  try {
    console.log('[Webhook] Webhook secret not in env, fetching from DB...');
    const { data: provider } = await supabase
      .from('payment_providers')
      .select('webhook_secret')
      .eq('is_primary', true)
      .eq('is_active', true)
      .maybeSingle();
      
    if (provider?.webhook_secret) {
      console.log('[Webhook] Found webhook secret in DB.');
      webhookSecret = provider.webhook_secret;
      return webhookSecret;
    } else {
      console.warn('[Webhook] No webhook secret found in DB.');
      return '';
    }
  } catch (err) {
    console.error('[Webhook] Error fetching webhook secret from DB:', err.message);
    return '';
  }
}

// HMAC-SHA256 signature verification
async function verifySignature(body: string, signature: string, secret: string) {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(body));
    const expected = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return expected === signature;
  } catch (e) {
    console.error('[Webhook] Error during signature verification:', e.message);
    return false;
  }
}

// Main logic to grant user access/subscription
async function grantUserAccess(userEmail: string, planId: string, planPeriodDays: number, paymentId: string, orderId: string) {
  console.log(`[Webhook] Granting access for ${userEmail}, Plan: ${planId}, Order: ${orderId}`);
  
  if (!userEmail || !planId || !planPeriodDays) {
    console.error('[Webhook] Missing required data for granting access.', { userEmail, planId, planPeriodDays });
    throw new Error('Internal error: Missing user email, plan ID, or plan period.');
  }
  
  // 1. Get current subscription status
  const { data: existingSubscriber, error: findError } = await supabase
    .from('subscribers')
    .select('subscription_end')
    .eq('email', userEmail)
    .maybeSingle();

  if (findError) {
    console.error(`[Webhook] Failed to check for existing subscriber ${userEmail}:`, findError.message);
    throw findError;
  }

  // 2. Calculate the new subscription end date
  const now = new Date();
  let startDate = now;

  if (existingSubscriber?.subscription_end) {
    const existingEndDate = new Date(existingSubscriber.subscription_end);
    // If the existing subscription is still active, stack on top of it.
    if (existingEndDate > now) {
      startDate = existingEndDate;
      console.log(`[Webhook] Stacking new plan on existing subscription. New start date: ${startDate.toISOString()}`);
    }
  }

  const newSubscriptionEnd = new Date(startDate);
  newSubscriptionEnd.setDate(newSubscriptionEnd.getDate() + planPeriodDays);

  console.log(`[Webhook] Subscription for ${userEmail} will now end on: ${newSubscriptionEnd.toISOString()}`);

  // 3. Upsert the new subscription details
  const { data: subscriber, error: subscriberError } = await supabase
    .from('subscribers')
    .upsert({
      email: userEmail,
      subscribed: true,
      subscription_tier: planId, // Always update to the latest plan
      subscription_end: newSubscriptionEnd.toISOString(),
      updated_at: new Date().toISOString()
    }, { 
      onConflict: 'email',
      ignoreDuplicates: false 
    })
    .select()
    .single();

  if (subscriberError) {
    console.error(`[Webhook] Failed to upsert subscriber for email ${userEmail}. Order: ${orderId}, Payment: ${paymentId}`, subscriberError);
    throw subscriberError;
  }

  console.log(`[Webhook] Successfully granted access to ${userEmail} until ${newSubscriptionEnd.toISOString()}`);
  return subscriber;
}

// Main server request handler
serve(async (req: Request) => {
  console.log(`[Webhook] Received request: ${req.method}`);
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const bodyText = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const secret = await getWebhookSecret();

  if (secret) {
    const isValid = await verifySignature(bodyText, signature, secret);
    if (!isValid) {
      console.warn('[Webhook] Invalid webhook signature received.');
      return new Response('Invalid signature', { status: 401 });
    }
    console.log('[Webhook] Signature verified successfully.');
  } else {
    console.warn('[Webhook] No webhook secret configured. Skipping signature verification. This is NOT recommended for production.');
  }

  try {
    const payload = JSON.parse(bodyText);
    const event = payload.event as string;
    
    // Unified entity extraction for payments and subscriptions
    const entity = payload.payload?.payment?.entity ?? payload.payload?.subscription?.entity;
    
    if (!entity) {
      console.log(`[Webhook] Event '${event}' received but contains no entity. Skipping.`);
      return new Response('OK (no entity)', { status: 200 });
    }

    console.log(`[Webhook] Processing event '${event}' for entity '${entity.id}'`);

    // --- ONE-TIME PAYMENT (ORDER) WORKFLOW ---
    if (event === 'payment.captured') {
      const { id: paymentId, order_id: orderId, status, method, email, amount } = entity;

      // 1. Find our corresponding payment record
      const { data: paymentRecord, error: findError } = await supabase
        .from('payments')
        .select('*')
        .eq('razorpay_order_id', orderId)
        .maybeSingle();

      if (findError) {
        console.error(`[Webhook] DB error finding payment for Order ID ${orderId}:`, findError.message);
        return new Response('Database error', { status: 500 });
      }

      if (!paymentRecord) {
        console.warn(`[Webhook] Received captured payment webhook for an unknown Order ID: ${orderId}. It might be from an old or different system.`);
        // Acknowledge to prevent Razorpay from retrying, as we can't process it.
        return new Response('OK (Order not found)', { status: 200 });
      }

      // Idempotency check: If already paid, do nothing.
      if (paymentRecord.status === 'paid') {
        console.log(`[Webhook] Order ${orderId} is already marked as paid. Skipping.`);
        return new Response('OK (Already processed)', { status: 200 });
      }
      
      // 2. Update our payment record
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          razorpay_payment_id: paymentId,
          status: 'paid', // Mark as paid
          payment_method: method,
          razorpay_signature: signature,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRecord.id);

      if (updateError) {
        console.error(`[Webhook] Failed to update payment record ${paymentRecord.id} for order ${orderId}:`, updateError.message);
        return new Response('Failed to update payment', { status: 500 });
      }
      console.log(`[Webhook] Updated payment ${paymentRecord.id} to paid.`);
      
      // 3. Get plan details to calculate access duration
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('period_days')
        .eq('id', paymentRecord.plan_id)
        .single();

      if (planError || !planData) {
        console.error(`[Webhook] Failed to get plan details for plan '${paymentRecord.plan_id}' on order ${orderId}:`, planError?.message);
        return new Response('Plan not found', { status: 404 });
      }
      
      // 4. Grant access
      await grantUserAccess(
        paymentRecord.user_email,
        paymentRecord.plan_id,
        planData.period_days,
        paymentId,
        orderId
      );

      console.log(`[Webhook] Successfully processed captured payment for order ${orderId}`);
      return new Response('Payment processed successfully', { status: 200 });
    }

    // --- RECURRING SUBSCRIPTION WORKFLOW ---
    if (event.startsWith('subscription.')) {
      console.log(`[Webhook] Handling subscription event '${event}'... (Not yet fully implemented)`);
      // Placeholder for future logic related to recurring subscriptions
      // e.g., updating 'subscriptions' table.
      // Note: For stacking recurring plans, similar logic to grantUserAccess would be needed here.
    }

    console.log(`[Webhook] Event '${event}' is not a handled event. Acknowledging.`);
    return new Response('OK (Event not handled)', { status: 200 });

  } catch (error) {
    console.error('[Webhook] Unhandled error in webhook processor:', error.message, error.stack);
    return new Response('Internal Server Error', { status: 500 });
  }
});
