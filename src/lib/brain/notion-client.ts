// Notion API wrapper for Brain Inbox sync
// Reads NOTION_TOKEN + NOTION_BRAIN_INBOX_DATA_SOURCE_ID from env

import { Client } from "@notionhq/client";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const BRAIN_INBOX_DS =
  process.env.NOTION_BRAIN_INBOX_DATA_SOURCE_ID ||
  "21009888-8a5b-47ab-b29e-53fec786d805";

let _client: Client | null = null;

export function getNotionClient(): Client | null {
  if (!NOTION_TOKEN) return null;
  if (!_client) _client = new Client({ auth: NOTION_TOKEN });
  return _client;
}

export function notionConfigured(): boolean {
  return Boolean(NOTION_TOKEN);
}

export interface NotionRow {
  pageId: string;
  url?: string;
  title?: string;
  status?: string;
  route?: string;
  score?: number;
  filterVerdict?: string;
  brainPath?: string;
  notesFromPg?: string;
  lastEditedTime: string;
}

function plain(prop: any): string | undefined {
  if (!prop) return undefined;
  if (prop.type === "title" && Array.isArray(prop.title))
    return (
      prop.title
        .map((t: any) => t.plain_text)
        .join("")
        .trim() || undefined
    );
  if (prop.type === "rich_text" && Array.isArray(prop.rich_text))
    return (
      prop.rich_text
        .map((t: any) => t.plain_text)
        .join("")
        .trim() || undefined
    );
  if (prop.type === "url") return prop.url || undefined;
  if (prop.type === "select") return prop.select?.name || undefined;
  if (prop.type === "number") return prop.number?.toString();
  return undefined;
}

function mapPage(page: any): NotionRow {
  const p = page.properties || {};
  return {
    pageId: page.id,
    url: plain(p.URL ?? p["userDefined:URL"]),
    title: plain(p.Title),
    status: plain(p.Status),
    route: plain(p.Route),
    score: p["Composite score"]?.number ?? undefined,
    filterVerdict: plain(p["Filter verdict"]),
    brainPath: plain(p["Brain path"]),
    notesFromPg: plain(p["Notes from PG"]),
    lastEditedTime: page.last_edited_time,
  };
}

/**
 * List recently-edited rows in the Brain Inbox.
 * Used by the periodic poll to detect Status changes.
 */
export async function listInboxRows(since?: string): Promise<NotionRow[]> {
  const client = getNotionClient();
  if (!client) return [];
  const resp = await (client as any).dataSources.query({
    data_source_id: BRAIN_INBOX_DS,
    page_size: 100,
    sorts: [{ property: "Captured", direction: "descending" }],
  });
  const rows: NotionRow[] = resp.results.map(mapPage);
  if (!since) return rows;
  return rows.filter((r: NotionRow) => r.lastEditedTime > since);
}

/**
 * Update a single row's properties. Used by Brain tab when PG mutates
 * an entry locally and we want to write the change back to Notion.
 */
export async function updateRow(
  pageId: string,
  props: {
    status?: string;
    route?: string;
    score?: number;
    filterVerdict?: string;
    brainPath?: string;
    processed?: string; // YYYY-MM-DD
  },
): Promise<boolean> {
  const client = getNotionClient();
  if (!client) return false;

  const properties: Record<string, any> = {};
  if (props.status) properties["Status"] = { select: { name: props.status } };
  if (props.route) properties["Route"] = { select: { name: props.route } };
  if (props.score !== undefined)
    properties["Composite score"] = { number: props.score };
  if (props.filterVerdict)
    properties["Filter verdict"] = { select: { name: props.filterVerdict } };
  if (props.brainPath) properties["Brain path"] = { url: props.brainPath };
  if (props.processed)
    properties["Processed"] = { date: { start: props.processed } };

  try {
    await client.pages.update({ page_id: pageId, properties });
    return true;
  } catch (e) {
    console.error(`[brain/notion-client] updateRow ${pageId} failed:`, e);
    return false;
  }
}

export function getInboxUrl(): string {
  return `https://www.notion.so/${BRAIN_INBOX_DS.replace(/-/g, "")}`;
}
