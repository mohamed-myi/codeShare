import * as encoding from "lib0/encoding";
import type { RawData, WebSocket } from "ws";
import * as awarenessProtocol from "y-protocols/awareness.js";
import * as syncProtocol from "y-protocols/sync.js";
import * as Y from "yjs";

const docs = new Map<string, WSSharedDoc>();

const messageAwareness = 1;
const messageSync = 0;
const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;

export class WSSharedDoc extends Y.Doc {
  readonly name: string;
  readonly conns = new Map<WebSocket, Set<number>>();
  readonly awareness: awarenessProtocol.Awareness;

  constructor(name: string) {
    super();
    this.name = name;
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    this.awareness.on(
      "update",
      (
        { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
        conn: unknown,
      ) => {
        const changedClients = added.concat(updated, removed);
        if (conn !== null) {
          const controlledIds = this.conns.get(conn as WebSocket);
          if (controlledIds) {
            for (const clientId of added) {
              controlledIds.add(clientId);
            }
            for (const clientId of removed) {
              controlledIds.delete(clientId);
            }
          }
        }

        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
        );
        const message = encoding.toUint8Array(encoder);

        for (const conn of this.conns.keys()) {
          send(this, conn, message);
        }
      },
    );

    this.on("update", (update) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);

      for (const conn of this.conns.keys()) {
        send(this, conn, message);
      }
    });
  }
}

export function getOrCreateSharedDoc(docName: string): WSSharedDoc {
  const existing = docs.get(docName);
  if (existing) {
    return existing;
  }

  const doc = new WSSharedDoc(docName);
  docs.set(docName, doc);
  return doc;
}

export function findSharedDoc(docName: string): Y.Doc | undefined {
  return docs.get(docName);
}

export function destroySharedDoc(docName: string): void {
  const doc = docs.get(docName);
  if (!doc) {
    return;
  }

  for (const conn of Array.from(doc.conns.keys())) {
    closeConn(doc, conn);
  }

  doc.awareness.destroy();
  doc.destroy();
  docs.delete(docName);
}

export function destroyAllSharedDocs(): void {
  for (const docName of Array.from(docs.keys())) {
    destroySharedDoc(docName);
  }
}

export function closeConn(doc: WSSharedDoc, conn: WebSocket, code?: number, reason?: string): void {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds ?? []), null);
  }
  if (conn.readyState === wsReadyStateConnecting || conn.readyState === wsReadyStateOpen) {
    conn.close(code, reason);
  }
}

function send(doc: WSSharedDoc, conn: WebSocket, message: Uint8Array): void {
  if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
    closeConn(doc, conn);
    return;
  }

  try {
    conn.send(message, {}, (error) => {
      if (error) {
        closeConn(doc, conn);
      }
    });
  } catch {
    closeConn(doc, conn);
  }
}

export function toUint8Array(message: RawData): Uint8Array {
  if (message instanceof ArrayBuffer) {
    return new Uint8Array(message);
  }

  if (Array.isArray(message)) {
    return Buffer.concat(message).subarray();
  }

  if (typeof message === "string") {
    return new TextEncoder().encode(message);
  }

  return new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
}
