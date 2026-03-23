import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Config } from "../../config.js";
import { roomManager } from "../../models/RoomManager.js";
import { registerRateLimit } from "../../plugins/rateLimit.js";
import { healthRoutes } from "../../routes/health.js";
import { roomRoutes } from "../../routes/rooms.js";

function buildConfig(overrides?: Partial<Config>): Config {
  return {
    DATABASE_URL: "http://localhost:5432/db",
    JUDGE0_API_URL: "https://judge0-ce.p.rapidapi.com",
    JUDGE0_API_KEY: "test-key",
    JUDGE0_DAILY_LIMIT: 100,
    GROQ_API_KEY: "test-key",
    GROQ_MODEL: "llama-3.3-70b-versatile",
    GROQ_API_URL: "https://api.groq.com/openai/v1/chat/completions",
    LEETCODE_GRAPHQL_URL: "https://leetcode.com/graphql",
    PORT: 3001,
    NODE_ENV: "test",
    CORS_ORIGIN: "http://localhost:5173",
    ALLOWED_ORIGINS: ["http://localhost:5173"],
    LOG_LEVEL: "info",
    RATE_LIMIT_ROOM_CREATE: 10,
    RATE_LIMIT_WS_CONNECT: 20,
    RATE_LIMIT_JOIN: 30,
    RATE_LIMIT_IMPORT: 10,
    TRUSTED_PROXY_IPS: [],
    ENABLE_PROBLEM_IMPORT: false,
    ENABLE_LLM_HINT_FALLBACK: false,
    ENABLE_IMPORTED_PROBLEM_HINTS: false,
    MAX_SOCKET_EVENT_BYTES: 16_384,
    MAX_CODE_BYTES: 65_536,
    MAX_YJS_MESSAGE_BYTES: 32_768,
    MAX_YJS_DOC_BYTES: 65_536,
    MAX_LLM_CALLS_PER_ROOM: 15,
    MAX_LLM_PROMPT_CHARS: 12_000,
    MAX_LLM_HINT_CHARS: 1_500,
    ROOM_GRACE_PERIOD_MS: 300_000,
    ROOM_HINT_CONSENT_MS: 30_000,
    ROOM_MAX_SUBMISSIONS: 20,
    ROOM_MAX_IMPORTS: 3,
    ROOM_MAX_CUSTOM_TEST_CASES: 10,
    IMPORTS_DAILY_LIMIT: 50,
    JUDGE0_REQUEST_TIMEOUT_MS: 30_000,
    GROQ_MAX_TOKENS: 512,
    GROQ_TEMPERATURE: 0.6,
    GROQ_REQUEST_TIMEOUT_MS: 15_000,
    LEETCODE_REQUEST_TIMEOUT_MS: 10_000,
    ...overrides,
  };
}

async function buildApp(configOverrides?: Partial<Config>) {
  const app = Fastify();
  const config = buildConfig(configOverrides);
  await registerRateLimit(app, config);
  app.register(roomRoutes, { prefix: "/api", config });
  app.register(healthRoutes);
  await app.ready();
  return app;
}

function _destroyAllRooms() {
  // getRoomCount tells us how many exist; iterate via creating/checking codes
  // Simpler: we track codes ourselves in each test
}

