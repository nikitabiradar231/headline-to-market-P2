import { describe, it, expect } from 'vitest';
import { validateMarketProposal } from '../server/validation/semantic.js';
import { MarketDraftOutcome } from '../shared/schema.js';

describe('Deterministic Semantic Validation Engine', () => {
  const referenceTime = new Date('2026-10-17T09:00:00Z');

  const baseValidMarket: MarketDraftOutcome = {
    outcome: 'market',
    question: 'Will the Reserve Bank of India lower the benchmark repo rate at its December 2026 meeting?',
    closeAt: '2026-12-08T18:00:00+05:30',
    resolutionSource: 'Reserve Bank of India Monetary Policy Statement',
    resolutionSourceUrl: 'https://rbi.org.in/press/statement',
    yesCriteria: 'Official announcement specifies a lower repo rate than prevailing.',
    noCriteria: 'Official announcement specifies an equal or higher repo rate.',
    resolutionRules: 'Resolved by the press release published on the RBI portal.',
    edgeCases: 'If meeting rescheduled, close time adjusts to match official announcement.',
    rationale: 'RBI MPC is the legal statutory authority with definitive policy statements.',
  };

  it('passes a fully compliant, future-dated market proposal', () => {
    const report = validateMarketProposal(baseValidMarket, { referenceTime });
    expect(report.isValid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  describe('Time Validation', () => {
    it('rejects a close time in the past relative to reference time', () => {
      const pastMarket: MarketDraftOutcome = {
        ...baseValidMarket,
        closeAt: '2026-10-10T12:00:00Z', // 7 days in the past
      };

      const report = validateMarketProposal(pastMarket, { referenceTime });
      expect(report.isValid).toBe(false);
      expect(report.errors.some((e) => e.includes('in the past or present'))).toBe(true);
      expect(report.recommendedReasonCode).toBe('missing_deadline');
    });

    it('rejects a close time equal to the present reference time', () => {
      const presentMarket: MarketDraftOutcome = {
        ...baseValidMarket,
        closeAt: referenceTime.toISOString(),
      };

      const report = validateMarketProposal(presentMarket, { referenceTime });
      expect(report.isValid).toBe(false);
      expect(report.errors.some((e) => e.includes('in the past or present'))).toBe(true);
    });

    it('rejects a close time too close (< 60s into future)', () => {
      const tooSoonDate = new Date(referenceTime.getTime() + 30 * 1000); // +30s
      const tooSoonMarket: MarketDraftOutcome = {
        ...baseValidMarket,
        closeAt: tooSoonDate.toISOString(),
      };

      const report = validateMarketProposal(tooSoonMarket, { referenceTime, minFutureSeconds: 60 });
      expect(report.isValid).toBe(false);
      expect(report.errors.some((e) => e.includes('too close'))).toBe(true);
    });
  });

  describe('Vague & Subjective Terms', () => {
    it('rejects subjective verb "improve" without quantitative threshold', () => {
      const vagueMarket: MarketDraftOutcome = {
        ...baseValidMarket,
        question: 'Will Bengaluru traffic improve next month?',
      };

      const report = validateMarketProposal(vagueMarket, { referenceTime });
      expect(report.isValid).toBe(false);
      expect(report.errors.some((e) => e.includes('improve'))).toBe(true);
      expect(report.recommendedReasonCode).toBe('subjective');
    });

    it('rejects unquantified term "popular"', () => {
      const subjectiveMarket: MarketDraftOutcome = {
        ...baseValidMarket,
        question: 'Will the new phone become popular in India?',
      };

      const report = validateMarketProposal(subjectiveMarket, { referenceTime });
      expect(report.isValid).toBe(false);
      expect(report.errors.some((e) => e.includes('popular'))).toBe(true);
    });

    it('permits "improve" when an objective percentage or threshold is provided', () => {
      const quantifiedMarket: MarketDraftOutcome = {
        ...baseValidMarket,
        question: 'Will the city traffic congestion index improve by at least 15% on the TomTom Index?',
      };

      const report = validateMarketProposal(quantifiedMarket, { referenceTime });
      expect(report.isValid).toBe(true);
      expect(report.warnings.some((w) => w.includes('measurable criteria'))).toBe(true);
    });
  });

  describe('Resolution Source Checks', () => {
    it('rejects generic resolution sources like "official sources" or "news reports"', () => {
      const genericMarket: MarketDraftOutcome = {
        ...baseValidMarket,
        resolutionSource: 'official sources',
      };

      const report = validateMarketProposal(genericMarket, { referenceTime });
      expect(report.isValid).toBe(false);
      expect(report.errors.some((e) => e.includes('too generic'))).toBe(true);
      expect(report.recommendedReasonCode).toBe('no_authoritative_source');
    });

    it('warns when source URL domain is unverified', () => {
      const unverifiedDomainMarket: MarketDraftOutcome = {
        ...baseValidMarket,
        resolutionSourceUrl: 'https://totallyfakepredictionblog1234.org/announcement',
      };

      const report = validateMarketProposal(unverifiedDomainMarket, { referenceTime });
      expect(report.isValid).toBe(true);
      expect(report.warnings.some((w) => w.includes('not on the recognized official registrar list'))).toBe(true);
    });
  });

  describe('Mutual Exclusivity & Criteria Checks', () => {
    it('rejects identical YES and NO criteria', () => {
      const invalidCriteriaMarket: MarketDraftOutcome = {
        ...baseValidMarket,
        yesCriteria: 'The rate is announced by the bank.',
        noCriteria: 'The rate is announced by the bank.',
      };

      const report = validateMarketProposal(invalidCriteriaMarket, { referenceTime });
      expect(report.isValid).toBe(false);
      expect(report.errors.some((e) => e.includes('mutually exclusive'))).toBe(true);
    });

    it('warns if edge cases omit cancellation or delay guidelines', () => {
      const noEdgeCaseMarket: MarketDraftOutcome = {
        ...baseValidMarket,
        edgeCases: 'Standard guidelines apply across all scenarios.',
      };

      const report = validateMarketProposal(noEdgeCaseMarket, { referenceTime });
      expect(report.isValid).toBe(true);
      expect(report.warnings.some((w) => w.includes('postponement'))).toBe(true);
    });
  });
});
