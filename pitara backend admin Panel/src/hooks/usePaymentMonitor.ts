import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Payment {
  id: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  user_email: string;
  plan_id: string;
  amount: number; // stored in paise (integer)
  currency: string;
  status: "created" | "authorized" | "paid" | "captured" | "failed" | "cancelled";
  payment_method?: string;
  created_at: string;
  updated_at: string;
}

/**
 * usePaymentMonitor
 * ------------------
 * Fetches the most recent payments and keeps the list updated in real-time
 * using Supabase Postgres Changes. The hook is completely client-side and
 * therefore safe to use inside the admin panel.
 *
 * @param limit Number of records to keep in memory (defaults to 20)
 */
export function usePaymentMonitor(limit: number = 20) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      const { data, error } = await supabase
        // @ts-ignore — payments table exists but may not be in generated types
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[usePaymentMonitor] Error fetching payments:", error.message);
      }

      if (data) setPayments(data as Payment[]);
      setLoading(false);
    }

    loadInitial();

    const channel = supabase
      .channel("realtime:payments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        (payload) => {
          const newRow = payload.new as Payment;
          const oldRow = payload.old as Payment | undefined;

          switch (payload.eventType) {
            case "INSERT":
              setPayments((prev) => [newRow, ...prev].slice(0, limit));
              break;
            case "UPDATE":
              setPayments((prev) =>
                prev.map((p) => (p.id === newRow.id ? newRow : p))
              );
              break;
            case "DELETE":
              if (oldRow) {
                setPayments((prev) => prev.filter((p) => p.id !== oldRow.id));
              }
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return { payments, loading };
} 