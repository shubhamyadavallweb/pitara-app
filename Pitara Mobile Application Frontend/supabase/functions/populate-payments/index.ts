// deno-lint-ignore-file
// @ts-nocheck

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log('Populating payments table with sample data...');

    // Insert Shubham's payment record
    const { data: insertedPayments, error: insertError } = await supabase
      .from('payments')
      .insert([
        {
          razorpay_order_id: 'order_shubham_99_trial',
          razorpay_payment_id: 'pay_shubham_99_success', 
          user_email: 'shubham.1614@gmail.com',
          plan_id: 'trial',
          amount: 9900, // 99 rupees in paise
          currency: 'INR',
          status: 'paid',
          payment_method: 'card',
          metadata: {
            plan_name: 'Trial',
            customer_name: 'Shubham Yadav',
            receipt: 'receipt_shubham_trial'
          }
        },
        // Add a few more sample records to show the functionality
        {
          razorpay_order_id: 'order_sample_1',
          user_email: 'user1@example.com',
          plan_id: 'starter',
          amount: 14900, // 149 rupees in paise
          currency: 'INR',
          status: 'paid',
          payment_method: 'upi',
          metadata: {
            plan_name: 'Starter',
            customer_name: 'Sample User 1'
          }
        },
        {
          razorpay_order_id: 'order_sample_pending',
          user_email: 'user2@example.com',
          plan_id: 'popular',
          amount: 19900, // 199 rupees in paise
          currency: 'INR',
          status: 'created', // Pending payment
          payment_method: null,
          metadata: {
            plan_name: 'Popular',
            customer_name: 'Sample User 2'
          }
        }
      ])
      .select();

    if (insertError) {
      console.error('Error inserting payments:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to populate payments', details: insertError.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully inserted payments:', insertedPayments);

    // Verify the data was inserted
    const { data: allPayments, error: selectError } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (selectError) {
      console.error('Error fetching payments:', selectError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payments table populated successfully!',
        insertedCount: insertedPayments?.length || 0,
        totalPayments: allPayments?.length || 0,
        payments: allPayments || []
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 