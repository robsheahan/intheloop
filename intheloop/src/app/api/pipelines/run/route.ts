import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getAllPipelineSlugs, getPipeline } from '@/lib/pipelines';
import { PipelineEntity } from '@/lib/pipelines/types';

export async function POST(request: NextRequest) {
  // Auth: either cron secret or authenticated user
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  let triggeredBy = 'cron';

  if (authHeader === `Bearer ${cronSecret}` && cronSecret) {
    triggeredBy = 'cron';
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    triggeredBy = `user:${user.id}`;
  }

  const admin = createAdminClient();

  // Create pipeline run record
  const { data: run, error: runError } = await admin
    .from('pipeline_runs')
    .insert({ triggered_by: triggeredBy, status: 'running' })
    .select()
    .single();

  if (runError) {
    return NextResponse.json({ error: 'Failed to create pipeline run' }, { status: 500 });
  }

  const summary: Record<string, { total: number; new: number; errors: string[] }> = {};

  try {
    const slugs = getAllPipelineSlugs();

    for (const slug of slugs) {
      const pipeline = getPipeline(slug);
      if (!pipeline) continue;

      // Get category ID for this slug
      const { data: category } = await admin
        .from('categories')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!category) continue;

      // Get all tracked entities for this category across all users
      const { data: entities } = await admin
        .from('tracked_entities')
        .select('id, entity_name, entity_metadata, user_id')
        .eq('category_id', category.id);

      if (!entities || entities.length === 0) {
        summary[slug] = { total: 0, new: 0, errors: [] };
        continue;
      }

      // Group entities by user for context
      const byUser = new Map<string, PipelineEntity[]>();
      for (const e of entities) {
        const list = byUser.get(e.user_id) || [];
        list.push(e as PipelineEntity);
        byUser.set(e.user_id, list);
      }

      let totalNew = 0;
      const errors: string[] = [];

      for (const [, userEntities] of byUser) {
        try {
          const results = await pipeline({ entities: userEntities });

          // Insert alerts with dedup
          for (const result of results) {
            const entity = userEntities.find((e) => e.id === result.tracked_entity_id);
            if (!entity) continue;

            const { error: insertError } = await admin
              .from('alert_history')
              .insert({
                user_id: entity.user_id,
                tracked_entity_id: result.tracked_entity_id,
                content: result.content,
                dedup_key: result.dedup_key,
              })
              // ON CONFLICT DO NOTHING via upsert with ignoreDuplicates
              .select()
              .single();

            // 23505 = unique_violation (duplicate) — expected, not an error
            if (insertError && insertError.code !== '23505') {
              errors.push(`Insert error: ${insertError.message}`);
            } else if (!insertError) {
              totalNew++;
            }
          }
        } catch (err) {
          errors.push(err instanceof Error ? err.message : 'Unknown error');
        }
      }

      summary[slug] = { total: entities.length, new: totalNew, errors };
    }

    // Mark run as completed
    await admin
      .from('pipeline_runs')
      .update({ status: 'completed', completed_at: new Date().toISOString(), summary })
      .eq('id', run.id);

    return NextResponse.json({ success: true, run_id: run.id, summary });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await admin
      .from('pipeline_runs')
      .update({ status: 'failed', completed_at: new Date().toISOString(), error_message: errorMessage })
      .eq('id', run.id);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
