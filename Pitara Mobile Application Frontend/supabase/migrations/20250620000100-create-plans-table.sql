/* 2025-06-20 00:01:00 – create plans table + seed default plans */

-- Enable pgcrypto for gen_random_uuid if not already
create extension if not exists pgcrypto;

-- 1. Table
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  duration_days integer not null,
  price_inr integer not null,
  razorpay_plan_id text, -- to be filled once Razorpay plans are created
  active boolean default true not null,
  created_at timestamptz default now()
);

-- 2. Seed rows (simple & concise)
insert into public.plans (slug, name, duration_days, price_inr)
values
  ('trial', 'Trial', 3, 99),
  ('starter', 'Starter', 15, 149),
  ('popular', 'Popular', 30, 199),
  ('extended', 'Extended', 90, 299),
  ('premium', 'Premium', 180, 599),
  ('ultimate', 'Ultimate', 365, 699)
  on conflict (slug) do nothing; 