import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getPipeline } from '@/lib/pipelines';
import { PipelineEntity } from '@/lib/pipelines/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pipeline = getPipeline(slug);
  if (!pipeline) {
    return NextResponse.json({ error: `No pipeline for "${slug}"` }, { status: 404 });
  }

  const admin = createAdminClient();

  const { data: category } = await admin
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .single();

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const { data: entities } = await admin
    .from('tracked_entities')
    .select('id, entity_name, entity_metadata, user_id')
    .eq('category_id', category.id)
    .eq('user_id', user.id);

  if (!entities || entities.length === 0) {
    return NextResponse.json({ success: true, new_alerts: 0, message: 'No tracked items' });
  }

  try {
    const results = await pipeline({ entities: entities as PipelineEntity[] });
    let newAlerts = 0;

    for (const result of results) {
      const entity = entities.find((e) => e.id === result.tracked_entity_id);
      if (!entity) continue;

      const { error: insertError } = await admin
        .from('alert_history')
        .insert({
          user_id: user.id,
          tracked_entity_id: result.tracked_entity_id,
          content: result.content,
          dedup_key: result.dedup_key,
        })
        .select()
        .single();

      if (!insertError) {
        newAlerts++;
      }
    }

    return NextResponse.json({ success: true, new_alerts: newAlerts, total_results: results.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Pipeline failed' },
      { status: 500 }
    );
  }
}
