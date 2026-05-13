/**
 * Shared types for harness-kit.
 */

export type AgentId = "claude-code" | "codex" | "opencode" | "cursor" | "aider";

export type FeatureState = "not_started" | "active" | "blocked" | "passing";

export interface Feature {
  id: string;
  behavior: string;
  verification: string;
  state: FeatureState;
  evidence?: string;
  created_at: string;
  updated_at: string;
  blocked_reason?: string;
}

export interface FeaturesFile {
  version: string;
  wip_limit: number;
  features: Feature[];
}

export interface HarnessConfig {
  version: string;
  project_name: string;
  agents: AgentId[];
  created_at: string;
  template_version: string;
}

export interface InitOptions {
  cwd: string;
  projectName?: string;
  agents?: AgentId[];
  yes?: boolean;
  force?: boolean;
  lang?: string;
}

export interface InjectOptions {
  cwd: string;
  dryRun?: boolean;
  force?: boolean;
  agents?: AgentId[];
  lang?: string;
}

export interface DoctorReport {
  scores: {
    instructions: number;
    state: number;
    feedback: number;
    observability: number;
    governance: number;
  };
  cold_start: {
    can_answer: Record<string, boolean>;
    score: number;
  };
  total: number;
  notes: string[];
}
