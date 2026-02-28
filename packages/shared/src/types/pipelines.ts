export interface PipelineResult {
  entity_name: string;
  tracked_entity_id: string;
  content: Record<string, unknown>;
  dedup_key: string;
}

export interface PipelineEntity {
  id: string;
  entity_name: string;
  entity_metadata: Record<string, unknown>;
  user_id: string;
}

export interface PipelineContext {
  entities: PipelineEntity[];
}

export type PipelineFunction = (ctx: PipelineContext) => Promise<PipelineResult[]>;

export interface PipelineRunStatus {
  id: string;
  triggered_by: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  summary: Record<string, unknown> | null;
  error_message: string | null;
}
