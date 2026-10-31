// src/types/index.ts

export type ProjectStatus = 'Approved' | 'Pending' | 'Rejected';

export interface Domain {
  domain_id: number;
  domain_name: string;
  description?: string;
  project_count?: number;
}

export interface AppUser {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  role_id: number;
  role_name?: string;
}

export interface ProjectRecord {
  project_id: number;
  student_id: number;
  title: string;
  problem_statement: string;
  description?: string;
  status: ProjectStatus;
  approved_by?: number | null;
  created_at: string;
  updated_at?: string;
  student_name?: string;
  student_email?: string;
  approver_name?: string | null;
  domains?: Domain[];
  is_embedded?: boolean;
}

export interface ResearchPaperRecord {
  paper_id: number;
  openalex_id?: string | null;
  title: string;
  abstract?: string | null;
  keywords?: string | null;
  doi?: string | null;
  file_url?: string | null;
  published_in?: string | null;
  year?: number | null;
  cited_by_count: number;
  created_at: string;
  authors?: Array<{
    author_id: number;
    name: string;
    affiliation?: string | null;
    email?: string | null;
    order?: number;
  }>;
  is_embedded?: boolean;
}

export interface SimilarityMatch {
  entity_type: 'PROJECT' | 'RESEARCH_PAPER';
  entity_id: number;
  title: string;
  summary: string;
  metadata_badge: string;
  primary_contributor: string;
  category_info: string;
  similarity_score: number;
}

export interface ProjectReviewRecord {
  review_id: number;
  project_id: number;
  faculty_id: number;
  decision: 'Approved' | 'Rejected' | 'Changes Required';
  comments: string;
  review_date: string;
  faculty_name?: string;
  faculty_email?: string;
}

export interface AuditLogRecord {
  log_id: number;
  table_name: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: number;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  changed_at: string;
}
