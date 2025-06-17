import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@pitara/supabase';

interface Payment {
  id: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  user_email: string;
  plan_id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "paid" | "captured" | "failed" | "cancelled";
  payment_method?: string;
  created_at: string;
  updated_at: string;
}

export const usePaymentMonitor = (limit: number = 20) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      setPayments(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadPayments();

    // Set up real-time subscription for payment updates
    const subscription = supabase
      .channel('payments')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          loadPayments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadPayments]);

  const getPaymentsByUser = useCallback((userEmail: string) => {
    return payments.filter(p => p.user_email === userEmail);
  }, [payments]);

  return {
    payments,
    loading,
    error,
    refresh: loadPayments,
    getPaymentsByUser
  };
}; 