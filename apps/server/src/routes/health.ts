import { pool } from "@codeshare/db";
import type { HealthResponse } from "@codeshare/shared";
import type { FastifyInstance } from "fastify";
import { roomManager } from "../models/RoomManager.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/health", async (request): Promise<HealthResponse> => {
    let dbConnected = true;
    try {
      await pool.query("SELECT 1");
    } catch {
      dbConnected = false;
    }

    const response: HealthResponse = {
      status: dbConnected ? "ok" : "degraded",
      roomCount: roomManager.getRoomCount(),
      dbConnected,
    };

    const query = request.query as Record<string, string>;
    if (query.metrics === "memory") {
      const mem = process.memoryUsage();
      response.heapUsedMB = Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100;
      response.heapTotalMB = Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100;
      response.rssMB = Math.round((mem.rss / 1024 / 1024) * 100) / 100;
    }

    return response;
  });
}
