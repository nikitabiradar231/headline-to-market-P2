import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MarketDatabase } from '../server/db/database.js';
import { MarketDraftRecord } from '../shared/types.js';

describe('SQLite Draft Persistence', () => {
  let db: MarketDatabase;

  beforeEach(() => {
    db = new MarketDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  const sampleRecord: MarketDraftRecord = {
    id: 'test-draft-uuid-001',
    headline: 'Will the RBI cut the repo rate in December 2026?',
    snippet: 'MPC scheduled meeting in December.',
    status: 'draft',
    outcomeType: 'market',
    generatedPayload: {
      outcome: 'market',
      question: 'Will the RBI cut the repo rate at its December 2026 meeting?',
      closeAt: '2026-12-08T18:00:00+05:30',
      resolutionSource: 'Reserve Bank of India Monetary Policy Statement',
      resolutionSourceUrl: 'https://rbi.org.in',
      yesCriteria: 'Rate cut announced.',
      noCriteria: 'No rate cut announced.',
      resolutionRules: 'Consult rbi.org.in press statement.',
      edgeCases: 'If meeting rescheduled, close date shifts.',
      rationale: 'Official central bank interest rate statement.',
    },
    currentPayload: {
      outcome: 'market',
      question: 'Will the RBI cut the repo rate at its December 2026 meeting?',
      closeAt: '2026-12-08T18:00:00+05:30',
      resolutionSource: 'Reserve Bank of India Monetary Policy Statement',
      resolutionSourceUrl: 'https://rbi.org.in',
      yesCriteria: 'Rate cut announced.',
      noCriteria: 'No rate cut announced.',
      resolutionRules: 'Consult rbi.org.in press statement.',
      edgeCases: 'If meeting rescheduled, close date shifts.',
      rationale: 'Official central bank interest rate statement.',
    },
    validationReport: {
      isValid: true,
      errors: [],
      warnings: [],
      checks: [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('saves and retrieves a draft record by ID', () => {
    db.saveDraft(sampleRecord);
    const retrieved = db.getDraft(sampleRecord.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(sampleRecord.id);
    expect(retrieved?.headline).toBe(sampleRecord.headline);
    expect(retrieved?.status).toBe('draft');
    expect(retrieved?.outcomeType).toBe('market');
    expect(retrieved?.currentPayload.outcome).toBe('market');
  });

  it('updates draft fields and status transitions', () => {
    db.saveDraft(sampleRecord);

    const updatedRecord: MarketDraftRecord = {
      ...sampleRecord,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      editorNotes: 'Approved after verification by Senior Editor',
    };

    db.saveDraft(updatedRecord);
    const retrieved = db.getDraft(sampleRecord.id);

    expect(retrieved?.status).toBe('approved');
    expect(retrieved?.approvedAt).toBeDefined();
    expect(retrieved?.editorNotes).toBe('Approved after verification by Senior Editor');
  });

  it('filters drafts by status', () => {
    db.saveDraft(sampleRecord);

    const rejectedRecord: MarketDraftRecord = {
      ...sampleRecord,
      id: 'test-draft-uuid-002',
      headline: 'Will Bengaluru traffic improve?',
      status: 'unresolvable',
      outcomeType: 'unresolvable',
      generatedPayload: {
        outcome: 'unresolvable',
        reasonCode: 'subjective',
        reason: 'Improve is subjective.',
      },
      currentPayload: {
        outcome: 'unresolvable',
        reasonCode: 'subjective',
        reason: 'Improve is subjective.',
      },
    };
    db.saveDraft(rejectedRecord);

    const draftList = db.listDrafts('draft');
    expect(draftList).toHaveLength(1);
    expect(draftList[0].id).toBe('test-draft-uuid-001');

    const unresolvableList = db.listDrafts('unresolvable');
    expect(unresolvableList).toHaveLength(1);
    expect(unresolvableList[0].id).toBe('test-draft-uuid-002');

    const allList = db.listDrafts();
    expect(allList).toHaveLength(2);
  });

  it('deletes draft by ID', () => {
    db.saveDraft(sampleRecord);
    const deleted = db.deleteDraft(sampleRecord.id);
    expect(deleted).toBe(true);

    const retrieved = db.getDraft(sampleRecord.id);
    expect(retrieved).toBeNull();
  });
});
