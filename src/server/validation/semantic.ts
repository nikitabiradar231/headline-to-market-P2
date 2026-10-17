import {
  MarketDraftOutcome,
  SemanticValidationReport,
  ValidationCheckResult,
  UnresolvableReasonCode,
} from '../../shared/schema.js';

export interface SemanticValidationOptions {
  referenceTime?: Date;
  minFutureSeconds?: number;
}

// Common subjective / vague terms that cannot resolve objectively without quantified benchmarks
const VAGUE_TERMS = [
  { term: 'improve', regex: /\b(improve|improves|improved|improving|improvement)\b/i, category: 'subjective' },
  { term: 'better', regex: /\b(better|worse)\b/i, category: 'subjective' },
  { term: 'successful', regex: /\b(successful|success|succeed)\b/i, category: 'subjective' },
  { term: 'popular', regex: /\b(popular|popularity)\b/i, category: 'subjective' },
  { term: 'perform well', regex: /\b(perform well|performs well|performed well)\b/i, category: 'subjective' },
  { term: 'something big', regex: /\b(something big|something major|do something big)\b/i, category: 'ambiguous' },
  { term: 'soon', regex: /\b(soon|shortly|in the near future)\b/i, category: 'missing_deadline' },
  { term: 'drastically', regex: /\b(drastically|substantially|significantly)\b/i, category: 'ambiguous' },
  { term: 'huge', regex: /\b(huge|massive)\b/i, category: 'ambiguous' },
  { term: 'secretly', regex: /\b(secretly|in secret|behind closed doors)\b/i, category: 'future_not_verifiable' },
];

// Indicators of an objective metric or explicit numerical threshold
const QUANTIFIER_REGEX =
  /(\d+(\.\d+)?%|\$\d+|\b₹\d+|\bEUR\b|\bUSD\b|\bpoints?\b|\bpercent\b|\brate cut\b|\bbps\b|\bindex\b|\bexceeding\b|\bgreater than\b|\bless than\b|\bat least\b|\bmore than\b|\bthreshold\b|\bQ[1-4]\b|\bFY\d{2,4}\b)/i;

// Generic / vague resolution sources that do not point to a specific authority
const GENERIC_SOURCE_REGEX =
  /^(official sources?|news reports?|media reports?|news articles?|the internet|spokespersons?|various sources?|anonymous sources?|online rumors?|unnamed sources?)$/i;

// Well-known authoritative domain patterns for warning/info diagnostics
const AUTHORITATIVE_DOMAIN_PATTERNS = [
  /\.gov(\.[a-z]{2})?$/i,
  /\.nic\.in$/i,
  /rbi\.org\.in$/i,
  /sec\.gov$/i,
  /premierleague\.com$/i,
  /eci\.gov\.in$/i,
  /who\.int$/i,
  /reuters\.com$/i,
  /bloomberg\.com$/i,
  /apnews\.com$/i,
];

/**
 * Validates a proposed Market Draft against deterministic semantic rules.
 */
