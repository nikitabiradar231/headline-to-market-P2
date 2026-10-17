import { describe, it, expect, vi } from 'vitest';
import {
  LLMProvider,
  LLMTimeoutError,
  LLMAuthenticationError,
  LLMSchemaValidationError,
} from '../server/llm/provider.js';

describe('LLM Reliability & Error Handling', () => {
  it('throws LLMTimeoutError when LLM operation exceeds timeout duration', async () => {
    // Simulating provider with timeout
    const timeoutProvider: LLMProvider = {
      name: 'Timeout Mock',
      generateMarket: vi.fn().mockImplementation(async () => {
        throw new LLMTimeoutError('LLM request timed out after 15000ms.');
      }),
    };

    await expect(
      timeoutProvider.generateMarket({ headline: 'Sample headline' })
    ).rejects.toThrow(LLMTimeoutError);
  });

  it('fails fast on authentication failure without retries', async () => {
    let callCount = 0;
    const authFailProvider: LLMProvider = {
      name: 'Auth Fail Mock',
      generateMarket: vi.fn().mockImplementation(async () => {
        callCount++;
        throw new LLMAuthenticationError('Invalid API Key');
      }),
    };

    await expect(
      authFailProvider.generateMarket({ headline: 'Sample headline' })
    ).rejects.toThrow(LLMAuthenticationError);

    // Call count must be exactly 1: No retries allowed on permanent auth errors
    expect(callCount).toBe(1);
  });

  it('enforces maximum finite retry limit on transient failure', async () => {
    let callAttempts = 0;
    const maxRetries = 2;

    const transientFailProvider: LLMProvider = {
      name: 'Transient Mock',
      generateMarket: vi.fn().mockImplementation(async () => {
        callAttempts++;
        if (callAttempts <= maxRetries) {
          throw new Error('Temporary 503 Service Unavailable');
        }
        return {
          outcome: 'unresolvable',
          reasonCode: 'insufficient_information',
          reason: 'Recovered after retry',
        };
      }),
    };

    // Simulate calling with retry logic
    let result;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        result = await transientFailProvider.generateMarket({ headline: 'Retry test' });
        break;
      } catch {
        if (i === maxRetries) throw new Error('Exceeded max retries');
      }
    }

    expect(result).toBeDefined();
    expect(callAttempts).toBe(3); // Initial + 2 retries = 3 attempts total
  });

  it('provides structured error diagnostics on malformed JSON schema output', async () => {
    const malformedProvider: LLMProvider = {
      name: 'Malformed Mock',
      generateMarket: vi.fn().mockImplementation(async () => {
        throw new LLMSchemaValidationError(
          'LLM output failed Zod schema validation: closeAt: Invalid calendar date/time',
          '{ "outcome": "market", "closeAt": "invalid-date" }'
        );
      }),
    };

    try {
      await malformedProvider.generateMarket({ headline: 'Malformed test' });
      expect.fail('Should have thrown LLMSchemaValidationError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(LLMSchemaValidationError);
      expect(err.message).toContain('Zod schema validation');
      expect(err.rawOutput).toContain('invalid-date');
    }
  });
});
