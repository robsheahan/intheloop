export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  default_city: string | null;
  preferred_service: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  api_source: string | null;
  icon: string;
  color: string;
  sort_order: number;
}

export interface TrackedEntity {
  id: string;
  user_id: string;
  category_id: string;
  entity_name: string;
  entity_metadata: Record<string, unknown>;
  created_at: string;
  category?: Category;
}

export interface AlertHistory {
  id: string;
  user_id: string;
  tracked_entity_id: string;
  content: Record<string, unknown>;
  dedup_key: string;
  seen_at: string | null;
  created_at: string;
  tracked_entity?: TrackedEntity;
}

export interface EmailPreference {
  id: string;
  user_id: string;
  category_id: string;
  enabled: boolean;
}

export interface CategoryOrder {
  id: string;
  user_id: string;
  category_id: string;
  position: number;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  device_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface PushPreference {
  id: string;
  user_id: string;
  category_id: string;
  enabled: boolean;
}

export interface PipelineRun {
  id: string;
  triggered_by: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  summary: Record<string, unknown> | null;
  error_message: string | null;
}
