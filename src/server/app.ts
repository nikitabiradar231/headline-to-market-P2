import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { MarketDatabase } from './db/database.js';
import { LLMProvider } from './llm/provider.js';
import { createMarketRouter } from './routes/markets.js';

export function createApp(db: MarketDatabase, llm: LLMProvider): Express {
  const app = express();

  // Security and parsing middleware
  app.use(cors());
  app.use(express.json({ limit: '500kb' }));

  // Security headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'headline-to-market-api',
      llmProvider: llm.name,
      timestamp: new Date().toISOString(),
    });
  });

  // Markets API routes
  app.use('/api/markets', createMarketRouter(db, llm));

  // Serve static client assets in production if available
  const clientDistPath = path.resolve(process.cwd(), 'dist/client');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // Centralized safe error handler (prevents credential or stack trace leakage)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled application error:', err.message);
    res.status(500).json({
      success: false,
      error: 'An internal server error occurred.',
    });
  });

  return app;
}
