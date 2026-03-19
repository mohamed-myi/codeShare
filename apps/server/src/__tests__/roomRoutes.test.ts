import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";
import { roomRoutes } from "../routes/rooms.js";
import { healthRoutes } from "../routes/health.js";
import { roomManager } from "../models/RoomManager.js";

function buildApp() {
  const app = Fastify();
  app.register(roomRoutes, { prefix: "/api" });
  app.register(healthRoutes);
  return app;
}

function destroyAllRooms() {
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

  it("returns 201 with roomCode matching /^[a-z]{3}-[a-z]{3}$/ for collaboration mode", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "collaboration" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.roomCode).toMatch(/^[a-z]{3}-[a-z]{3}$/);
    createdCodes.push(body.roomCode);

    const room = roomManager.getRoom(body.roomCode);
    expect(room).toBeDefined();
    expect(room!.mode).toBe("collaboration");
  });

  it("returns 201 with roomCode for interview mode", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "interview" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.roomCode).toMatch(/^[a-z]{3}-[a-z]{3}$/);
    createdCodes.push(body.roomCode);

    const room = roomManager.getRoom(body.roomCode);
    expect(room).toBeDefined();
    expect(room!.mode).toBe("interview");
  });

  it("returns 400 when mode is missing", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 when mode is invalid", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "deathmatch" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns unique roomCodes on successive calls", async () => {
    const app = buildApp();
    const codes = new Set<string>();

    for (let i = 0; i < 5; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/api/rooms",
        payload: { mode: "collaboration" },
      });
      const body = res.json();
      codes.add(body.roomCode);
      createdCodes.push(body.roomCode);
    }

    expect(codes.size).toBe(5);
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
    const app = buildApp();
    const createRes = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "collaboration" },
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
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/rooms/zzz-zzz",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.exists).toBe(false);
  });

  it("room code lookup is case-insensitive", async () => {
    const app = buildApp();
    const createRes = await app.inject({
      method: "POST",
      url: "/api/rooms",
      payload: { mode: "interview" },
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
});

describe("GET /api/health", () => {
  const createdCodes: string[] = [];

  afterEach(() => {
    for (const code of createdCodes) {
      roomManager.destroyRoom(code);
    }
    createdCodes.length = 0;
  });

  it("returns roomCount reflecting active rooms", async () => {
    const app = buildApp();

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
    const app = buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.roomCount).toBe(0);
  });
});
