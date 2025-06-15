-- Populate payments table with sample data including Shubham's payment
-- This will make the payments table show data in Supabase dashboard

INSERT INTO public.payments (
  razorpay_order_id,
  razorpay_payment_id,
  user_email,
  plan_id,
  amount,
  currency,
  status,
  payment_method,
  metadata,
  created_at,
  updated_at
) VALUES 
-- Shubham's 99₹ trial payment
(
  'order_shubham_99_trial',
  'pay_shubham_99_success',
  'shubham.1614@gmail.com',
  'trial',
  9900, -- 99 rupees in paise
  'INR',
  'paid',
  'card',
  '{"plan_name": "Trial", "customer_name": "Shubham Yadav", "receipt": "receipt_shubham_trial"}',
  NOW() - INTERVAL '1 hour', -- 1 hour ago
  NOW() - INTERVAL '1 hour'
),
-- Sample payment 1
(
  'order_sample_starter_149',
  'pay_sample_starter_success',
  'user1@example.com',
  'starter',
  14900, -- 149 rupees in paise
  'INR',
  'paid',
  'upi',
  '{"plan_name": "Starter", "customer_name": "Sample User 1"}',
  NOW() - INTERVAL '2 hours', -- 2 hours ago
  NOW() - INTERVAL '2 hours'
),
-- Sample payment 2 (pending)
(
  'order_sample_popular_pending',
  NULL, -- No payment ID yet (pending)
  'user2@example.com',
  'popular',
  19900, -- 199 rupees in paise
  'INR',
  'created', -- Pending payment
  NULL,
  '{"plan_name": "Popular", "customer_name": "Sample User 2"}',
  NOW() - INTERVAL '30 minutes', -- 30 minutes ago
  NOW() - INTERVAL '30 minutes'
),
-- Sample payment 3
(
  'order_sample_premium_599',
  'pay_sample_premium_success',
  'user3@example.com',
  'premium',
  59900, -- 599 rupees in paise
  'INR',
  'paid',
  'netbanking',
  '{"plan_name": "Premium", "customer_name": "Sample User 3"}',
  NOW() - INTERVAL '3 hours', -- 3 hours ago
  NOW() - INTERVAL '3 hours'
);

-- Check the inserted data
SELECT 
  user_email,
  plan_id,
  amount/100 as amount_rupees,
  status,
  payment_method,
  created_at
FROM public.payments 
ORDER BY created_at DESC; 