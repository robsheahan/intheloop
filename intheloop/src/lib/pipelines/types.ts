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
