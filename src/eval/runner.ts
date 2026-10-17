import { GOLDEN_EVALUATION_SET } from './goldenSet.js';
import { LLMProvider } from '../server/llm/provider.js';
import { validateMarketProposal } from '../server/validation/semantic.js';

export interface EvaluationResult {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  accuracyPct: number;
  rejectionPrecisionPct: number;
  adversarialBlockedPct: number;
  details: {
    id: string;
    category: string;
    headline: string;
    expectedOutcome: string;
    actualOutcome: string;
    expectedReasonCode?: string;
    actualReasonCode?: string;
    semanticPassed: boolean;
    passed: boolean;
    failureReason?: string;
  }[];
}

export async function runEvaluation(
  llm: LLMProvider,
  referenceTime: Date = new Date('2026-10-17T09:00:00Z')
): Promise<EvaluationResult> {
  const details: EvaluationResult['details'] = [];
  let passedCount = 0;
  let expectedRejectionCount = 0;
  let correctRejectionCount = 0;
  let adversarialCount = 0;
  let adversarialBlocked = 0;

  for (const testCase of GOLDEN_EVALUATION_SET) {
    if (testCase.isAdversarial) adversarialCount++;
    if (testCase.expectedOutcome === 'unresolvable') expectedRejectionCount++;

    const rawResponse = await llm.generateMarket({
      headline: testCase.headline,
      snippet: testCase.snippet,
      referenceTime,
    });

    let effectiveOutcome = rawResponse.outcome;
    let actualReasonCode =
      rawResponse.outcome === 'unresolvable' ? rawResponse.reasonCode : undefined;
    let semanticPassed = true;
    let semanticFailureMessage = '';

    // If model proposed a market, apply deterministic semantic validation
    if (rawResponse.outcome === 'market') {
      const semanticReport = validateMarketProposal(rawResponse, { referenceTime });
      semanticPassed = semanticReport.isValid;
      if (!semanticReport.isValid) {
        // Application code rejects invalid market proposal
        effectiveOutcome = 'unresolvable';
        actualReasonCode = semanticReport.recommendedReasonCode || 'subjective';
        semanticFailureMessage = semanticReport.errors.join('; ');
      }
    }

    // Check pass criteria
    let testPassed = effectiveOutcome === testCase.expectedOutcome;

    // For unresolvable, also check reason code category if specified
    if (
      testPassed &&
      testCase.expectedOutcome === 'unresolvable' &&
      testCase.expectedReasonCode &&
      actualReasonCode
    ) {
      // Reason codes match or are in acceptable related category
      const codeMatch =
        actualReasonCode === testCase.expectedReasonCode ||
        (testCase.expectedReasonCode === 'subjective' && actualReasonCode === 'ambiguous') ||
        (testCase.expectedReasonCode === 'ambiguous' && actualReasonCode === 'subjective') ||
        (testCase.expectedReasonCode === 'no_authoritative_source' && actualReasonCode === 'future_not_verifiable');
      testPassed = codeMatch;
    }

    if (testPassed) {
      passedCount++;
      if (testCase.expectedOutcome === 'unresolvable') correctRejectionCount++;
      if (testCase.isAdversarial) adversarialBlocked++;
    }

    details.push({
      id: testCase.id,
      category: testCase.category,
      headline: testCase.headline,
      expectedOutcome: testCase.expectedOutcome,
      actualOutcome: effectiveOutcome,
      expectedReasonCode: testCase.expectedReasonCode,
      actualReasonCode,
      semanticPassed,
      passed: testPassed,
      failureReason: testPassed ? undefined : (semanticFailureMessage || `Expected ${testCase.expectedOutcome}, got ${effectiveOutcome}`),
    });
  }

  const accuracyPct = Math.round((passedCount / GOLDEN_EVALUATION_SET.length) * 100);
  const rejectionPrecisionPct =
    expectedRejectionCount > 0
      ? Math.round((correctRejectionCount / expectedRejectionCount) * 100)
      : 100;
  const adversarialBlockedPct =
    adversarialCount > 0 ? Math.round((adversarialBlocked / adversarialCount) * 100) : 100;

  return {
    totalCases: GOLDEN_EVALUATION_SET.length,
    passedCases: passedCount,
    failedCases: GOLDEN_EVALUATION_SET.length - passedCount,
    accuracyPct,
    rejectionPrecisionPct,
    adversarialBlockedPct,
    details,
  };
}
