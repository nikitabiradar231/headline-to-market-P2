import fs from 'fs';
import path from 'path';
import {
  DraftStatus,
  MarketDraftOutcome,
  UnresolvableOutcome,
  SemanticValidationReport,
} from '../../shared/schema.js';
import { MarketDraftRecord } from '../../shared/types.js';

interface RawDbRow {
  id: string;
  headline: string;
  snippet: string | null;
  status: string;
  outcome_type: string;
  generated_payload: string;
  current_payload: string;
  validation_report: string;
  editor_notes: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  discarded_at: string | null;
}

export class MarketDatabase {
  private db: any;
  private dbType: 'better-sqlite3' | 'node:sqlite';

  constructor(dbPath: string = process.env.DATABASE_PATH || './data/markets.db') {
    // Ensure parent directory exists
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Try better-sqlite3 first, then fallback to built-in node:sqlite
    try {
      // Dynamic require / import
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const BetterSqlite = require('better-sqlite3');
      this.db = new BetterSqlite(dbPath);
      this.dbType = 'better-sqlite3';
    } catch {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { DatabaseSync } = require('node:sqlite');
        this.db = new DatabaseSync(dbPath);
        this.dbType = 'node:sqlite';
      } catch (err2) {
        throw new Error(`Failed to initialize SQLite database: ${err2}`);
      }
    }

    this.initTables();
  }

  private initTables(): void {
    const ddl = `
      CREATE TABLE IF NOT EXISTS market_drafts (
        id TEXT PRIMARY KEY,
        headline TEXT NOT NULL,
        snippet TEXT,
        status TEXT NOT NULL,
        outcome_type TEXT NOT NULL,
        generated_payload TEXT NOT NULL,
        current_payload TEXT NOT NULL,
        validation_report TEXT NOT NULL,
        editor_notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        approved_at TEXT,
        discarded_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_market_drafts_status ON market_drafts(status);
      CREATE INDEX IF NOT EXISTS idx_market_drafts_created ON market_drafts(created_at);
    `;

    this.exec(ddl);
  }

  public exec(sql: string): void {
    this.db.exec(sql);
  }

  public saveDraft(record: MarketDraftRecord): MarketDraftRecord {
    const sql = `
      INSERT INTO market_drafts (
        id, headline, snippet, status, outcome_type,
        generated_payload, current_payload, validation_report,
        editor_notes, created_at, updated_at, approved_at, discarded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        current_payload = excluded.current_payload,
        validation_report = excluded.validation_report,
        editor_notes = excluded.editor_notes,
        updated_at = excluded.updated_at,
        approved_at = excluded.approved_at,
        discarded_at = excluded.discarded_at;
    `;

    const params = [
      record.id,
      record.headline,
      record.snippet || null,
      record.status,
      record.outcomeType,
      JSON.stringify(record.generatedPayload),
      JSON.stringify(record.currentPayload),
      JSON.stringify(record.validationReport),
      record.editorNotes || null,
      record.createdAt,
      record.updatedAt,
      record.approvedAt || null,
      record.discardedAt || null,
    ];

    if (this.dbType === 'better-sqlite3') {
      this.db.prepare(sql).run(...params);
    } else {
      this.db.prepare(sql).run(...params);
    }

    return record;
  }

  public getDraft(id: string): MarketDraftRecord | null {
    const sql = 'SELECT * FROM market_drafts WHERE id = ?';
    let row: RawDbRow | undefined;

    if (this.dbType === 'better-sqlite3') {
      row = this.db.prepare(sql).get(id) as RawDbRow | undefined;
    } else {
      row = this.db.prepare(sql).get(id) as RawDbRow | undefined;
    }

    if (!row) return null;
    return this.mapRowToRecord(row);
  }

  public listDrafts(status?: DraftStatus): MarketDraftRecord[] {
    let sql = 'SELECT * FROM market_drafts';
    const params: string[] = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';

    let rows: RawDbRow[] = [];
    if (this.dbType === 'better-sqlite3') {
      rows = (this.db.prepare(sql).all(...params) || []) as RawDbRow[];
    } else {
      rows = (this.db.prepare(sql).all(...params) || []) as RawDbRow[];
    }

    return rows.map((r) => this.mapRowToRecord(r));
  }

  public deleteDraft(id: string): boolean {
    const sql = 'DELETE FROM market_drafts WHERE id = ?';
    if (this.dbType === 'better-sqlite3') {
      const res = this.db.prepare(sql).run(id);
      return res.changes > 0;
    } else {
      const res = this.db.prepare(sql).run(id);
      return res.changes > 0;
    }
  }

  public close(): void {
    if (this.db && typeof this.db.close === 'function') {
      this.db.close();
    }
  }

  private mapRowToRecord(row: RawDbRow): MarketDraftRecord {
    return {
      id: row.id,
      headline: row.headline,
      snippet: row.snippet || undefined,
      status: row.status as DraftStatus,
      outcomeType: row.outcome_type as 'market' | 'unresolvable',
      generatedPayload: JSON.parse(row.generated_payload) as MarketDraftOutcome | UnresolvableOutcome,
      currentPayload: JSON.parse(row.current_payload) as MarketDraftOutcome | UnresolvableOutcome,
      validationReport: JSON.parse(row.validation_report) as SemanticValidationReport,
      editorNotes: row.editor_notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      approvedAt: row.approved_at || undefined,
      discardedAt: row.discarded_at || undefined,
    };
  }
}
