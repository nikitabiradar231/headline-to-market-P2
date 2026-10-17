import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { MarketDatabase } from '../db/database.js';
import { LLMProvider, LLMTimeoutError, LLMAuthenticationError, LLMSchemaValidationError } from '../llm/provider.js';
import {
  GenerateMarketRequestSchema,
  UpdateDraftRequestSchema,
  MarketDraftOutcome,
  MarketDraftOutcomeSchema,
  DraftStatus,
} from '../../shared/schema.js';
import { validateMarketProposal } from '../validation/semantic.js';

export function createMarketRouter(db: MarketDatabase, llm: LLMProvider): Router {
  const router = Router();

  // POST /api/markets/generate - Generate market draft or unresolvable rejection
  router.post('/generate', async (req: Request, res: Response): Promise<void> => {
    const parseResult = GenerateMarketRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request payload.',
        details: parseResult.error.issues,
      });
      return;
    }

    const { headline, snippet } = parseResult.data;
    const referenceTime = new Date();

    try {
      // 1. Invoke LLM with explicit timeout & capped retries
      const llmOutput = await llm.generateMarket({
        headline,
        snippet,
        referenceTime,
      });

      // 2. Perform independent deterministic semantic validation if proposal is a market
      let validationReport = {
        isValid: true,
        errors: [] as string[],
        warnings: [] as string[],
        checks: [] as any[],
      };

      let status: DraftStatus = 'draft';
      let outcomeType: 'market' | 'unresolvable' = llmOutput.outcome;

      if (llmOutput.outcome === 'market') {
        validationReport = validateMarketProposal(llmOutput, { referenceTime });
        if (!validationReport.isValid) {
          // If semantic validation caught fatal flaws (e.g. vague terms or past date),
          // we do NOT treat this as a valid approved market; it remains a draft with errors
          // or is flagged for the editor
          status = 'draft';
        }
      } else {
        status = 'unresolvable';
        outcomeType = 'unresolvable';
      }

      // 3. Persist Draft in SQLite
      const nowIso = new Date().toISOString();
      const draftRecord = {
        id: crypto.randomUUID(),
        headline,
        snippet,
        status,
        outcomeType,
        generatedPayload: llmOutput,
        currentPayload: llmOutput,
        validationReport,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      db.saveDraft(draftRecord);

      res.status(201).json({
        success: true,
        draft: draftRecord,
        validation: validationReport,
      });
    } catch (err: unknown) {
      const error = err as Error;
      let statusCode = 500;
      let code = 'INTERNAL_ERROR';
      let message = 'An unexpected error occurred while generating the market draft.';
      let canRetry = true;

      if (error instanceof LLMTimeoutError) {
        statusCode = 504;
        code = 'LLM_TIMEOUT';
        message = 'The AI model took too long to respond. You can retry or write a manual draft.';
      } else if (error instanceof LLMAuthenticationError) {
        statusCode = 502;
        code = 'AUTH_ERROR';
        message = 'LLM service authentication failed. Please check server configuration.';
        canRetry = false;
      } else if (error instanceof LLMSchemaValidationError) {
        statusCode = 422;
        code = 'SCHEMA_VALIDATION_ERROR';
        message = 'The model output was malformed and did not match the strict market schema.';
      } else if (error.message?.includes('rate limit')) {
        statusCode = 429;
        code = 'RATE_LIMIT';
        message = 'LLM rate limit reached. Please wait a few seconds before retrying.';
      }

      res.status(statusCode).json({
        success: false,
        error: message,
        code,
        canRetry,
        canDraftManually: true,
      });
    }
  });

  // GET /api/markets - List all drafts with optional status filter
  router.get('/', (req: Request, res: Response): void => {
    const statusParam = req.query.status as DraftStatus | undefined;
    const drafts = db.listDrafts(statusParam);
    res.json({
      total: drafts.length,
      drafts,
    });
  });

  // GET /api/markets/:id - Get a single draft by ID
  router.get('/:id', (req: Request, res: Response): void => {
    const draft = db.getDraft(req.params.id);
    if (!draft) {
      res.status(404).json({ success: false, error: 'Draft not found.' });
      return;
    }
    res.json({ success: true, draft });
  });

  // PATCH /api/markets/:id - Update draft fields by editor
  router.patch('/:id', (req: Request, res: Response): void => {
    const draft = db.getDraft(req.params.id);
    if (!draft) {
      res.status(404).json({ success: false, error: 'Draft not found.' });
      return;
    }

    if (draft.status === 'discarded') {
      res.status(400).json({ success: false, error: 'Cannot edit a discarded draft.' });
      return;
    }

    const parseResult = UpdateDraftRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid update payload.',
        details: parseResult.error.issues,
      });
      return;
    }

    const updates = parseResult.data;
    const currentPayload = { ...draft.currentPayload } as any;

    // Apply updates
    if (updates.question !== undefined) currentPayload.question = updates.question;
    if (updates.closeAt !== undefined) currentPayload.closeAt = updates.closeAt;
    if (updates.resolutionSource !== undefined) currentPayload.resolutionSource = updates.resolutionSource;
    if (updates.resolutionSourceUrl !== undefined) currentPayload.resolutionSourceUrl = updates.resolutionSourceUrl;
    if (updates.yesCriteria !== undefined) currentPayload.yesCriteria = updates.yesCriteria;
    if (updates.noCriteria !== undefined) currentPayload.noCriteria = updates.noCriteria;
    if (updates.resolutionRules !== undefined) currentPayload.resolutionRules = updates.resolutionRules;
    if (updates.edgeCases !== undefined) currentPayload.edgeCases = updates.edgeCases;
    if (updates.rationale !== undefined) currentPayload.rationale = updates.rationale;
    if (updates.editorNotes !== undefined) draft.editorNotes = updates.editorNotes;

    // If it was unresolvable and editor converted it to market
    if (currentPayload.question && currentPayload.closeAt && currentPayload.resolutionSource) {
      currentPayload.outcome = 'market';
      draft.outcomeType = 'market';
    }

    // Re-run semantic validation on the updated market proposal
    let validationReport = draft.validationReport;
    if (draft.outcomeType === 'market') {
      validationReport = validateMarketProposal(currentPayload as MarketDraftOutcome);
    }

    draft.currentPayload = currentPayload;
    draft.validationReport = validationReport;
    draft.updatedAt = new Date().toISOString();

    db.saveDraft(draft);

    res.json({
      success: true,
      draft,
      validation: validationReport,
    });
  });

  // POST /api/markets/:id/approve - Explicit editor approval workflow
  router.post('/:id/approve', (req: Request, res: Response): void => {
    const draft = db.getDraft(req.params.id);
    if (!draft) {
      res.status(404).json({ success: false, error: 'Draft not found.' });
      return;
    }

    if (draft.status === 'approved') {
      res.status(400).json({ success: false, error: 'Draft is already approved and published.' });
      return;
    }

    if (draft.status === 'discarded') {
      res.status(400).json({ success: false, error: 'Cannot approve a discarded draft.' });
      return;
    }

    if (draft.outcomeType !== 'market') {
      res.status(422).json({
        success: false,
        error: 'Cannot approve an unresolvable outcome. Convert to market and specify all required fields first.',
      });
      return;
    }

    // 1. Validate complete Market schema
    const schemaValidation = MarketDraftOutcomeSchema.safeParse(draft.currentPayload);
    if (!schemaValidation.success) {
      res.status(422).json({
        success: false,
        error: 'Market draft is missing required fields or has invalid structure.',
        details: schemaValidation.error.issues,
      });
      return;
    }

    // 2. Perform independent deterministic semantic validation against CURRENT time
    const referenceTime = new Date();
    const semanticReport = validateMarketProposal(schemaValidation.data, { referenceTime });

    if (!semanticReport.isValid) {
      res.status(422).json({
        success: false,
        error: 'Draft failed safety and semantic checks. Fix all validation errors before approving.',
        validation: semanticReport,
      });
      return;
    }

    // Explicit approval transition
    draft.status = 'approved';
    draft.approvedAt = referenceTime.toISOString();
    draft.updatedAt = referenceTime.toISOString();
    draft.validationReport = semanticReport;

    db.saveDraft(draft);

    res.json({
      success: true,
      message: 'Market draft successfully approved and published.',
      draft,
    });
  });

  // POST /api/markets/:id/discard - Discard a draft
  router.post('/:id/discard', (req: Request, res: Response): void => {
    const draft = db.getDraft(req.params.id);
    if (!draft) {
      res.status(404).json({ success: false, error: 'Draft not found.' });
      return;
    }

    draft.status = 'discarded';
    draft.discardedAt = new Date().toISOString();
    draft.updatedAt = new Date().toISOString();

    db.saveDraft(draft);

    res.json({
      success: true,
      message: 'Draft has been discarded.',
      draft,
    });
  });

  // POST /api/markets/manual - Create a manual market draft
  router.post('/manual', (req: Request, res: Response): void => {
    const { headline, snippet, question, closeAt, resolutionSource, resolutionSourceUrl, yesCriteria, noCriteria, resolutionRules, edgeCases, rationale } = req.body;

    if (!headline || !question || !closeAt || !resolutionSource) {
      res.status(400).json({
        success: false,
        error: 'Headline, question, closeAt, and resolutionSource are required for manual drafts.',
      });
      return;
    }

    const payload: MarketDraftOutcome = {
      outcome: 'market',
      question: question.trim(),
      closeAt: closeAt.trim(),
      resolutionSource: resolutionSource.trim(),
      resolutionSourceUrl: resolutionSourceUrl ? resolutionSourceUrl.trim() : '',
      yesCriteria: yesCriteria || 'Official confirmation according to source.',
      noCriteria: noCriteria || 'No official confirmation by close date.',
      resolutionRules: resolutionRules || 'Settled based on official announcement.',
      edgeCases: edgeCases || 'If postponed or cancelled, resolves according to standard guidelines.',
      rationale: rationale || 'Manually entered newsroom market proposal.',
    };

    const schemaResult = MarketDraftOutcomeSchema.safeParse(payload);
    if (!schemaResult.success) {
      res.status(400).json({
        success: false,
        error: 'Manual draft payload failed schema validation.',
        details: schemaResult.error.issues,
      });
      return;
    }

    const referenceTime = new Date();
    const validationReport = validateMarketProposal(schemaResult.data, { referenceTime });
    const nowIso = referenceTime.toISOString();

    const draftRecord = {
      id: crypto.randomUUID(),
      headline: headline.trim(),
      snippet: snippet ? snippet.trim() : undefined,
      status: 'draft' as DraftStatus,
      outcomeType: 'market' as const,
      generatedPayload: schemaResult.data,
      currentPayload: schemaResult.data,
      validationReport,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.saveDraft(draftRecord);

    res.status(201).json({
      success: true,
      draft: draftRecord,
      validation: validationReport,
    });
  });

  return router;
}