export function validateMarketProposal(
  market: MarketDraftOutcome,
  options: SemanticValidationOptions = {}
): SemanticValidationReport {
  const referenceTime = options.referenceTime ?? new Date();
  const minFutureSeconds = options.minFutureSeconds ?? 60; // minimum 1 minute in future

  const checks: ValidationCheckResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let recommendedReasonCode: UnresolvableReasonCode | undefined;

  // 1. Time Validation: Must be strictly in the future
  const closeTimeParsed = Date.parse(market.closeAt);
  if (Number.isNaN(closeTimeParsed)) {
    errors.push(`Close time '${market.closeAt}' is not a valid date.`);
    checks.push({
      code: 'VALID_DATE_PARSE',
      passed: false,
      message: 'Close time could not be parsed into a valid timestamp.',
      severity: 'error',
    });
    recommendedReasonCode = 'missing_deadline';
  } else {
    const diffMs = closeTimeParsed - referenceTime.getTime();
    if (diffMs <= 0) {
      errors.push(
        `Proposed close time (${market.closeAt}) is in the past or present relative to current time (${referenceTime.toISOString()}). Markets must close in the future.`
      );
      checks.push({
        code: 'CLOSE_TIME_FUTURE',
        passed: false,
        message: 'Close time is not strictly later than the current time.',
        severity: 'error',
      });
      recommendedReasonCode = 'missing_deadline';
    } else if (diffMs < minFutureSeconds * 1000) {
      errors.push(
        `Proposed close time is too close (closes within ${Math.round(diffMs / 1000)} seconds). Markets require sufficient time for fair participation.`
      );
      checks.push({
        code: 'CLOSE_TIME_FUTURE',
        passed: false,
        message: 'Close time is too soon to allow fair market settlement.',
        severity: 'error',
      });
      recommendedReasonCode = 'missing_deadline';
    } else {
      checks.push({
        code: 'CLOSE_TIME_FUTURE',
        passed: true,
        message: `Close time is valid and in the future (${Math.round(diffMs / (1000 * 60))} minutes ahead).`,
        severity: 'info',
      });
    }
  }

  // 2. Vague & Subjective Terms Check
  const textToCheck = `${market.question} ${market.yesCriteria} ${market.noCriteria}`;
  const hasQuantifier = QUANTIFIER_REGEX.test(textToCheck);

  for (const item of VAGUE_TERMS) {
    if (item.regex.test(market.question)) {
      if (!hasQuantifier) {
        const msg = `Question contains vague/subjective phrase "${item.term}" without an objective numerical benchmark or defined threshold.`;
        errors.push(msg);
        checks.push({
          code: 'NO_VAGUE_TERMS',
          passed: false,
          message: msg,
          severity: 'error',
        });
        if (!recommendedReasonCode) {
          recommendedReasonCode = item.category as UnresolvableReasonCode;
        }
      } else {
        warnings.push(
          `Question mentions "${item.term}", but contains measurable criteria. Editor should verify threshold objectivity.`
        );
      }
    }
  }

  if (!errors.some((e) => e.includes('vague/subjective'))) {
    checks.push({
      code: 'NO_VAGUE_TERMS',
      passed: true,
      message: 'Question does not contain unquantified subjective terms.',
      severity: 'info',
    });
  }

  // 3. Question Structure: Yes/No interrogative format
  const questionTrimmed = market.question.trim();
  const startsWithInterrogative = /^(will|is|are|does|did|has|have|can|would|should)\b/i.test(
    questionTrimmed
  );
  const endsWithQuestionMark = questionTrimmed.endsWith('?');

  if (!startsWithInterrogative || !endsWithQuestionMark) {
    warnings.push(
      'Question should ideally start with an auxiliary verb (e.g., "Will...", "Has...") and end with a question mark.'
    );
    checks.push({
      code: 'QUESTION_FORMAT',
      passed: true,
      message: 'Question syntax should follow standard Yes/No prediction question style.',
      severity: 'warning',
    });
  } else {
    checks.push({
      code: 'QUESTION_FORMAT',
      passed: true,
      message: 'Question follows standard Yes/No structure.',
      severity: 'info',
    });
  }

  // 4. Resolution Source Check: Specificity
  const sourceTrimmed = market.resolutionSource.trim();
  if (GENERIC_SOURCE_REGEX.test(sourceTrimmed) || sourceTrimmed.length < 3) {
    const msg = `Resolution source "${market.resolutionSource}" is too generic. Must specify a named organization, government body, or official registry.`;
    errors.push(msg);
    checks.push({
      code: 'SPECIFIC_SOURCE',
      passed: false,
      message: msg,
      severity: 'error',
    });
    if (!recommendedReasonCode) {
      recommendedReasonCode = 'no_authoritative_source';
    }
  } else {
    checks.push({
      code: 'SPECIFIC_SOURCE',
      passed: true,
      message: `Specific named resolution source provided: "${market.resolutionSource}".`,
      severity: 'info',
    });
  }

  // 5. Source URL Validation & Authority Transparency
  if (market.resolutionSourceUrl && market.resolutionSourceUrl.trim() !== '') {
    try {
      const parsedUrl = new URL(market.resolutionSourceUrl);
      const isHttp = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
      if (!isHttp) {
        errors.push('Resolution source URL must use http or https protocol.');
        checks.push({
          code: 'SOURCE_URL_VALID',
          passed: false,
          message: 'URL must start with http:// or https://',
          severity: 'error',
        });
      } else {
        const isKnownAuthority = AUTHORITATIVE_DOMAIN_PATTERNS.some((pat) =>
          pat.test(parsedUrl.hostname)
        );
        if (!isKnownAuthority) {
          warnings.push(
            `Source URL domain "${parsedUrl.hostname}" is not on the recognized official registrar list. Note: URL validity does NOT guarantee authentic source authority; editor verification required.`
          );
          checks.push({
            code: 'SOURCE_URL_VERIFIED',
            passed: true,
            message:
              'URL is well-formed, but domain authority cannot be verified programmatically. Editor review required.',
            severity: 'warning',
          });
        } else {
          checks.push({
            code: 'SOURCE_URL_VERIFIED',
            passed: true,
            message: `URL points to recognized authoritative domain (${parsedUrl.hostname}).`,
            severity: 'info',
          });
        }
      }
    } catch {
      errors.push(`Resolution source URL "${market.resolutionSourceUrl}" is not a valid URL.`);
      checks.push({
        code: 'SOURCE_URL_VALID',
        passed: false,
        message: 'Invalid URL format.',
        severity: 'error',
      });
    }
  } else {
    warnings.push(
      'No resolution source URL provided. Editor must ensure the named publication or agency is accessible to participants.'
    );
    checks.push({
      code: 'SOURCE_URL_PRESENT',
      passed: true,
      message: 'Source URL is optional but recommended for full transparency.',
      severity: 'warning',
    });
  }

  // 6. Mutual Exclusivity and Criteria Completeness
  const yesTrimmed = market.yesCriteria.trim().toLowerCase();
  const noTrimmed = market.noCriteria.trim().toLowerCase();

  if (yesTrimmed === noTrimmed) {
    const msg = 'YES and NO criteria cannot be identical. They must be mutually exclusive.';
    errors.push(msg);
    checks.push({
      code: 'MUTUAL_EXCLUSIVITY',
      passed: false,
      message: msg,
      severity: 'error',
    });
    if (!recommendedReasonCode) {
      recommendedReasonCode = 'ambiguous';
    }
  } else if (market.yesCriteria.length < 10 || market.noCriteria.length < 10) {
    const msg = 'YES and NO criteria must each provide detailed, unambiguous conditions (at least 10 characters).';
    errors.push(msg);
    checks.push({
      code: 'CRITERIA_COMPLETENESS',
      passed: false,
      message: msg,
      severity: 'error',
    });
    if (!recommendedReasonCode) {
      recommendedReasonCode = 'insufficient_information';
    }
  } else {
    checks.push({
      code: 'MUTUAL_EXCLUSIVITY',
      passed: true,
      message: 'YES and NO criteria are distinct and specify separate settlement conditions.',
      severity: 'info',
    });
  }

  // 7. Edge Cases and Settlement Rules Coverage
  const edgeLower = market.edgeCases.toLowerCase();
  const coversPostponementOrDelay =
    edgeLower.includes('postpone') ||
    edgeLower.includes('delay') ||
    edgeLower.includes('cancel') ||
    edgeLower.includes('reschedule') ||
    edgeLower.includes('void') ||
    edgeLower.includes('missing') ||
    edgeLower.includes('dispute') ||
    edgeLower.includes('conflict');

  if (!coversPostponementOrDelay) {
    warnings.push(
      'Edge cases do not explicitly mention handling for postponement, cancellation, missing reports, or conflicting data.'
    );
    checks.push({
      code: 'EDGE_CASE_COVERAGE',
      passed: true,
      message: 'Edge cases should address postponement or cancellation to avoid locked disputes.',
      severity: 'warning',
    });
  } else {
    checks.push({
      code: 'EDGE_CASE_COVERAGE',
      passed: true,
      message: 'Edge cases cover unforeseen events (cancellation, delay, or missing reports).',
      severity: 'info',
    });
  }

  // 8. Overall result
  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    checks,
    recommendedReasonCode,
  };
}
