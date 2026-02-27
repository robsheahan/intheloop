import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSearchFunction } from '@/lib/search';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const query = request.nextUrl.searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
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
