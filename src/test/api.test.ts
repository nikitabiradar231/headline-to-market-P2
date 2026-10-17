import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { MarketDatabase } from '../server/db/database.js';
import { MockLLMProvider } from '../server/llm/mock.js';

describe('Express API Endpoints Integration', () => {
  let db: MarketDatabase;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = new MarketDatabase(':memory:');
    const mockLLM = new MockLLMProvider();
    app = createApp(db, mockLLM);
  });

  afterEach(() => {
    db.close();
  });

  describe('POST /api/markets/generate', () => {
    it('generates a draft from a valid objective headline', async () => {
      const res = await request(app)
        .post('/api/markets/generate')
        .send({
          headline: 'Will the RBI announce a repo rate cut at its next scheduled policy meeting in December 2026?',
          snippet: 'MPC scheduled meeting in December.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.draft).toBeDefined();
      expect(res.body.draft.status).toBe('draft');
      expect(res.body.draft.outcomeType).toBe('market');
      expect(res.body.draft.currentPayload.question).toContain('Reserve Bank of India');
    });

    it('generates an unresolvable draft for a vague headline', async () => {
      const res = await request(app)
        .post('/api/markets/generate')
        .send({
          headline: 'Will Bengaluru traffic improve next month?',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.draft.status).toBe('unresolvable');
      expect(res.body.draft.outcomeType).toBe('unresolvable');
      expect(res.body.draft.currentPayload.reasonCode).toBe('subjective');
      expect(res.body.draft.currentPayload.suggestedRevision).toBeDefined();
    });

    it('rejects empty or invalid request body', async () => {
      const res = await request(app)
        .post('/api/markets/generate')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid request');
    });
  });

  describe('GET /api/markets & GET /api/markets/:id', () => {
    it('lists created drafts and filters by status', async () => {
      // Create one valid draft
      await request(app)
        .post('/api/markets/generate')
        .send({ headline: 'Will the RBI announce a repo rate cut in December 2026?' });

      // Create one unresolvable draft
      await request(app)
        .post('/api/markets/generate')
        .send({ headline: 'Will Bengaluru traffic improve?' });

      const listRes = await request(app).get('/api/markets');
      expect(listRes.status).toBe(200);
      expect(listRes.body.total).toBe(2);

      const draftOnlyRes = await request(app).get('/api/markets?status=draft');
      expect(draftOnlyRes.body.total).toBe(1);

      const unresolvableRes = await request(app).get('/api/markets?status=unresolvable');
      expect(unresolvableRes.body.total).toBe(1);
    });

    it('retrieves single draft by ID', async () => {
      const genRes = await request(app)
        .post('/api/markets/generate')
        .send({ headline: 'Will the RBI announce a repo rate cut in December 2026?' });

      const draftId = genRes.body.draft.id;
      const getRes = await request(app).get(`/api/markets/${draftId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.draft.id).toBe(draftId);
    });

    it('returns 404 for nonexistent draft ID', async () => {
      const res = await request(app).get('/api/markets/nonexistent-id');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/markets/:id (Editor modifications)', () => {
    it('allows an editor to edit question, closeAt, and re-validates', async () => {
      const genRes = await request(app)
        .post('/api/markets/generate')
        .send({ headline: 'Will the RBI announce a repo rate cut in December 2026?' });

      const draftId = genRes.body.draft.id;
      const patchRes = await request(app)
        .patch(`/api/markets/${draftId}`)
        .send({
          question: 'Will the RBI announce an interest rate reduction at the December 2026 meeting?',
          editorNotes: 'Refined question phrasing for clarity.',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.success).toBe(true);
      expect(patchRes.body.draft.currentPayload.question).toBe(
        'Will the RBI announce an interest rate reduction at the December 2026 meeting?'
      );
      expect(patchRes.body.draft.editorNotes).toBe('Refined question phrasing for clarity.');
    });
  });

  describe('POST /api/markets/:id/approve (Approval Safety)', () => {
    it('approves a valid, future-dated market draft upon explicit action', async () => {
      const genRes = await request(app)
        .post('/api/markets/generate')
        .send({ headline: 'Will the RBI announce a repo rate cut at its next scheduled policy meeting in December 2026?' });

      const draftId = genRes.body.draft.id;
      const approveRes = await request(app).post(`/api/markets/${draftId}/approve`);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.draft.status).toBe('approved');
      expect(approveRes.body.draft.approvedAt).toBeDefined();
    });

    it('rejects approval if close date is modified to the past', async () => {
      const genRes = await request(app)
        .post('/api/markets/generate')
        .send({ headline: 'Will the RBI announce a repo rate cut in December 2026?' });

      const draftId = genRes.body.draft.id;

      // Manually edit closeAt to past date
      await request(app)
        .patch(`/api/markets/${draftId}`)
        .send({
          closeAt: '2020-01-01T00:00:00Z',
        });

      // Attempt to approve
      const approveRes = await request(app).post(`/api/markets/${draftId}/approve`);
      expect(approveRes.status).toBe(422);
      expect(approveRes.body.success).toBe(false);
      expect(approveRes.body.error).toContain('safety and semantic checks');
    });

    it('rejects approval on an unresolvable outcome', async () => {
      const genRes = await request(app)
        .post('/api/markets/generate')
        .send({ headline: 'Will Bengaluru traffic improve?' });

      const draftId = genRes.body.draft.id;
      const approveRes = await request(app).post(`/api/markets/${draftId}/approve`);

      expect(approveRes.status).toBe(422);
      expect(approveRes.body.success).toBe(false);
      expect(approveRes.body.error).toContain('unresolvable outcome');
    });
  });

  describe('POST /api/markets/:id/discard', () => {
    it('discards a draft', async () => {
      const genRes = await request(app)
        .post('/api/markets/generate')
        .send({ headline: 'Will the RBI announce a repo rate cut in December 2026?' });

      const draftId = genRes.body.draft.id;
      const discardRes = await request(app).post(`/api/markets/${draftId}/discard`);

      expect(discardRes.status).toBe(200);
      expect(discardRes.body.draft.status).toBe('discarded');
      expect(discardRes.body.draft.discardedAt).toBeDefined();

      // Ensure editing discarded draft is rejected
      const patchRes = await request(app)
        .patch(`/api/markets/${draftId}`)
        .send({ question: 'Attempted edit' });
      expect(patchRes.status).toBe(400);
    });
  });

  describe('POST /api/markets/manual', () => {
    it('creates a manual draft directly without LLM', async () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/api/markets/manual')
        .send({
          headline: 'Manual Headline Entry',
          question: 'Will the official report be published before month end?',
          closeAt: futureDate,
          resolutionSource: 'Official State Statistical Department',
          resolutionSourceUrl: 'https://stats.gov',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.draft.status).toBe('draft');
      expect(res.body.draft.currentPayload.question).toContain('official report');
    });
  });
});
