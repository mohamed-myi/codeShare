export function emitLog(level, event, context = {}) {
  process.stdout.write(
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      service: "e2e-support",
      environment: process.env.NODE_ENV || "development",
      ...context,
    })}\n`,
  );
}
