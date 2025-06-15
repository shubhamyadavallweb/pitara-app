import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Plan {
  id: string;
  name: string;
  price: number;
  period_days: number;
  description?: string | null;
}

/**
 * Fetches all subscription plans from Supabase `plans` table using React Query.
 */
export const usePlans = () => {
  return useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      // We cast to any because the generated types may not yet include the `plans` table.
      const { data, error } = await supabase
        // @ts-ignore – plans table may not yet be in generated types
        .from<any>('plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as Plan[];
    },
  });
}; 