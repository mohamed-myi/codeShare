import { pool } from "@codeshare/db";
import type { HealthResponse } from "@codeshare/shared";
import type { FastifyInstance } from "fastify";
import { roomManager } from "../models/RoomManager.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/health", async (): Promise<HealthResponse> => {
    let dbConnected = true;
    try {
      await pool.query("SELECT 1");
    } catch {
      dbConnected = false;
    }

    return {
      status: dbConnected ? "ok" : "degraded",
      roomCount: roomManager.getRoomCount(),
      dbConnected,
    };
  });
}
