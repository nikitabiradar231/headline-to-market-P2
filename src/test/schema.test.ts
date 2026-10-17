import { describe, it, expect } from 'vitest';
import {
  MarketDraftOutcomeSchema,
  UnresolvableOutcomeSchema,
  LLMResponseSchema,
  GenerateMarketRequestSchema,
  IsoDateTimeWithTimezoneSchema,
} from '../shared/schema.js';

describe('Zod Schema Validation', () => {
  describe('IsoDateTimeWithTimezoneSchema', () => {
    it('accepts valid ISO 8601 timestamps with UTC Z timezone', () => {
      const validUtc = '2026-11-15T18:00:00Z';
      const result = IsoDateTimeWithTimezoneSchema.safeParse(validUtc);
      expect(result.success).toBe(true);
    });

    it('accepts valid ISO 8601 timestamps with offset timezone', () => {
      const validOffset = '2026-11-15T18:00:00+05:30';
      const result = IsoDateTimeWithTimezoneSchema.safeParse(validOffset);
      expect(result.success).toBe(true);
    });

    it('rejects timestamps without explicit timezone', () => {
      const missingTimezone = '2026-11-15T18:00:00';
      const result = IsoDateTimeWithTimezoneSchema.safeParse(missingTimezone);
      expect(result.success).toBe(false);
    });

    it('rejects invalid date strings', () => {
      const invalid = 'not-a-date';
      const result = IsoDateTimeWithTimezoneSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('MarketDraftOutcomeSchema', () => {
    it('accepts a fully formed market proposal', () => {
      const validMarket = {
        outcome: 'market',
        question: 'Will the RBI cut the repo rate at its December 2026 meeting?',
        closeAt: '2026-12-08T18:00:00+05:30',
        resolutionSource: 'Reserve Bank of India Monetary Policy Statement',
        resolutionSourceUrl: 'https://www.rbi.org.in',
        yesCriteria: 'Official policy repo rate is reduced below previous rate.',
        noCriteria: 'Policy repo rate is unchanged or increased.',
        resolutionRules: 'Resolved by official press statement published on rbi.org.in.',
        edgeCases: 'If meeting rescheduled, close time shifts accordingly.',
        rationale: 'RBI MPC decisions are official and strictly documented.',
      };

      const result = MarketDraftOutcomeSchema.safeParse(validMarket);
      expect(result.success).toBe(true);
    });

    it('rejects market missing required fields', () => {
      const incomplete = {
        outcome: 'market',
        question: 'Will this happen?',
        // missing closeAt, resolutionSource, etc.
      };

      const result = MarketDraftOutcomeSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it('rejects market with invalid URL in resolutionSourceUrl', () => {
      const invalidUrl = {
        outcome: 'market',
        question: 'Will the rate change?',
        closeAt: '2026-12-08T18:00:00Z',
        resolutionSource: 'Official Agency',
        resolutionSourceUrl: 'not_a_valid_url',
        yesCriteria: 'Rate cut announced.',
        noCriteria: 'Rate cut not announced.',
        resolutionRules: 'Check website.',
        edgeCases: 'Standard rules apply.',
        rationale: 'Official announcement.',
      };

      const result = MarketDraftOutcomeSchema.safeParse(invalidUrl);
      expect(result.success).toBe(false);
    });
  });

  describe('UnresolvableOutcomeSchema', () => {
    it('accepts valid unresolvable outcome with reason and reasonCode', () => {
      const validUnresolvable = {
        outcome: 'unresolvable',
        reasonCode: 'subjective',
        reason: 'The headline uses subjective terms without measurable criteria.',
        suggestedRevision: 'Specify an objective index or statistical percentage.',
      };

      const result = UnresolvableOutcomeSchema.safeParse(validUnresolvable);
      expect(result.success).toBe(true);
    });

    it('rejects unresolvable outcome with unknown reasonCode', () => {
      const invalidReasonCode = {
        outcome: 'unresolvable',
        reasonCode: 'random_invented_category',
        reason: 'Some reason here.',
      };

      const result = UnresolvableOutcomeSchema.safeParse(invalidReasonCode);
      expect(result.success).toBe(false);
    });
  });

  describe('LLMResponseSchema Discriminated Union', () => {
    it('discriminates correctly between market and unresolvable', () => {
      const marketData = {
        outcome: 'market',
        question: 'Will the event occur before December 2026?',
        closeAt: '2026-12-01T00:00:00Z',
        resolutionSource: 'Official State Gazette',
        resolutionSourceUrl: 'https://gazette.example.gov',
        yesCriteria: 'Notification published in the official gazette.',
        noCriteria: 'No notification published by close date.',
        resolutionRules: 'Consult the electronic gazette archive.',
        edgeCases: 'If publication delayed past close date, resolves NO.',
        rationale: 'Official government gazette is public and legally binding.',
      };

      const unresolvableData = {
        outcome: 'unresolvable',
        reasonCode: 'missing_deadline',
        reason: 'No timeline or deadline is specified.',
      };

      const parse1 = LLMResponseSchema.safeParse(marketData);
      expect(parse1.success).toBe(true);
      if (parse1.success) expect(parse1.data.outcome).toBe('market');

      const parse2 = LLMResponseSchema.safeParse(unresolvableData);
      expect(parse2.success).toBe(true);
      if (parse2.success) expect(parse2.data.outcome).toBe('unresolvable');
    });

    it('rejects payload with invalid outcome discriminator', () => {
      const invalidOutcome = {
        outcome: 'maybe_market',
        question: 'Will it happen?',
      };

      const result = LLMResponseSchema.safeParse(invalidOutcome);
      expect(result.success).toBe(false);
    });
  });

  describe('GenerateMarketRequestSchema', () => {
    it('validates headline length limits and trims whitespace', () => {
      const req = {
        headline: '  Will inflation decline by year end?  ',
        snippet: 'Some background details. ',
      };

      const result = GenerateMarketRequestSchema.safeParse(req);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.headline).toBe('Will inflation decline by year end?');
      }
    });

    it('rejects excessively long headline', () => {
      const req = {
        headline: 'a'.repeat(301),
      };

      const result = GenerateMarketRequestSchema.safeParse(req);
      expect(result.success).toBe(false);
    });
  });
});
