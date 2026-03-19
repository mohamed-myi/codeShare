import type { FastifyInstance } from "fastify";
import { problemListQuerySchema } from "@codeshare/shared";

export async function problemRoutes(app: FastifyInstance): Promise<void> {
  app.get("/problems", async (request) => {
    const query = problemListQuerySchema.parse(request.query);
    // TODO: Wire to ProblemService
    return { problems: [], filters: query };
  });

  app.get<{ Params: { id: string } }>("/problems/:id", async (request) => {
    const { id } = request.params;
    // TODO: Wire to ProblemService
    return { id, problem: null };
  });
}
