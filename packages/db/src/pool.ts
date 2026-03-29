import pg from "pg";
import { createDbLogger } from "./logger.js";

const { Pool } = pg;
const logger = createDbLogger();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  logger.error("db_pool_idle_error", {
    err,
    error_message: err.message,
  });
});

export { pool };
