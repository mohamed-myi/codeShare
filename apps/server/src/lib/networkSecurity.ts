function normalizeIp(ip: string | undefined): string | null {
  if (!ip) {
    return null;
  }

  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  if (allowedOrigins.length === 0) {
    return false;
  }

  if (!origin) {
    return false;
  }

  return allowedOrigins.includes(origin);
}

export function extractClientIp(opts: {
  remoteAddress?: string;
  forwardedForHeader?: string | string[];
  trustedProxyIps: readonly string[];
}): string {
  const remoteAddress = normalizeIp(opts.remoteAddress);
  const trustedProxyIps = new Set(
    opts.trustedProxyIps.map((ip) => normalizeIp(ip)).filter(Boolean),
  );

  if (remoteAddress && trustedProxyIps.has(remoteAddress)) {
    const header = Array.isArray(opts.forwardedForHeader)
      ? opts.forwardedForHeader[0]
      : opts.forwardedForHeader;
    const forwardedIp = header?.split(",")[0]?.trim();
    if (forwardedIp) {
      return forwardedIp;
    }
  }

  return remoteAddress ?? "unknown";
}
