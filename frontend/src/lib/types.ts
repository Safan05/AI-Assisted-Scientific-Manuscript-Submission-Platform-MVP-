// src/lib/types.ts
// Shared TypeScript types matching the backend schemas

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  manuscripts?: Manuscript[];
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

export type ManuscriptStatus =
  | "DRAFT"
  | "PARSED"
  | "EDITED"
  | "TARGET_SELECTED"
  | "CHECKLIST_PASSED"
  | "EXPORTED";

export interface Manuscript {
  id: string;
  project_id: string;
  original_filename: string;
  storage_key: string;
  status: ManuscriptStatus;
  target_journal_id?: string | null;
  word_count: number;
  exported_storage_key?: string | null;
  created_at: string;
  updated_at: string;
  extracted_metadata?: ExtractedMetadata | null;
  target_journal?: JournalTemplate | null;
}

export interface ManuscriptAsset {
  id: string;
  manuscript_id: string;
  asset_type: "figure" | "table_image" | "supplementary";
  storage_key: string;
  original_filename?: string | null;
  original_name?: string | null;
  caption?: string | null;
  index: number;
  order_index?: number;
  file_size_bytes?: number;
  mime_type?: string | null;
  created_at: string;
}

export interface Author {
  given_name: string;
  surname: string;
  email?: string | null;
  orcid?: string | null;
  is_corresponding: boolean;
  affiliation_indices: number[];
}

export interface Affiliation {
  index: number;
  institution: string;
  department?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface CorrespondingAuthor {
  full_name: string;
  email: string;
  affiliation?: string | null;
  phone?: string | null;
}

export interface SectionNode {
  heading: string;
  level: number;
  content: string[];
  children: SectionNode[];
}

export interface Reference {
  index: number;
  raw_text: string;
  authors?: string[] | null;
  title?: string | null;
  journal?: string | null;
  year?: number | null;
  volume?: string | null;
  pages?: string | null;
  doi?: string | null;
  pmid?: string | null;
  url?: string | null;
}

export interface FundingSource {
  funder: string;
  grant_number?: string | null;
  recipient?: string | null;
}

export interface ManuscriptIR {
  title: string;
  authors: Author[];
  affiliations: Affiliation[];
  corresponding_author?: CorrespondingAuthor | null;
  abstract: string;
  keywords: string[];
  sections: SectionNode[];
  references: Reference[];
  funding: FundingSource[];
  conflict_of_interest?: string | null;
  ethics_statement?: string | null;
  data_availability?: string | null;
  author_contributions?: string | null;
  acknowledgements?: string | null;
  word_count: number;
}

export interface ExtractedMetadata {
  id: string;
  manuscript_id: string;
  title?: string | null;
  authors: Author[];
  affiliations: Affiliation[];
  corresponding_author?: CorrespondingAuthor | null;
  abstract?: string | null;
  keywords: string[];
  sections: SectionNode[];
  references: Reference[];
  funding: FundingSource[];
  conflict_of_interest?: string | null;
  ethics_statement?: string | null;
  data_availability?: string | null;
  author_contributions?: string | null;
  acknowledgements?: string | null;
  is_human_verified: boolean;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateRule {
  id: string;
  template_id: string;
  rule_key: string;
  rule_type: string;
  rule_config: Record<string, any>;
  severity: "FAIL" | "WARN" | "INFO";
  message: string;
  sort_order: number;
}

export interface JournalTemplate {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  heading_structure: Record<string, any>;
  reference_format: Record<string, any>;
  formatting_rules: Record<string, any>;
  title_page_layout: Record<string, any>;
  required_statements: Record<string, any>;
  max_abstract_words?: number | null;
  max_total_words?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JournalTemplateDetail extends JournalTemplate {
  rules: TemplateRule[];
}

export interface PreflightCheckItem {
  id: string;
  result_id: string;
  rule_id?: string;
  status: "PASS" | "WARN" | "FAIL";
  message: string;
  details?: Record<string, any> | null;
  rule_key?: string;
  rule_type?: string;
  severity?: string;
  override_reason?: string | null;
  human_overridden?: boolean;
  actual_value?: any;
  expected_value?: any;
}

export interface PreflightResult {
  id: string;
  manuscript_id: string;
  template_id: string;
  template_name?: string;
  template_slug?: string;
  overall_status: "PASS" | "WARN" | "FAIL";
  human_confirmed: boolean;
  confirmed_at?: string | null;
  summary_counts?: {
    total?: number;
    pass?: number;
    warn?: number;
    fail?: number;
    PASS?: number;
    WARN?: number;
    FAIL?: number;
    [key: string]: any;
  } | null;
  created_at: string;
  items: PreflightCheckItem[];
}
