import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient, queryWithTimeout } from '@/lib/supabase/client';
import { EmailPreference } from '@intheloop/shared/types/database';
import { useAuth } from '@/context/AuthContext';

export function useEmailPreferences() {
  const supabase = createClient();
  const { user } = useAuth();

  return useQuery<EmailPreference[]>({
    queryKey: ['email-preferences'],
    enabled: !!user,
    queryFn: () =>
      queryWithTimeout<EmailPreference[]>(
        supabase.from('email_preferences').select('*').eq('user_id', user!.id),
      ),
  });
}

export function useToggleEmailPreference() {
  const supabase = createClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      enabled,
    }: {
      categoryId: string;
      enabled: boolean;
    }) => {
      const { error } = await supabase
        .from('email_preferences')
        .upsert(
          { user_id: user!.id, category_id: categoryId, enabled },
          { onConflict: 'user_id,category_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-preferences'] });
    },
  });
}
