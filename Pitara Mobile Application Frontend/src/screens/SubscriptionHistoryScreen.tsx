import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, History, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

// Define the structure of a payment record
interface PaymentRecord {
  id: string;
  created_at: string;
  amount: number; // stored in paise
  currency: string;
  plan_id: string;
  status: string;
  plans: {
    name: string;
    description: string;
    period_days?: number;
  } | null;
}

const SubscriptionHistoryScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.email) {
        setLoading(false);
        setError("User not authenticated.");
        return;
      }

      try {
        setLoading(true);

        const emailLower = user.email.toLowerCase();

        const { data, error: fetchError } = await supabase
          .from('payments')
          .select(`
            id,
            created_at,
            amount,
            currency,
            plan_id,
            status,
            plans (
              name,
              description,
              period_days
            )
          `)
          .ilike('user_email', emailLower)
          .in('status', ['paid', 'captured', 'authorized'])
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        let historyData: PaymentRecord[] = data || [];

        // 🔄 Fallback: if no payment records found, build one from subscriber info
        if (historyData.length === 0) {
          const { data: subscriberRow } = await supabase
            .from('subscribers')
            .select('id, subscription_tier, subscription_end, created_at')
            .eq('email', emailLower)
            .is('subscribed', true)
            .single();

          if (subscriberRow && subscriberRow.subscription_tier) {
            // Fetch the plan info
            const { data: planRow } = await supabase
              .from('plans')
              .select('id, name, description, price, period_days')
              .eq('id', subscriberRow.subscription_tier)
              .single();

            if (planRow) {
              // Compute purchase date = subscription_end - period
              const purchaseDate = (() => {
                if (subscriberRow.subscription_end) {
                  const endDate = new Date(subscriberRow.subscription_end);
                  const startDate = new Date(endDate);
                  startDate.setDate(startDate.getDate() - (planRow.period_days || 0));
                  return startDate.toISOString();
                }
                return subscriberRow.created_at ?? new Date().toISOString();
              })();

              historyData = [{
                id: `sub-${subscriberRow.id}`,
                created_at: purchaseDate,
                amount: (planRow.price ?? 0) * 100,
                currency: 'INR',
                plan_id: planRow.id,
                status: 'paid',
                plans: {
                  name: planRow.name,
                  description: planRow.description,
                  period_days: planRow.period_days
                }
              }];
            }
          }
        }

        setHistory(historyData);
      } catch (err: any) {
        console.error("Error fetching subscription history:", err);
        setError("Failed to load your subscription history. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (error) {
      return <p className="text-center text-red-500">{error}</p>;
    }

    if (history.length === 0) {
      return (
        <div className="text-center py-10">
          <History className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-100">No History Found</h3>
          <p className="mt-1 text-sm text-gray-500">You haven't made any purchases yet.</p>
        </div>
      );
    }

    return (
      <ul className="space-y-4">
        {history.map((item, index) => {
          // Calculate expiry & days left
          const period = item.plans?.period_days ?? 0;
          const purchaseDate = new Date(item.created_at);
          const expiryDate = (() => {
            const d = new Date(purchaseDate);
            d.setDate(d.getDate() + period);
            return d;
          })();
          const daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000*60*60*24)));

          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-background-secondary p-4 rounded-lg shadow-md flex items-center space-x-4"
            >
              <div className="bg-primary/20 p-3 rounded-full">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white text-lg">{item.plans?.name || 'Unknown Plan'}</p>
                <p className="text-sm text-gray-400">
                  Purchased on {format(purchaseDate, 'MMMM d, yyyy')}
                </p>
                {period > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Expires on {format(expiryDate, 'MMMM d, yyyy')} ({daysLeft} days left)
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-lg text-primary">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: item.currency || 'INR' }).format(item.amount / 100)}
                </p>
                <p className="text-xs text-gray-500 capitalize">{item.status}</p>
              </div>
            </motion.li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="min-h-screen bg-background-primary text-white p-4 sm:p-6">
      <header className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-4">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold">Purchase History</h1>
      </header>
      <main>
        {renderContent()}
      </main>
    </div>
  );
};

export default SubscriptionHistoryScreen; 