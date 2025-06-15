import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';

interface Subscription {
  id: string;
  user_id: string;
  email: string;
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  stripe_customer_id: string | null;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSubscription = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: subscriptionError } = await supabase
        .from('subscribers')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (subscriptionError) throw subscriptionError;

      let subscriptionData = data as Subscription | null;

      // 🔄 If no row, check latest successful payment and auto-create subscription
      if (!subscriptionData) {
        const { data: paymentData, error: paymentError } = await supabase
          // @ts-ignore payments table exists
          .from('payments')
          .select('*')
          .eq('user_email', user.email)
          .in('status', ['paid', 'captured', 'authorized', 'created'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (paymentError) throw paymentError;

        if (paymentData) {
          const { plan_id, created_at } = paymentData as any;

          // Fetch plan period to compute expiry
          const { data: planRow } = await supabase
            .from('plans')
            .select('period_days')
            .eq('id', plan_id)
            .single();

          const periodDays = planRow?.period_days ?? 0;
          const expiry = new Date(created_at);
          expiry.setDate(expiry.getDate() + periodDays);

          // Upsert subscription row to avoid duplicate-key race conditions
          const { data: upsertedSub, error: upsertErr } = await supabase
            .from('subscribers')
            .upsert({
              user_id: user.id,
              email: user.email,
              subscribed: true,
              subscription_tier: plan_id,
              subscription_end: expiry.toISOString()
            }, { onConflict: 'email' })
            .select()
            .single();

          if (upsertErr) throw upsertErr;

          subscriptionData = upsertedSub as Subscription;
        }
      }

      // Auto-mark expired subscriptions as unsubscribed in DB
      if (subscriptionData && subscriptionData.subscribed && subscriptionData.subscription_end) {
        const expiry = new Date(subscriptionData.subscription_end);
        if (!isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
          try {
            const { data: updatedRow, error: updateErr } = await supabase
              .from('subscribers')
              .update({ subscribed: false })
              .eq('id', subscriptionData.id)
              .select()
              .maybeSingle();

            if (!updateErr && updatedRow) {
              subscriptionData = updatedRow as Subscription;
            }
          } catch (ignore) {
            console.warn('Failed to auto-unsubscribe expired subscription (non-blocking)', ignore);
          }
        }
      }

      setSubscription(subscriptionData);

      console.log('Subscription data loaded:', subscriptionData);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (tier: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscribers')
        .insert({
          user_id: user.id,
          email: user.email,
          subscribed: true,
          subscription_tier: tier,
          subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setSubscription(data);
      return data;
    } catch (err) {
      console.error('Error creating subscription:', err);
      throw err;
    }
  };

  const updateSubscription = async (updates: Partial<Subscription>) => {
    if (!subscription) return;

    try {
      const { data, error } = await supabase
        .from('subscribers')
        .update(updates)
        .eq('id', subscription.id)
        .select()
        .single();

      if (error) throw error;

      setSubscription(data);
      return data;
    } catch (err) {
      console.error('Error updating subscription:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchSubscription();

    // Set up real-time subscription for subscription updates
    if (user) {
      const channel = supabase
        .channel('subscription-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'subscribers',
            filter: `email=eq.${user.email}`
          },
          (payload) => {
            console.log('Subscription changed:', payload);
            fetchSubscription();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const isSubscribed = (() => {
    if (!subscription) return false;
    if (!subscription.subscribed) return false;

    // If subscription_end provided and already passed, treat as not subscribed
    if (subscription.subscription_end) {
      const expiry = new Date(subscription.subscription_end);
      if (isNaN(expiry.getTime()) || expiry.getTime() < Date.now()) {
        return false;
      }
    }

    return true;
  })();
  const subscriptionTier = subscription?.subscription_tier;
  const subscriptionEnd = subscription?.subscription_end;

  return {
    subscription,
    loading,
    error,
    isSubscribed,
    subscriptionTier,
    subscriptionEnd,
    createSubscription,
    updateSubscription,
    refreshSubscription: fetchSubscription
  };
};
