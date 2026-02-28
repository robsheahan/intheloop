import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';
import { buildDigestHtml, renderAlertTitle, renderAlertDescription } from './digest-template';

interface AlertRow {
  id: string;
  user_id: string;
  content: Record<string, unknown>;
  tracked_entity: {
    entity_name: string;
    category: {
      id: string;
      name: string;
      slug: string;
      color: string;
    };
  };
}

interface EmailPrefRow {
  category_id: string;
  enabled: boolean;
}

/**
 * Sends digest emails for alerts created since `runStartedAt`.
 * Skips users who have no qualifying alerts or have disabled the relevant categories.
 */
export async function sendDigestEmails(runStartedAt: string): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM ?? 'In The Loop <onboarding@resend.dev>';

  if (!resendKey) {
    return { sent: 0, skipped: 0, errors: ['Missing RESEND_API_KEY'] };
  }

  const admin = createAdminClient();
  const resend = new Resend(resendKey);

  // 1. Fetch all alerts created during this pipeline run, with entity + category
  const { data: alerts, error: alertsError } = await admin
    .from('alert_history')
    .select('id, user_id, content, tracked_entity:tracked_entities(entity_name, category:categories(id, name, slug, color))')
    .gte('created_at', runStartedAt);

  if (alertsError) {
    return { sent: 0, skipped: 0, errors: [`Failed to fetch alerts: ${alertsError.message}`] };
  }

  if (!alerts || alerts.length === 0) {
    return { sent: 0, skipped: 0, errors: [] };
  }

  const typedAlerts = alerts as unknown as AlertRow[];

  // 2. Get unique user IDs
  const userIds = [...new Set(typedAlerts.map((a) => a.user_id))];

  // 3. Fetch email preferences (only disabled ones matter — default is opted-in)
  const { data: prefs } = await admin
    .from('email_preferences')
    .select('user_id, category_id, enabled')
    .in('user_id', userIds)
    .eq('enabled', false);

  // Build lookup: userId -> Set of disabled category IDs
  const disabledCategories = new Map<string, Set<string>>();
  for (const pref of (prefs ?? []) as (EmailPrefRow & { user_id: string })[]) {
    if (!disabledCategories.has(pref.user_id)) {
      disabledCategories.set(pref.user_id, new Set());
    }
    disabledCategories.get(pref.user_id)!.add(pref.category_id);
  }

  // 4. Fetch user emails
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email')
    .in('id', userIds);

  const emailMap = new Map<string, string>();
  for (const p of (profiles ?? []) as { id: string; email: string }[]) {
    emailMap.set(p.id, p.email);
  }

  // 5. Group alerts per user, filtering out disabled categories
  // Structure: userId -> categoryId -> { name, color, slug, alerts[] }
  const userSections = new Map<
    string,
    Map<string, { name: string; color: string; slug: string; alerts: AlertRow[] }>
  >();

  for (const alert of typedAlerts) {
    if (!alert.tracked_entity?.category) continue;

    const categoryId = alert.tracked_entity.category.id;
    const disabled = disabledCategories.get(alert.user_id);
    if (disabled?.has(categoryId)) continue;

    if (!userSections.has(alert.user_id)) {
      userSections.set(alert.user_id, new Map());
    }
    const sections = userSections.get(alert.user_id)!;
    if (!sections.has(categoryId)) {
      sections.set(categoryId, {
        name: alert.tracked_entity.category.name,
        color: alert.tracked_entity.category.color,
        slug: alert.tracked_entity.category.slug,
        alerts: [],
      });
    }
    sections.get(categoryId)!.alerts.push(alert);
  }

  // 6. Send one digest email per qualifying user
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [userId, sectionsMap] of userSections) {
    if (sectionsMap.size === 0) {
      skipped++;
      continue;
    }

    const email = emailMap.get(userId);
    if (!email) {
      skipped++;
      continue;
    }

    // Build sections for the template
    const categorySections = [...sectionsMap.values()].map((section) => ({
      name: section.name,
      color: section.color,
      alerts: section.alerts.map((a) => ({
        title: renderAlertTitle(a.content, a.content.type as string),
        description: renderAlertDescription(a.content, a.content.type as string),
        entity: a.tracked_entity.entity_name,
        url: (typeof a.content.url === 'string' && a.content.url) || null,
      })),
    }));

    const totalAlerts = categorySections.reduce((sum, s) => sum + s.alerts.length, 0);
    const html = buildDigestHtml(categorySections);

    const { error } = await resend.emails.send({
      from: emailFrom,
      to: email,
      subject: `In The Loop: ${totalAlerts} new alert${totalAlerts === 1 ? '' : 's'}`,
      html,
    });

    if (error) {
      errors.push(`Failed to send to ${email}: ${error.message}`);
    } else {
      sent++;
    }
  }

  return { sent, skipped, errors };
}
