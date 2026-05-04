export type NfrId =
  | "NFR-1.1"
  | "NFR-1.2"
  | "NFR-1.3"
  | "NFR-2.1"
  | "NFR-3.3"
  | "NFR-3.6"
  | "NFR-4.1"
  | "NFR-4.2"
  | "NFR-4.3"
  | "NFR-5.1"
  | "NFR-5.2";

interface NfrEntry {
  title: string;
  thresholds: Record<string, number>;
}

export const NFR: Record<NfrId, NfrEntry> = {
  "NFR-1.1": {
    title: "Real-time latency (Yjs + Socket.io events)",
    thresholds: {
      yjsSyncP95Ms: 100,
      charSyncP50Ms: 100,
      charSyncP95Ms: 100,
      socketEventP50Ms: 100,
      socketEventP95Ms: 100,
      bulkSyncMs: 2000,
    },
  },
  "NFR-1.2": {
    title: "Code execution end-to-end latency",
    thresholds: {
      executionE2eMs: 30_000,
      broadcastDeltaMs: 500,
    },
  },
  "NFR-1.3": {
    title: "Room creation + connection combined latency",
    thresholds: {
      combinedE2eMs: 2000,
      roomCreateP95Ms: 500,
      connectP95Ms: 1500,
    },
  },
  "NFR-2.1": {
    title: "Resource capacity and memory bounds",
    thresholds: {
      concurrentRooms: 20,
      maxHeapMb: 512,
      soakHeapGrowthMb: 100,
      soakHeapDriftMb: 50,
    },
  },
  "NFR-3.3": {
    title: "Reconnection token security",
    thresholds: {},
  },
  "NFR-3.6": {
    title: "Non-member rejection under load",
    thresholds: {
      nonMemberDropP95Ms: 20,
    },
  },
  "NFR-4.1": {
    title: "IP-based rate limit enforcement",
    thresholds: {
      rejectionP95Ms: 20,
    },
  },
  "NFR-4.2": {
    title: "Per-room limits (exec, imports, test cases)",
    thresholds: {
      roomLimitRejectionP95Ms: 50,
    },
  },
  "NFR-4.3": {
    title: "Global limits (Judge0/day, imports/day)",
    thresholds: {},
  },
  "NFR-5.1": {
    title: "Execution correctness under concurrent load",
    thresholds: {},
  },
  "NFR-5.2": {
    title: "Reconnection within grace period",
    thresholds: {
      reconnectLatencyP95Ms: 2000,
    },
  },
};

export const SCENARIO_NFR_MAP: Record<string, NfrId[]> = {
  "LT-1": ["NFR-1.1", "NFR-2.1"],
  "LT-2": ["NFR-1.3"],
  "LT-3": ["NFR-1.3"],
  "LT-4": ["NFR-1.1"],
  "LT-5": ["NFR-1.2", "NFR-5.1"],
  "LT-6": ["NFR-1.1"],
  "LT-7": ["NFR-2.1"],
  "LT-8": ["NFR-4.1"],
  "LT-9": ["NFR-3.3", "NFR-5.2"],
  "LT-10": ["NFR-3.6"],
  "LT-11": ["NFR-4.2"],
  "LT-12": ["NFR-4.3"],
};

export const UNCOVERED_NFRS: NfrId[] = [];