describe("POST /api/rooms", () => {
  const createdCodes: string[] = [];

  afterEach(() => {
    for (const code of createdCodes) {
      roomManager.destroyRoom(code);
    }
    createdCodes.length = 0;
  });

  it("returns 201 with roomCode matching /^[a-z2-7]{3}-[a-z2-7]{3}$/ for collaboration mode", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "collaboration", displayName: "Alice" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.roomCode).toMatch(/^[a-z2-7]{3}-[a-z2-7]{3}$/);
    createdCodes.push(body.roomCode);

    const room = roomManager.getRoom(body.roomCode);
    expect(room).toBeDefined();
    expect(room?.mode).toBe("collaboration");
  });

  it("returns 201 with roomCode for interview mode", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "interview", displayName: "Interviewer" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.roomCode).toMatch(/^[a-z2-7]{3}-[a-z2-7]{3}$/);
    createdCodes.push(body.roomCode);

    const room = roomManager.getRoom(body.roomCode);
    expect(room).toBeDefined();
    expect(room?.mode).toBe("interview");
  });

  it("returns 400 when mode is missing", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { displayName: "Alice" },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 when mode is invalid", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "deathmatch", displayName: "Alice" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when displayName is missing", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "collaboration" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns unique roomCodes on successive calls", async () => {
    const app = await buildApp();
    const codes = new Set<string>();

    for (let i = 0; i < 5; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/api/rooms",
        payload: { mode: "collaboration", displayName: `Alice ${i}` },
      });
      const body = res.json();
      codes.add(body.roomCode);
      createdCodes.push(body.roomCode);
    }

    expect(codes.size).toBe(5);
  });

  it("rate limits room creation without applying the same limit to unrelated routes", async () => {
    const app = await buildApp({ RATE_LIMIT_ROOM_CREATE: 1 });

    const first = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "collaboration", displayName: "Alice" },
    });
    const { roomCode } = first.json();
    createdCodes.push(roomCode);

    const second = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "collaboration", displayName: "Bob" },
    });

    expect(second.statusCode).toBe(429);
    expect(second.headers["retry-after"]).toBeDefined();

    const health = await app.inject({
      method: "GET",
      url: "/api/health",
    });
    expect(health.statusCode).toBe(200);
  });
});

describe("GET /api/rooms/:roomCode", () => {
  const createdCodes: string[] = [];

  afterEach(() => {
    for (const code of createdCodes) {
      roomManager.destroyRoom(code);
    }
    createdCodes.length = 0;
  });

  it("returns { exists: true, mode, userCount, maxUsers } for existing room", async () => {
    const app = await buildApp();
    const createRes = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "collaboration", displayName: "Alice" },
    });
    const { roomCode } = createRes.json();
    createdCodes.push(roomCode);

    const res = await app.inject({
      method: "GET",
      url: `/api/rooms/${roomCode}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.exists).toBe(true);
    expect(body.mode).toBe("collaboration");
    expect(body.userCount).toBe(0);
    expect(body.maxUsers).toBe(2);
  });

  it("returns { exists: false } for non-existent room", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/rooms/zzz-zzz",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.exists).toBe(false);
  });

  it("room code lookup is case-insensitive", async () => {
    const app = await buildApp();
    const createRes = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "interview", displayName: "Interviewer" },
    });
    const { roomCode } = createRes.json();
    createdCodes.push(roomCode);

    const res = await app.inject({
      method: "GET",
      url: `/api/rooms/${roomCode.toUpperCase()}`,
    });

    const body = res.json();
    expect(body.exists).toBe(true);
    expect(body.mode).toBe("interview");
  });

  it("counts held reconnect slots as occupied during the grace period", async () => {
    const app = await buildApp();
    const createRes = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "collaboration", displayName: "Alice" },
    });
    const { roomCode } = createRes.json();
    createdCodes.push(roomCode);

    const room = roomManager.getRoom(roomCode);
    if (!room) throw new Error("Room not found");
    room.addUser("Alice", "peer", "socket-a");
    const disconnectedUser = room.addUser("Bob", "peer", "socket-b");
    disconnectedUser.connected = false;

    const res = await app.inject({
      method: "GET",
      url: `/api/rooms/${roomCode}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().userCount).toBe(2);
  });
});

describe("GET /api/health", () => {
  const createdCodes: string[] = [];

  beforeEach(() => {
    roomManager.resetRooms();
  });

  afterEach(() => {
    for (const code of createdCodes) {
      roomManager.destroyRoom(code);
    }
    createdCodes.length = 0;
    roomManager.resetRooms();
  });

  it("returns roomCount reflecting active rooms", async () => {
    const app = await buildApp();

    const room1 = roomManager.createRoom("collaboration");
    const room2 = roomManager.createRoom("interview");
    createdCodes.push(room1.roomCode, room2.roomCode);

    const res = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.roomCount).toBe(2);
    expect(typeof body.dbConnected).toBe("boolean");
  });

  it("returns roomCount 0 when no rooms exist", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.roomCount).toBe(0);
  });
});
