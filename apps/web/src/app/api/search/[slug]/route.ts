import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getSearchFunction } from '@tmw/shared/search';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const query = request.nextUrl.searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  // Auth check: cookie session or Bearer token (mobile app)
  const authHeader = request.headers.get('authorization');
  let authenticated = false;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const admin = createAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (user && !error) authenticated = true;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) authenticated = true;
  }

  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchFn = getSearchFunction(slug);
  if (!searchFn) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await searchFn(query);
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error(`Search error for ${slug}:`, err);
    return NextResponse.json({ suggestions: [] });
  }
}
