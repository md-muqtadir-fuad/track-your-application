import Database from '@tauri-apps/plugin-sql';
import type { Executor, QueryResult } from './executor';

export class TauriSqlExecutor implements Executor {
  private db: Database | null = null;
  private readonly dbPath: string;

  constructor(dbPath = 'sqlite:phd_tracker.db') {
    this.dbPath = dbPath;
  }

  async init(): Promise<void> {
    if (!this.db) {
      this.db = await Database.load(this.dbPath);
    }
  }

  private async getDb(): Promise<Database> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  async select<T = unknown>(query: string, bindValues?: unknown[]): Promise<T[]> {
    const db = await this.getDb();
    return db.select<T[]>(query, bindValues);
  }

  async execute(query: string, bindValues?: unknown[]): Promise<QueryResult> {
    const db = await this.getDb();
    const result = await db.execute(query, bindValues);
    return {
      rowsAffected: result.rowsAffected,
      lastInsertId: result.lastInsertId,
    };
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}
