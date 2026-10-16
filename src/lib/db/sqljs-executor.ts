import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import type { Executor, QueryResult } from './executor';

export class SqlJsExecutor implements Executor {
  private db: Database | null = null;

  async init(): Promise<void> {
    if (!this.db) {
      const SQL = await initSqlJs();
      this.db = new SQL.Database();
      // Enable foreign keys
      this.db.run('PRAGMA foreign_keys = ON;');
    }
  }

  static async create(): Promise<SqlJsExecutor> {
    const executor = new SqlJsExecutor();
    await executor.init();
    return executor;
  }

  private normalizeQuery(query: string): string {
    // Normalise $1, $2... style placeholders to ? for sqlite positional binding if used
    return query.replace(/\$\d+/g, '?');
  }

  private normalizeBinds(bindValues?: unknown[]): SqlValue[] {
    if (!bindValues) return [];
    return bindValues.map((val) => {
      if (val === undefined || val === null) return null;
      if (typeof val === 'boolean') return val ? 1 : 0;
      if (typeof val === 'number' || typeof val === 'string') return val;
      if (val instanceof Uint8Array) return val;
      return JSON.stringify(val);
    });
  }

  async select<T = unknown>(query: string, bindValues?: unknown[]): Promise<T[]> {
    if (!this.db) {
      await this.init();
    }
    const db = this.db!;
    const normQuery = this.normalizeQuery(query);
    const params = this.normalizeBinds(bindValues);

    const stmt = db.prepare(normQuery);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return rows;
  }

  async execute(query: string, bindValues?: unknown[]): Promise<QueryResult> {
    if (!this.db) {
      await this.init();
    }
    const db = this.db!;
    const normQuery = this.normalizeQuery(query);
    const params = this.normalizeBinds(bindValues);

    if (params.length > 0) {
      db.run(normQuery, params);
    } else {
      db.run(normQuery);
    }

    const rowsAffected = db.getRowsModified();
    return {
      rowsAffected,
    };
  }

  async runMigration(sql: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }
    this.db!.run(sql);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
