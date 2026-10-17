import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { MarketDatabase } from './db/database.js';
import { createLLMProvider } from './llm/factory.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

async function startServer() {
  const db = new MarketDatabase();
  const llm = createLLMProvider();

  const app = createApp(db, llm);

  const server = app.listen(PORT, () => {
    console.log(`======================================================`);
    console.log(`Headline to Market API Server running on port ${PORT}`);
    console.log(`LLM Provider: ${llm.name}`);
    console.log(`Database: SQLite (${process.env.DATABASE_PATH || './data/markets.db'})`);
    console.log(`Health Check: http://localhost:${PORT}/api/health`);
    console.log(`======================================================`);
  });

  const shutdown = () => {
    console.log('Shutting down server gracefully...');
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
