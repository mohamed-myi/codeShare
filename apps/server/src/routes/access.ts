import { type AccessSessionResponse, accessLoginSchema } from "@codeshare/shared";
import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";
import type { AccessService } from "../services/AccessService.js";

export async function accessRoutes(
  app: FastifyInstance,
  opts: { config: Config; accessService?: AccessService },
): Promise<void> {
  app.get("/access/session", async (request): Promise<AccessSessionResponse> => {
    if (!opts.config.ENABLE_PRIVATE_ACCESS) {
      return { authenticated: true };
    }

    const validation = await opts.accessService
      ?.validateCookie(request.headers.cookie)
      .catch(() => null);
    if (!validation?.allowed) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      label: validation.session.inviteLabel,
      expiresAt: validation.session.expiresAt.toISOString(),
    };
  });

  app.post(
    "/access/login",
    {
      config: {
        rateLimit: {
          max: opts.config.RATE_LIMIT_ACCESS_LOGIN,
          timeWindow: "1 hour",
        },
      },
    },
    async (request, reply) => {
      if (!opts.config.ENABLE_PRIVATE_ACCESS) {
        return { authenticated: true } satisfies AccessSessionResponse;
      }

      const existingSession = await opts.accessService
        ?.validateCookie(request.headers.cookie)
        .catch(() => null);
      if (existingSession?.allowed) {
        return {
          authenticated: true,
          label: existingSession.session.inviteLabel,
          expiresAt: existingSession.session.expiresAt.toISOString(),
        } satisfies AccessSessionResponse;
      }

      const parsed = accessLoginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid invite code." });
      }

      const result = await opts.accessService?.login(parsed.data.code);
      if (!result?.allowed) {
        const statusCode = result?.reason === "session_limit_reached" ? 429 : 401;
        const error =
          result?.reason === "session_limit_reached"
            ? "Invite session limit reached."
            : "Invalid invite code.";
        return reply.status(statusCode).send({ error });
      }

      reply.header("set-cookie", result.cookieHeader);
      request.log.info(
        {
          event: "private_access_login_succeeded",
          invite_label: result.session.inviteLabel,
        },
        "Private access login succeeded",
      );

      return {
        authenticated: true,
        label: result.session.inviteLabel,
        expiresAt: result.session.expiresAt.toISOString(),
      } satisfies AccessSessionResponse;
    },
  );

  app.post("/access/logout", async (request, reply) => {
    if (opts.config.ENABLE_PRIVATE_ACCESS) {
      await opts.accessService?.revokeCookie(request.headers.cookie);
      reply.header("set-cookie", opts.accessService?.buildClearCookieHeader() ?? "");
    }
    return { authenticated: false } satisfies AccessSessionResponse;
  });
}
