
export interface DetailedAnalysis {
  status: 'pending' | 'completed' | 'failed';
  market: {
    tam: string;
    sam: string;
    som: string;
    description: string;
  };
  competitors: {
    name: string;
    url: string;
    strength: string;
    weakness: string;
  }[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  roadmap: {
    phase: string;
    duration: string;
    steps: string[];
  }[];
}

export interface Idea {
  id: string;
  source: 'perplexity' | 'user' | 'synergy';
  title: string;
  description: string;
  created_at: string;

  // Classification
  vertical: string;
  core_tech: string[];
  target_audience: string;
  business_model: string;
  pain_point: string[];
  temporal_marker: string;

  // Sprint 2 Additions
  budget_estimate?: '0-25k' | '25k-50k' | '50k-100k' | null;
  tags?: string[];
  is_favorite?: boolean;
  original_url?: string;
  is_synergy?: boolean;

  metadata?: Record<string, any>;
  analysis?: DetailedAnalysis; // Added typed field for detailed analysis
}

export interface SynergyResult {
  status: 'calculating' | 'synergy_found' | 'no_more_synergy' | 'error';
  score?: number;
  synergy_score?: number;
  components?: [Idea, Idea];
  logic_chain?: string;
  hypothesis?: string;
  synergy_title?: string;
  synergy_description?: string;
  mode?: string;
  thinking_models?: {
    medici_effect: string;
    scamper: string;
    analogy_bridge: string;
    inversion: string;
    blue_ocean_errc?: string;
    knowledge_transfer?: string;
    jobs_to_be_done?: string;
  };
  mvp_scenario?: string;
  defensibility?: {
    competitive_moat: string;
    unfair_advantage: string;
  };
  anti_pattern_check?: string;
  scores?: {
    total: number;
    blue_ocean: number;
    knowledge_transfer: number;
  };
  contrarian_bet?: string;
  blue_ocean_wedge?: string;
  anti_generic_guard?: string;
  classification?: {
    vertical: string;
    core_tech: string[];
    target_audience: string;
    business_model: string;
  };
  debug_info?: string[];
}

export interface SynergyScoreBreakdown {
  tech: number;
  audience: number;
  business: number;
  temporal: number;
}
