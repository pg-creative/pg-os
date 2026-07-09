import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import { pgPath } from "./paths";

const DB_PATH = pgPath("claude-web-history", "db", "archive.db");

export type ArchiveStats = {
  totalConversations: number;
  totalMessages: number;
  dateRange: { first: string; last: string };
  recentMonths: Array<{ month: string; conversations: number; messages: number }>;
};

export type ArchiveConversation = {
  uuid: string;
  name: string;
  summary: string;
  created_at: string;
  message_count: number;
};

function openDb(): DatabaseSync | null {
  try {
    if (!fs.existsSync(DB_PATH)) return null;
    return new DatabaseSync(DB_PATH, { readOnly: true });
  } catch {
    return null;
  }
}

export function getArchiveStats(): ArchiveStats | null {
  const db = openDb();
  if (!db) return null;
  try {
    const convRow = db.prepare("SELECT COUNT(*) as n FROM conversations").get() as { n: number };
    const msgRow = db.prepare("SELECT COUNT(*) as n FROM messages").get() as { n: number };
    const rangeRow = db
      .prepare("SELECT MIN(created_at) as first, MAX(created_at) as last FROM conversations")
      .get() as { first: string | null; last: string | null };

    const convByMonth = db
      .prepare(
        "SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as n FROM conversations WHERE created_at IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT 12",
      )
      .all() as { month: string; n: number }[];
    const msgByMonth = db
      .prepare(
        "SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as n FROM messages WHERE created_at IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT 12",
      )
      .all() as { month: string; n: number }[];

    const msgMap = new Map(msgByMonth.map((m) => [m.month, m.n]));
    const recentMonths = convByMonth.map((c) => ({
      month: c.month,
      conversations: c.n,
      messages: msgMap.get(c.month) ?? 0,
    }));

    return {
      totalConversations: convRow.n,
      totalMessages: msgRow.n,
      dateRange: { first: rangeRow.first ?? "", last: rangeRow.last ?? "" },
      recentMonths,
    };
  } catch {
    return null;
  } finally {
    db.close();
  }
}

function escapeFtsQuery(q: string): string {
  // FTS5 MATCH treats some chars as operators. Wrap each token in double quotes.
  const tokens = q
    .split(/\s+/)
    .map((t) => t.replace(/["']/g, "").trim())
    .filter(Boolean);
  if (!tokens.length) return "";
  return tokens.map((t) => `"${t}"`).join(" ");
}

export function searchArchive(query: string, limit = 20): ArchiveConversation[] {
  const db = openDb();
  if (!db) return [];
  const ftsQuery = escapeFtsQuery(query);
  if (!ftsQuery) {
    db.close();
    return [];
  }
  try {
    const rows = db
      .prepare(
        `SELECT c.uuid, c.name, c.summary, c.created_at, c.message_count
         FROM messages_fts f
         JOIN messages m ON m.rowid = f.rowid
         JOIN conversations c ON c.uuid = m.conv_uuid
         WHERE messages_fts MATCH ?
         GROUP BY c.uuid
         ORDER BY MIN(f.rank)
         LIMIT ?`,
      )
      .all(ftsQuery, limit) as ArchiveConversation[];
    return rows;
  } catch {
    return [];
  } finally {
    db.close();
  }
}

export function getRecentConversations(limit = 20): ArchiveConversation[] {
  const db = openDb();
  if (!db) return [];
  try {
    const rows = db
      .prepare(
        "SELECT uuid, name, summary, created_at, message_count FROM conversations ORDER BY created_at DESC LIMIT ?",
      )
      .all(limit) as ArchiveConversation[];
    return rows;
  } catch {
    return [];
  } finally {
    db.close();
  }
}
