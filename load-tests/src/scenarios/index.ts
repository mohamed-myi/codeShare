import type { Scenario } from "../types.js";
import lt1 from "./lt1-concurrent-rooms.js";
import lt2 from "./lt2-connection-establishment.js";
import lt3 from "./lt3-room-creation-throughput.js";
import lt4 from "./lt4-event-throughput.js";
import lt5 from "./lt5-execution-under-load.js";
import lt6 from "./lt6-yjs-doc-sync.js";
import lt7 from "./lt7-memory-soak.js";
import lt8 from "./lt8-rate-limit-enforcement.js";
import lt9 from "./lt9-reconnection-under-load.js";
import lt10 from "./lt10-nonmember-rejection.js";
import lt11 from "./lt11-room-limit-enforcement.js";
import lt12 from "./lt12-global-limit-enforcement.js";

export const scenarios: Scenario[] = [
  lt1,
  lt2,
  lt3,
  lt4,
  lt5,
  lt6,
  lt7,
  lt8,
  lt9,
  lt10,
  lt11,
  lt12,
];

export function selectScenarios(allScenarios: Scenario[], requestedIds?: string[]): Scenario[] {
  if (!requestedIds || requestedIds.length === 0) {
    return allScenarios;
  }

  const requested = new Set(requestedIds.map((id) => id.trim().toUpperCase()));
  return allScenarios.filter((scenario) => requested.has(scenario.id.toUpperCase()));
}
