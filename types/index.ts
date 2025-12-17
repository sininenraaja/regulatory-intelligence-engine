export interface Regulation {
  id: number;
  title: string;
  description: string;
  source_url: string;
  published_date: string;
  finlex_id: string;
  relevance_score: number | null;
  relevance_reasoning: string | null;
  impact_level: 'high' | 'medium' | 'low' | 'none' | null;
  full_analysis: string | null; // JSON string in DB
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: number;
  regulation_id: number;
  department: string;
  action_description: string;
  deadline: string | null;
  priority: 'high' | 'medium' | 'low';
  status: string;
  created_at: string;
}

export interface FullAnalysis {
  impact_level: 'high' | 'medium' | 'low';
  executive_summary: string;
  key_changes: string[];
  affected_areas: string[];
  compliance_deadline: string;
  action_items: Array<{
    department: string;
    action: string;
    deadline: string | null;
    priority: 'high' | 'medium' | 'low';
  }>;
  estimated_effort: string;
  financial_impact: string;
  risks_if_ignored: string;
  kemira_specific_considerations?: string;
}

export interface RegulationWithAnalysis extends Regulation {
  action_items: ActionItem[];
  parsed_analysis: FullAnalysis | null;
}

export interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  guid: string;
}

export interface GeminiRelevanceResponse {
  score: number;
  reasoning: string;
}
