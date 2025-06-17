import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@pitara/supabase';
import { useAuth } from './useAuth';

interface Subscription {
  id: string;
  user_id: string;
  subscription_tier: string;
  subscribed: boolean;
  subscription_end: string;
  created_at: string;
  updated_at: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  period_days: number;
  description?: string;
  features?: string[];
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setSubscription(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isSubscribed = subscription?.subscribed && 
    subscription?.subscription_end && 
    new Date(subscription.subscription_end) > new Date();

  const subscriptionTier = subscription?.subscription_tier;
  const subscriptionEnd = subscription?.subscription_end;

  const createSubscription = useCallback(async (planId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('subscribers')
        .insert({
          user_id: user.id,
          email: user.email,
          subscription_tier: planId,
          subscribed: true,
          subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setSubscription(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  const updateSubscription = useCallback(async (updates: Partial<Subscription>) => {
    if (!user || !subscription) throw new Error('No subscription to update');

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
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [user, subscription]);

  const refreshSubscription = useCallback(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    subscription,
    loading,
    error,
    isSubscribed,
    subscriptionTier,
    subscriptionEnd,
    createSubscription,
    updateSubscription,
    refreshSubscription
  };
}; 