import { describe, expect, it } from "vitest";
import { handlerLogContext } from "../handlerContext.js";
import { requestIdLogField, roomCodeLogFields } from "../logger.js";

describe("handlerLogContext", () => {
  it("composes room code and request id log fields", () => {
    const socket = { data: { requestId: "req-123" } };

    expect(handlerLogContext("abc-xyz", socket as never)).toEqual({
      ...roomCodeLogFields("abc-xyz"),
      ...requestIdLogField(socket),
    });
  });

  it("omits fields that are not available", () => {
    const socket = { data: {} };

    expect(handlerLogContext(undefined, socket as never)).toEqual({});
  });
});
