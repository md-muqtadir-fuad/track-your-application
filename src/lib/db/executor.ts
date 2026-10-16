export interface QueryResult {
  rowsAffected: number;
  lastInsertId?: number;
}

export interface Executor {
  select<T = unknown>(query: string, bindValues?: unknown[]): Promise<T[]>;
  execute(query: string, bindValues?: unknown[]): Promise<QueryResult>;
  close?(): Promise<void>;
}
