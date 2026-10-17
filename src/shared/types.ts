import {
  MarketDraftOutcome,
  UnresolvableOutcome,
  DraftStatus,
  SemanticValidationReport,
} from './schema.js';

export interface MarketDraftRecord {
  id: string;
  headline: string;
  snippet?: string;
  status: DraftStatus;
  outcomeType: 'market' | 'unresolvable';
  generatedPayload: MarketDraftOutcome | UnresolvableOutcome;
  currentPayload: MarketDraftOutcome | UnresolvableOutcome;
  validationReport: SemanticValidationReport;
  editorNotes?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  discardedAt?: string;
}

export interface GenerateMarketResponse {
  success: boolean;
  draft: MarketDraftRecord;
  validation: SemanticValidationReport;
}

export interface ListMarketsResponse {
  total: number;
  drafts: MarketDraftRecord[];
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}
