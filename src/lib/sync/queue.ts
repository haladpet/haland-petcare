import { getLocalBrowserDb } from "@/lib/db/local/client.browser";
import { syncQueue } from "@/lib/db/local/schema";
import { v4 as uuidv4 } from "uuid";

interface SyncQueuePayload {
  [key: string]: unknown;
}

export const writeToSyncQueue = async (
  entity: string,
  entityId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  payload: SyncQueuePayload
) => {
  const db = getLocalBrowserDb();
  const id = uuidv4();
  await db.insert(syncQueue).values({
    id,
    entity,
    entity_id: entityId,
    action,
    payload,
    schema_version: 1,
    status: "PENDING",
    created_at: new Date(),
    updated_at: new Date(),
  });
  return id;
};