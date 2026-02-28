import { SupabaseClient } from '@supabase/supabase-js';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendPushNotifications(
  adminClient: SupabaseClient,
  alertsByUser: Map<string, { categoryNames: string[]; totalNew: number }>
) {
  if (alertsByUser.size === 0) return;

  const userIds = Array.from(alertsByUser.keys());

  // Get push tokens for these users
  const { data: tokens, error: tokenError } = await adminClient
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds);

  if (tokenError || !tokens || tokens.length === 0) return;

  // Get push preferences (users who opted out of specific categories)
  const { data: preferences } = await adminClient
    .from('push_preferences')
    .select('user_id, category_id, enabled')
    .in('user_id', userIds)
    .eq('enabled', false);

  const disabledMap = new Map<string, Set<string>>();
  for (const pref of preferences || []) {
    const set = disabledMap.get(pref.user_id) || new Set();
    set.add(pref.category_id);
    disabledMap.set(pref.user_id, set);
  }

  // Build messages
  const messages: PushMessage[] = [];

  for (const token of tokens) {
    const userAlerts = alertsByUser.get(token.user_id);
    if (!userAlerts) continue;

    const title = `${userAlerts.totalNew} new alert${userAlerts.totalNew !== 1 ? 's' : ''}`;
    const body = userAlerts.categoryNames.join(', ');

    messages.push({
      to: token.token,
      title,
      body,
      data: { screen: 'dashboard' },
    });
  }

  if (messages.length === 0) return;

  // Send in batches of 100
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        console.error('Push send failed:', await res.text());
        continue;
      }

      const result = await res.json();

      // Clean up invalid tokens
      if (result.data) {
        for (let j = 0; j < result.data.length; j++) {
          const ticket = result.data[j];
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            const failedToken = batch[j].to;
            await adminClient
              .from('push_tokens')
              .delete()
              .eq('token', failedToken);
            console.log('Removed expired push token:', failedToken);
          }
        }
      }
    } catch (err) {
      console.error('Push notification batch error:', err);
    }
  }
}
