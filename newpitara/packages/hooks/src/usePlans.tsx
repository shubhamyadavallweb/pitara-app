import { useState, useEffect } from 'react';
import { supabase } from '@pitara/supabase';

interface Plan {
  id: string;
  name: string;
  price: number;
  period_days: number;
  description?: string;
  features?: string[];
  is_active: boolean;
  created_at: string;
}

export const usePlans = () => {
  const [data, setData] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: plans, error: fetchError } = await supabase
          .from('plans')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true });

        if (fetchError) throw fetchError;

        setData(plans || []);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching plans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return { data, loading, error };
}; 