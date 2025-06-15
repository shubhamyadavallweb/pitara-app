### 2025-06-20
DONE: Added migration `create-plans-table.sql` creating `plans` table with six simple tiers (trial, starter, popular, extended, premium, ultimate) + seeded rows. Updated `SubscriptionScreen.tsx` to simplify `subscriptionPlans` array to match tiers (concise data). NEXT: 1) Build Supabase hook to fetch plans dynamically; 2) Integrate Razorpay checkout creation & webhook functions; 3) Connect admin dashboard realtime subscription list. 

### 2025-06-20 (cont.)
DONE: Added Razorpay integration edge functions (`payments/create-checkout`, `payments/razorpay/webhook`) with signature verification & Supabase upsert. Implemented `usePlans` React Query hook, updated `SubscriptionScreen` to fetch plans dynamically and call checkout via edge function. 
IN PROGRESS: Testing edge functions locally and updating Supabase types generation. 
NEXT: 1) Implement deep-link/redirect handling post-checkout; 2) Admin dashboard realtime subscription list; 3) Write unit/E2E tests for payment flow. 

### 2025-06-20 (cont.2)
DONE: Added `plans` privileges + RLS grant for anon/authenticated; created function aliases `create-checkout` and `razorpay-webhook`, updated subscribe invoke accordingly; fixed TS lints for badge properties. 