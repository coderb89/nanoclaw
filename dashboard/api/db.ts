import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH
  ?? path.resolve(import.meta.dirname, '../../store/messages.db');

let db: Database.Database;
let dbWrite: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
  }
  return db;
}

export function getWriteDb(): Database.Database {
  if (!dbWrite) {
    dbWrite = new Database(DB_PATH);
  }
  return dbWrite;
}

// --- Types (mirrored from NanoClaw src/types.ts) ---

export interface RegisteredGroupRow {
  jid: string;
  name: string;
  folder: string;
  trigger_pattern: string;
  added_at: string;
  container_config: string | null;
  requires_trigger: number | null;
  is_main: number | null;
  model: string | null;
}

export interface MessageRow {
  id: string;
  chat_jid: string;
  sender: string;
  sender_name: string;
  content: string;
  timestamp: string;
  is_from_me: number;
  is_bot_message: number;
}

export interface TaskRow {
  id: string;
  group_folder: string;
  chat_jid: string;
  prompt: string;
  schedule_type: string;
  schedule_value: string;
  context_mode: string;
  next_run: string | null;
  last_run: string | null;
  last_result: string | null;
  status: string;
  created_at: string;
}

export interface TaskRunLogRow {
  id: number;
  task_id: string;
  run_at: string;
  duration_ms: number;
  status: string;
  result: string | null;
  error: string | null;
}

export interface ChatRow {
  jid: string;
  name: string;
  last_message_time: string;
  channel: string | null;
  is_group: number;
}

// --- Query functions ---

export function getGroups(): RegisteredGroupRow[] {
  return getDb()
    .prepare('SELECT * FROM registered_groups ORDER BY added_at DESC')
    .all() as RegisteredGroupRow[];
}

export function getMessages(
  jid: string,
  before: string | undefined,
  limit: number = 50,
): MessageRow[] {
  if (before) {
    return getDb()
      .prepare(
        `SELECT * FROM (
          SELECT * FROM messages WHERE chat_jid = ? AND timestamp < ?
          ORDER BY timestamp DESC LIMIT ?
        ) ORDER BY timestamp ASC`,
      )
      .all(jid, before, limit) as MessageRow[];
  }
  return getDb()
    .prepare(
      `SELECT * FROM (
        SELECT * FROM messages WHERE chat_jid = ?
        ORDER BY timestamp DESC LIMIT ?
      ) ORDER BY timestamp ASC`,
    )
    .all(jid, limit) as MessageRow[];
}

export function searchMessages(
  query: string,
  limit: number = 50,
): (MessageRow & { chat_name: string })[] {
  return getDb()
    .prepare(
      `SELECT m.*, COALESCE(c.name, m.chat_jid) AS chat_name
       FROM messages m LEFT JOIN chats c ON c.jid = m.chat_jid
       WHERE m.content LIKE ?
       ORDER BY m.timestamp DESC LIMIT ?`,
    )
    .all(`%${query}%`, limit) as (MessageRow & { chat_name: string })[];
}

export function getTasks(): TaskRow[] {
  return getDb()
    .prepare('SELECT * FROM scheduled_tasks ORDER BY created_at DESC')
    .all() as TaskRow[];
}

export function getTaskRunLogs(taskId: string): TaskRunLogRow[] {
  return getDb()
    .prepare('SELECT * FROM task_run_logs WHERE task_id = ? ORDER BY run_at DESC LIMIT 50')
    .all(taskId) as TaskRunLogRow[];
}

export function getChats(): ChatRow[] {
  return getDb()
    .prepare(`SELECT * FROM chats WHERE jid != '__group_sync__' ORDER BY last_message_time DESC`)
    .all() as ChatRow[];
}

// --- API Usage queries ---

export interface UsageSummary {
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  invocations: number;
}

export interface UsageByGroup {
  group_folder: string;
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  invocations: number;
}

export interface UsageDailyTrend {
  date: string;
  total_cost: number;
  invocations: number;
}

export interface UsageRow {
  id: number;
  group_folder: string;
  chat_jid: string;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  duration_ms: number;
  num_turns: number;
  model: string | null;
  created_at: string;
}

export function getUsageSummary(since: string): UsageSummary {
  const row = getDb()
    .prepare(
      `SELECT
        COALESCE(SUM(cost_usd), 0) AS total_cost,
        COALESCE(SUM(input_tokens), 0) AS total_input_tokens,
        COALESCE(SUM(output_tokens), 0) AS total_output_tokens,
        COUNT(*) AS invocations
      FROM api_usage WHERE created_at >= ?`,
    )
    .get(since) as UsageSummary;
  return row;
}

export function getUsageByGroup(since: string): UsageByGroup[] {
  return getDb()
    .prepare(
      `SELECT
        group_folder,
        COALESCE(SUM(cost_usd), 0) AS total_cost,
        COALESCE(SUM(input_tokens), 0) AS total_input_tokens,
        COALESCE(SUM(output_tokens), 0) AS total_output_tokens,
        COUNT(*) AS invocations
      FROM api_usage WHERE created_at >= ?
      GROUP BY group_folder ORDER BY total_cost DESC`,
    )
    .all(since) as UsageByGroup[];
}

export function getUsageDailyTrend(since: string): UsageDailyTrend[] {
  return getDb()
    .prepare(
      `SELECT
        DATE(created_at) AS date,
        COALESCE(SUM(cost_usd), 0) AS total_cost,
        COUNT(*) AS invocations
      FROM api_usage WHERE created_at >= ?
      GROUP BY DATE(created_at) ORDER BY date DESC`,
    )
    .all(since) as UsageDailyTrend[];
}

export interface UsageByModel {
  model: string;
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  invocations: number;
}

export function getUsageByModel(since: string): UsageByModel[] {
  return getDb()
    .prepare(
      `SELECT
        COALESCE(model, 'unknown') AS model,
        COALESCE(SUM(cost_usd), 0) AS total_cost,
        COALESCE(SUM(input_tokens), 0) AS total_input_tokens,
        COALESCE(SUM(output_tokens), 0) AS total_output_tokens,
        COUNT(*) AS invocations
      FROM api_usage WHERE created_at >= ?
      GROUP BY model ORDER BY total_cost DESC`,
    )
    .all(since) as UsageByModel[];
}

export function setGroupModel(folder: string, model: string | null): void {
  getWriteDb()
    .prepare(`UPDATE registered_groups SET model = ? WHERE folder = ?`)
    .run(model, folder);
}

// --- Todo queries ---

export interface TodoRow {
  id: string;
  group_folder: string;
  title: string;
  completed: number;
  created_at: string;
  updated_at: string;
}

export function getTodos(groupFolder: string): TodoRow[] {
  return getDb()
    .prepare(
      'SELECT * FROM todos WHERE group_folder = ? ORDER BY created_at DESC',
    )
    .all(groupFolder) as TodoRow[];
}

export function getRecentUsage(limit: number = 20): UsageRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM api_usage ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit) as UsageRow[];
}
