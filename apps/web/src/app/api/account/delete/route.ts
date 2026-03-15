import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  // Authenticate user via Bearer token (mobile) or session cookie (web)
  const authHeader = request.headers.get('authorization');
  let userId: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const admin = createAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (user && !error) userId = user.id;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  try {
    // Delete user data in dependency order
    // 1. Alert history (references tracked_entities)
    await admin
      .from('alert_history')
      .delete()
      .eq('user_id', userId);

    // 2. Tracked entities
    await admin
      .from('tracked_entities')
      .delete()
      .eq('user_id', userId);

    // 3. Category order preferences
    await admin
      .from('category_order')
      .delete()
      .eq('user_id', userId);

    // 4. Push subscriptions
    await admin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    // 5. Profile
    await admin
      .from('profiles')
      .delete()
      .eq('id', userId);

    // 6. Delete the auth user
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Account deletion error:', err);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
