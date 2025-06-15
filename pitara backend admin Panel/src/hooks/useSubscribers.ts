import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Subscriber {
  id: string;
  user_id?: string;
  email: string;
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
  created_at: string;
  updated_at: string;
}

/**
 * useSubscribers
 * --------------
 * Retrieves the full list of subscribers and stays in sync with Postgres
 * changes so the UI reflects real-time updates (e.g., new sign-ups, plan
 * renewals, cancellations).
 */
export function useSubscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        // @ts-ignore – table exists but may not be in types yet
        .from("subscribers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[useSubscribers] Failed to fetch subscribers:", error.message);
      } else if (data) {
        setSubscribers(data as Subscriber[]);
      }
      setLoading(false);
    }

    load();

    // Listen to INSERT/UPDATE/DELETE events
    const channel = supabase
      .channel("realtime:subscribers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscribers" },
        (payload) => {
          const newRow = payload.new as Subscriber;
          const oldRow = payload.old as Subscriber | undefined;

          switch (payload.eventType) {
            case "INSERT":
              setSubscribers((prev) => [newRow, ...prev]);
              break;
            case "UPDATE":
              setSubscribers((prev) =>
                prev.map((s) => (s.id === newRow.id ? newRow : s))
              );
              break;
            case "DELETE":
              if (oldRow) {
                setSubscribers((prev) => prev.filter((s) => s.id !== oldRow.id));
              }
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { subscribers, loading };
} 