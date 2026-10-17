import { LLMProvider } from './provider.js';
import { ClaudeLLMProvider } from './claude.js';
import { MockLLMProvider } from './mock.js';

export function createLLMProvider(): LLMProvider {
  const forceMock = process.env.MOCK_LLM === 'true';
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (forceMock || !apiKey || apiKey.trim() === '') {
    return new MockLLMProvider();
  }

  try {
    return new ClaudeLLMProvider({
      apiKey,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      timeoutMs: process.env.LLM_TIMEOUT_MS ? parseInt(process.env.LLM_TIMEOUT_MS, 10) : 15000,
      maxRetries: process.env.LLM_MAX_RETRIES ? parseInt(process.env.LLM_MAX_RETRIES, 10) : 2,
    });
  } catch (err) {
    console.warn('Failed to initialize Claude provider, falling back to Mock provider:', err);
    return new MockLLMProvider();
  }
}
