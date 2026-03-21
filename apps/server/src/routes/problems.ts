import type { FastifyInstance } from "fastify";
import { problemListQuerySchema } from "@codeshare/shared";
import { problemService } from "../services/ProblemService.js";

export async function problemRoutes(app: FastifyInstance): Promise<void> {
  app.get("/problems", async (request, reply) => {
    const result = problemListQuerySchema.safeParse(request.query);
    if (!result.success) {
      return reply
        .status(400)
        .send({ error: result.error.flatten().fieldErrors });
    }
    const problems = await problemService.list(result.data);
    return { problems };
  });

  app.get<{ Params: { id: string } }>(
    "/problems/:id",
    async (request, reply) => {
      const { id } = request.params;
      const detail = await problemService.getById(id);
      if (!detail) return reply.code(404).send({ error: "Problem not found" });
      return detail;
    },
  );
}
