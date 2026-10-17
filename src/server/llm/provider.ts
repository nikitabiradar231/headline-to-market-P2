import { LLMResponse } from '../../shared/schema.js';

export interface LLMGenerateOptions {
  headline: string;
  snippet?: string;
  referenceTime?: Date;
}

export interface LLMProvider {
  name: string;
  generateMarket(options: LLMGenerateOptions): Promise<LLMResponse>;
}

export class LLMTimeoutError extends Error {
  constructor(message = 'The LLM service timed out waiting for a response.') {
    super(message);
    this.name = 'LLMTimeoutError';
  }
}

export class LLMAuthenticationError extends Error {
  constructor(message = 'Authentication failed with the LLM provider.') {
    super(message);
    this.name = 'LLMAuthenticationError';
  }
}

export class LLMSchemaValidationError extends Error {
  public rawOutput?: string;
  constructor(message: string, rawOutput?: string) {
    super(message);
    this.name = 'LLMSchemaValidationError';
    this.rawOutput = rawOutput;
  }
}

export class LLMRateLimitError extends Error {
  constructor(message = 'LLM rate limit reached. Please retry shortly.') {
    super(message);
    this.name = 'LLMRateLimitError';
  }
}
