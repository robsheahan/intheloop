import { useQuery } from '@tanstack/react-query';
import { createClient, queryWithTimeout } from '@/lib/supabase/client';
import { Category } from '@tmw/shared/types/database';
import { useAuth } from '@/context/AuthContext';

export function useCategories() {
  const supabase = createClient();
  const { user } = useAuth();

  return useQuery<Category[]>({
    queryKey: ['categories'],
    enabled: !!user,
    queryFn: () =>
      queryWithTimeout<Category[]>(
        supabase.from('categories').select('*').order('sort_order'),
      ),
  });
}
