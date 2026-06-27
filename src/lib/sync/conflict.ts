import { getLocalBrowserDb } from "@/lib/db/local/client.browser";
import { conflictQueue, syncQueue } from "@/lib/db/local/schema";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────

interface SyncQueueItem {
  id: string;
  entity: string;
  entity_id: string | null;
  action: string;
  payload: unknown;
  schema_version: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

interface ConflictData {
  entity: string;
  entity_id: string | null;
  local_data: unknown;
  local_action: string;
  server_data: unknown;
  conflicting_items: Array<{
    id: string;
    action: string;
    payload: unknown;
  }>;
}

// ─── detectConflict ─────────────────────────────────────────────
export async function detectConflict(item: {
  id: string;
  entity: string;
  entity_id: string;
  action: string;
  payload: unknown;
  schema_version: number;
}): Promise<{ hasConflict: boolean; conflictId?: string }> {
  const db = getLocalBrowserDb();

  if (item.action === "CREATE") {
    return { hasConflict: false };
  }

  const existingConflicts = await db
    .select()
    .from(conflictQueue)
    .where(eq(conflictQueue.entity, item.entity));

  const matchingConflict = existingConflicts.find((c) => {
    const data = c.conflict_data as ConflictData | null;
    return data?.entity_id === item.entity_id && !c.resolved;
  });

  if (matchingConflict) {
    return { hasConflict: true, conflictId: matchingConflict.id };
  }

  const payload =
    typeof item.payload === "string" ? JSON.parse(item.payload) : item.payload;

  const otherChanges = await db
    .select()
    .from(syncQueue)
    .where(eq(syncQueue.entity, item.entity));

  const concurrentChanges = otherChanges.filter(
    (c: SyncQueueItem) =>
      c.entity_id === item.entity_id &&
      c.id !== item.id &&
      c.status === "PENDING"
  );

  if (concurrentChanges.length > 0) {
    const conflictId = uuidv4();
    const conflictData: ConflictData = {
      entity: item.entity,
      entity_id: item.entity_id,
      local_data: payload,
      local_action: item.action,
      server_data: null,
      conflicting_items: concurrentChanges.map((c: SyncQueueItem) => ({
        id: c.id,
        action: c.action,
        payload:
          typeof c.payload === "string" ? JSON.parse(c.payload) : c.payload,
      })),
    };

    await db.insert(conflictQueue).values({
      id: conflictId,
      entity: item.entity,
      entity_id: item.entity_id,
      conflict_data: conflictData,
      schema_version: item.schema_version,
      resolved: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return { hasConflict: true, conflictId };
  }

  return { hasConflict: false };
}

// ─── resolveConflict ────────────────────────────────────────────
export async function resolveConflict(
  conflictId: string,
  resolution: "LOCAL_WINS" | "SERVER_WINS" | "MERGE",
  mergedData?: unknown
) {
  const db = getLocalBrowserDb();

  const conflicts = await db
    .select()
    .from(conflictQueue)
    .where(eq(conflictQueue.id, conflictId))
    .limit(1);

  if (!conflicts[0]) throw new Error("Conflict not found");
  if (conflicts[0].resolved) throw new Error("Conflict already resolved");

  const conflict = conflicts[0];
  const data = conflict.conflict_data as ConflictData | null;

  const resolutionData = {
    resolution,
    mergedData: mergedData || null,
    resolvedAt: new Date().toISOString(),
  };

  await db
    .update(conflictQueue)
    .set({
      resolved: true,
      conflict_data: { ...data, ...resolutionData },
      updated_at: new Date(),
    })
    .where(eq(conflictQueue.id, conflictId));

  if (data?.conflicting_items) {
    for (const item of data.conflicting_items) {
      await db
        .update(syncQueue)
        .set({ status: "RESOLVED", updated_at: new Date() })
        .where(eq(syncQueue.id, item.id));
    }
  }

  return {
    conflictId,
    resolution,
    entity: conflict.entity,
    entityId: conflict.entity_id,
  };
}

// ─── getPendingConflicts ────────────────────────────────────────
export async function getPendingConflicts() {
  const db = getLocalBrowserDb();
  return db
    .select()
    .from(conflictQueue)
    .where(eq(conflictQueue.resolved, false))
    .orderBy(desc(conflictQueue.created_at));
}

// ─── getConflictById ────────────────────────────────────────────
export async function getConflictById(id: string) {
  const db = getLocalBrowserDb();
  const rows = await db
    .select()
    .from(conflictQueue)
    .where(eq(conflictQueue.id, id))
    .limit(1);
  return rows[0] || null;
}