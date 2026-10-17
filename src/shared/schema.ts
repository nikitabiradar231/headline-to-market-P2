import { z } from 'zod';

// ISO 8601 timestamp with mandatory explicit timezone (Z or +/-HH:MM)
export const isoTimestampWithTimezoneRegex =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export const IsoDateTimeWithTimezoneSchema = z
  .string()
  .regex(
    isoTimestampWithTimezoneRegex,
    'Must be a valid ISO 8601 string with an explicit timezone (e.g., 2026-11-15T18:00:00Z or 2026-11-15T18:00:00+05:30)'
  )
  .refine(
    (val) => {
      const parsed = Date.parse(val);
      return !Number.isNaN(parsed);
    },
    { message: 'Invalid calendar date/time' }
  );

// Controlled rejection reason codes
export const UnresolvableReasonCodeEnum = z.enum([
  'subjective',
  'ambiguous',
  'missing_deadline',
  'no_authoritative_source',
  'insufficient_information',
  'future_not_verifiable',
  'prompt_injection_attempt',
]);

export type UnresolvableReasonCode = z.infer<typeof UnresolvableReasonCodeEnum>;

// Market proposal outcome schema
export const MarketDraftOutcomeSchema = z.object({
  outcome: z.literal('market'),
  question: z
    .string()
    .min(10, 'Question must be at least 10 characters')
    .max(300, 'Question must not exceed 300 characters')
    .describe('A precise, objectively answerable yes/no question'),
  closeAt: IsoDateTimeWithTimezoneSchema.describe(
    'Strict ISO 8601 timestamp with explicit timezone when market trading/settlement eligibility closes'
  ),
  resolutionSource: z
    .string()
    .min(3, 'Resolution source must name a specific organization or authority')
    .max(200, 'Resolution source name must not exceed 200 characters')
    .describe('The exact named organization, official website, or authoritative publication'),
  resolutionSourceUrl: z
    .string()
    .url('Must be a valid URL')
    .or(z.literal(''))
    .optional()
    .describe('Valid URL for the resolution source or announcement registry'),
  yesCriteria: z
    .string()
    .min(10, 'YES criteria must be clear and specific')
    .describe('Precise conditions for resolving YES'),
  noCriteria: z
    .string()
    .min(10, 'NO criteria must be clear and specific')
    .describe('Precise conditions for resolving NO'),
  resolutionRules: z
    .string()
    .min(15, 'Resolution rules must be comprehensive')
    .describe('Explicit instructions for determining the final outcome'),
  edgeCases: z
    .string()
    .min(15, 'Edge cases must address ambiguity, cancellation, or delays')
    .describe('Rules for ambiguity, conflicting reports, missing data, postponement, or cancellation'),
  rationale: z
    .string()
    .min(10, 'Rationale must explain why this is resolvable')
    .describe('A concise explanation of why the market is objectively resolvable'),
});

export type MarketDraftOutcome = z.infer<typeof MarketDraftOutcomeSchema>;

// Unresolvable proposal outcome schema
export const UnresolvableOutcomeSchema = z.object({
  outcome: z.literal('unresolvable'),
  reasonCode: UnresolvableReasonCodeEnum.describe(
    'Controlled category explaining why the headline cannot support a fair market'
  ),
  reason: z
    .string()
    .min(10, 'Reason must be a clear explanation for the editor')
    .describe('Clear explanation of why this headline cannot be a fair and resolvable market'),
  suggestedRevision: z
    .string()
    .optional()
    .describe('Optional actionable way to rewrite the headline or clarify the event'),
});

export type UnresolvableOutcome = z.infer<typeof UnresolvableOutcomeSchema>;

// Discriminated union of raw LLM output
export const LLMResponseSchema = z.discriminatedUnion('outcome', [
  MarketDraftOutcomeSchema,
  UnresolvableOutcomeSchema,
]);

export type LLMResponse = z.infer<typeof LLMResponseSchema>;

// Editor request to generate market
export const GenerateMarketRequestSchema = z.object({
  headline: z
    .string()
    .min(3, 'Headline must be at least 3 characters')
    .max(300, 'Headline must not exceed 300 characters')
    .transform((val) => val.trim()),
  snippet: z
    .string()
    .max(5000, 'Snippet must not exceed 5000 characters')
    .optional()
    .transform((val) => (val ? val.trim() : undefined)),
});

export type GenerateMarketRequest = z.infer<typeof GenerateMarketRequestSchema>;

// Editor request to update a draft
export const UpdateDraftRequestSchema = z.object({
  question: z.string().min(5).max(300).optional(),
  closeAt: IsoDateTimeWithTimezoneSchema.optional(),
  resolutionSource: z.string().min(2).max(200).optional(),
  resolutionSourceUrl: z.string().url().or(z.literal('')).optional(),
  yesCriteria: z.string().min(5).optional(),
  noCriteria: z.string().min(5).optional(),
  resolutionRules: z.string().min(5).optional(),
  edgeCases: z.string().min(5).optional(),
  rationale: z.string().min(5).optional(),
  editorNotes: z.string().max(2000).optional(),
});

export type UpdateDraftRequest = z.infer<typeof UpdateDraftRequestSchema>;

// Draft lifecycle status enum
export const DraftStatusEnum = z.enum(['draft', 'approved', 'discarded', 'unresolvable']);
export type DraftStatus = z.infer<typeof DraftStatusEnum>;

// Validation check result report
export interface ValidationCheckResult {
  code: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface SemanticValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checks: ValidationCheckResult[];
  recommendedReasonCode?: UnresolvableReasonCode;
}
