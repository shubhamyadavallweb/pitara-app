import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Payment {
  id: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  user_email: string;
  plan_id: string;
  amount: number; // in paise
  currency: string;
  status: 'created' | 'paid' | 'captured' | 'authorized' | 'failed' | 'cancelled';
  payment_method?: string;
  created_at: string;
  updated_at: string;
}

export const usePaymentMonitor = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPaymentAlert, setNewPaymentAlert] = useState<Payment | null>(null);

  // Fetch initial payments
  const fetchPayments = async () => {
    try {
      // @ts-ignore - payments table exists but not in generated types yet
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPayments(data as Payment[] || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();

    // 🚀 Real-time payment monitoring
    const channel = supabase
      .channel('payment-monitor')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          console.log('💰 Payment event:', payload);
          
          if (payload.eventType === 'INSERT') {
            // New payment created
            const newPayment = payload.new as Payment;
            setPayments(prev => [newPayment, ...prev]);
            setNewPaymentAlert(newPayment);
            
            // Show notification
            console.log(`🔔 NEW PAYMENT: ₹${newPayment.amount / 100} from ${newPayment.user_email}`);
            
            // Clear alert after 5 seconds
            setTimeout(() => setNewPaymentAlert(null), 5000);
          } 
          else if (payload.eventType === 'UPDATE') {
            // Payment status updated (e.g., from 'created' to 'paid')
            const updatedPayment = payload.new as Payment;
            setPayments(prev => 
              prev.map(p => p.id === updatedPayment.id ? updatedPayment : p)
            );
            
            if (updatedPayment.status === 'paid') {
              console.log(`✅ PAYMENT COMPLETED: ₹${updatedPayment.amount / 100} from ${updatedPayment.user_email}`);
            }
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper functions
  const getTotalRevenue = () => {
    return payments
      .filter(p => p.status === 'paid')
      .reduce((total, payment) => total + payment.amount, 0) / 100; // Convert to rupees
  };

  const getTodaysPayments = () => {
    const today = new Date().toDateString();
    return payments.filter(p => 
      new Date(p.created_at).toDateString() === today
    );
  };

  const getPaymentsByStatus = (status: Payment['status']) => {
    return payments.filter(p => p.status === status);
  };

  return {
    payments,
    loading,
    newPaymentAlert,
    getTotalRevenue,
    getTodaysPayments,
    getPaymentsByStatus,
    refreshPayments: fetchPayments
  };
}; 