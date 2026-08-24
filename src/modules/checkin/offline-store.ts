"use client";

import {
  decryptJson,
  encryptJson,
  generatePackKey,
} from "./offline-crypto";
import type {
  OfflineCheckInPack,
  OfflinePackAttendee,
  OfflinePendingCheckIn,
} from "./offline-types";

const DB_NAME = "bizcon-offline-checkin";
const DB_VERSION = 1;
const PACK_STORE = "packs";
const QUEUE_STORE = "pending";
const META_STORE = "meta";

type PackRecord = {
  eventId: string;
  organisationId: string;
  orgSlug: string;
  eventName: string;
  downloadedAt: string;
  expiresAt: string;
  attendeeCount: number;
  /** AES-GCM encrypted JSON of OfflinePackAttendee[] */
  ciphertext: string;
};

function keySessionName(eventId: string) {
  return `offline-pack-key:${eventId}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PACK_STORE)) {
        db.createObjectStore(PACK_STORE, { keyPath: "eventId" });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: "clientId" });
        store.createIndex("byEvent", "eventId", { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

function getPackKey(eventId: string): string | null {
  try {
    return sessionStorage.getItem(keySessionName(eventId));
  } catch {
    return null;
  }
}

function setPackKey(eventId: string, key: string) {
  sessionStorage.setItem(keySessionName(eventId), key);
}

export function clearPackKey(eventId: string) {
  try {
    sessionStorage.removeItem(keySessionName(eventId));
  } catch {
    // ignore
  }
}

export type OfflinePackSummary = {
  eventId: string;
  eventName: string;
  downloadedAt: string;
  expiresAt: string;
  attendeeCount: number;
  expired: boolean;
  unlockable: boolean;
};

export async function saveOfflinePack(pack: OfflineCheckInPack): Promise<void> {
  const key = await generatePackKey();
  setPackKey(pack.eventId, key);
  const ciphertext = await encryptJson(key, pack.attendees);
  const db = await openDb();
  const tx = db.transaction(PACK_STORE, "readwrite");
  await idbReq(
    tx.objectStore(PACK_STORE).put({
      eventId: pack.eventId,
      organisationId: pack.organisationId,
      orgSlug: pack.orgSlug,
      eventName: pack.eventName,
      downloadedAt: pack.downloadedAt,
      expiresAt: pack.expiresAt,
      attendeeCount: pack.attendeeCount,
      ciphertext,
    } satisfies PackRecord),
  );
  db.close();
}

export async function getOfflinePackSummary(
  eventId: string,
): Promise<OfflinePackSummary | null> {
  const db = await openDb();
  const record = await idbReq(
    db.transaction(PACK_STORE, "readonly").objectStore(PACK_STORE).get(eventId),
  );
  db.close();
  if (!record) return null;
  const row = record as PackRecord;
  return {
    eventId: row.eventId,
    eventName: row.eventName,
    downloadedAt: row.downloadedAt,
    expiresAt: row.expiresAt,
    attendeeCount: row.attendeeCount,
    expired: new Date(row.expiresAt).getTime() < Date.now(),
    unlockable: Boolean(getPackKey(eventId)),
  };
}

async function loadAttendees(eventId: string): Promise<OfflinePackAttendee[] | null> {
  const key = getPackKey(eventId);
  if (!key) return null;
  const db = await openDb();
  const record = await idbReq(
    db.transaction(PACK_STORE, "readonly").objectStore(PACK_STORE).get(eventId),
  );
  db.close();
  if (!record) return null;
  const row = record as PackRecord;
  if (new Date(row.expiresAt).getTime() < Date.now()) return null;
  return decryptJson<OfflinePackAttendee[]>(key, row.ciphertext);
}

async function writeAttendees(eventId: string, attendees: OfflinePackAttendee[]) {
  const key = getPackKey(eventId);
  if (!key) throw new Error("Offline pack key missing. Re-download the pack online.");
  const db = await openDb();
  const store = db.transaction(PACK_STORE, "readwrite").objectStore(PACK_STORE);
  const record = (await idbReq(store.get(eventId))) as PackRecord | undefined;
  if (!record) throw new Error("No offline pack on this device.");
  record.ciphertext = await encryptJson(key, attendees);
  record.attendeeCount = attendees.length;
  await idbReq(store.put(record));
  db.close();
}

export async function findOfflineAttendeeByTokenHash(
  eventId: string,
  qrTokenHash: string,
): Promise<OfflinePackAttendee | null> {
  const attendees = await loadAttendees(eventId);
  if (!attendees) return null;
  return attendees.find((a) => a.qrTokenHash === qrTokenHash) ?? null;
}

export async function markOfflineAttendeeCheckedIn(
  eventId: string,
  attendeeId: string,
  checkedInAt: string,
) {
  const attendees = await loadAttendees(eventId);
  if (!attendees) return;
  const next = attendees.map((a) =>
    a.attendeeId === attendeeId
      ? { ...a, alreadyCheckedIn: true, checkedInAt }
      : a,
  );
  await writeAttendees(eventId, next);
}

type PendingRecord = OfflinePendingCheckIn & { eventId: string };

export async function enqueueOfflineCheckIn(
  eventId: string,
  item: OfflinePendingCheckIn,
) {
  const db = await openDb();
  await idbReq(
    db.transaction(QUEUE_STORE, "readwrite").objectStore(QUEUE_STORE).put({
      ...item,
      eventId,
    } satisfies PendingRecord),
  );
  db.close();
}

export async function listPendingCheckIns(
  eventId: string,
): Promise<OfflinePendingCheckIn[]> {
  const db = await openDb();
  const store = db.transaction(QUEUE_STORE, "readonly").objectStore(QUEUE_STORE);
  const index = store.index("byEvent");
  const rows = (await idbReq(index.getAll(eventId))) as PendingRecord[];
  db.close();
  return rows
    .filter((r) => r.status === "pending" || r.status === "failed")
    .map(({ eventId: _e, ...rest }) => rest);
}

export async function countPendingCheckIns(eventId: string): Promise<number> {
  const pending = await listPendingCheckIns(eventId);
  return pending.length;
}

export async function removePendingCheckIns(clientIds: string[]) {
  if (clientIds.length === 0) return;
  const db = await openDb();
  const store = db.transaction(QUEUE_STORE, "readwrite").objectStore(QUEUE_STORE);
  for (const id of clientIds) {
    await idbReq(store.delete(id));
  }
  db.close();
}

export async function clearOfflinePack(eventId: string) {
  clearPackKey(eventId);
  const db = await openDb();
  await idbReq(
    db.transaction(PACK_STORE, "readwrite").objectStore(PACK_STORE).delete(eventId),
  );
  const store = db.transaction(QUEUE_STORE, "readwrite").objectStore(QUEUE_STORE);
  const index = store.index("byEvent");
  const rows = (await idbReq(index.getAll(eventId))) as PendingRecord[];
  for (const row of rows) {
    await idbReq(store.delete(row.clientId));
  }
  db.close();
}

export function newClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `off_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
