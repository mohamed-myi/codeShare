import { describe, expect, it } from "vitest";
import { extractClientIp, isOriginAllowed } from "../networkSecurity.js";

describe("networkSecurity", () => {
  it("uses the remote address when the proxy is not trusted", () => {
    expect(
      extractClientIp({
        remoteAddress: "::ffff:127.0.0.1",
        forwardedForHeader: "198.51.100.10, 203.0.113.1",
        trustedProxyIps: [],
      }),
    ).toBe("127.0.0.1");
  });

  it("uses the forwarded client ip when the proxy is trusted", () => {
    expect(
      extractClientIp({
        remoteAddress: "::ffff:127.0.0.1",
        forwardedForHeader: "198.51.100.10, 203.0.113.1",
        trustedProxyIps: ["127.0.0.1"],
      }),
    ).toBe("198.51.100.10");
  });

  it("rejects missing origins when an allowlist is configured", () => {
    expect(isOriginAllowed(undefined, ["http://localhost:5173"])).toBe(false);
  });

  it("accepts matching origins from the allowlist", () => {
    expect(isOriginAllowed("http://localhost:5173", ["http://localhost:5173"])).toBe(true);
  });

  it("returns 'unknown' when remoteAddress is undefined and no proxy", () => {
    expect(extractClientIp({ remoteAddress: undefined, trustedProxyIps: [] })).toBe("unknown");
  });

  it("falls back to remote address when trusted proxy has no forwarded header", () => {
    expect(
      extractClientIp({
        remoteAddress: "::ffff:10.0.0.1",
        forwardedForHeader: undefined,
        trustedProxyIps: ["10.0.0.1"],
      }),
    ).toBe("10.0.0.1");
  });

  it("rejects all origins when allowlist is empty", () => {
    expect(isOriginAllowed("https://anything.com", [])).toBe(false);
  });

  it("rejects non-matching origins", () => {
    expect(isOriginAllowed("https://evil.com", ["http://localhost:5173"])).toBe(false);
  });
});
