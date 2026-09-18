// @ts-check

/** @param {NodeJS.ProcessEnv} source */
export function cleanEnvironment(source) {
  const allowed = [
    "PATH",
    "HOME",
    "USER",
    "TMPDIR",
    "TMP",
    "TEMP",
    "CI",
    "LANG",
    "LC_ALL",
    "TERM",
    "NO_COLOR",
    "FORCE_COLOR",
    "PLAYWRIGHT_BROWSERS_PATH",
    "DOCKER_HOST",
    "DOCKER_CONTEXT",
    "DOCKER_CONFIG",
    "XDG_RUNTIME_DIR",
  ];
  return Object.fromEntries(
    Object.entries(source).filter(([key, value]) => allowed.includes(key) && value !== undefined),
  );
}

/** @param {{ports: number[], databasePort: number, envDir: string}} options */
export function createTestEnvironment({ ports, databasePort, envDir }) {
  const allPorts = [...ports, databasePort];
  if (
    ports.length !== 3 ||
    new Set(allPorts).size !== 4 ||
    allPorts.some((port) => !Number.isInteger(port) || port < 1 || port > 65535)
  ) {
    throw new Error("Expected four distinct TCP ports in 1..65535");
  }
  const [client, server, stub] = ports.map(String);
  return {
    DATABASE_URL: `postgresql://codeshare@127.0.0.1:${databasePort}/codeshare_e2e`,
    E2E_CLIENT_PORT: client,
    E2E_SERVER_PORT: server,
    E2E_STUB_PORT: stub,
    E2E_CLIENT_ORIGIN: `http://127.0.0.1:${client}`,
    E2E_SERVER_URL: `http://127.0.0.1:${server}`,
    E2E_STUB_URL: `http://127.0.0.1:${stub}`,
    E2E_ENV_DIR: envDir,
  };
}
