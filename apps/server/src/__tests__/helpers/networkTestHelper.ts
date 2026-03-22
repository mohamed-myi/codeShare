import type http from "node:http";

export const TEST_HOST = "127.0.0.1";

export async function listenOnLocalhost(server: http.Server): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };

    const onListening = () => {
      server.off("error", onError);
      const addr = server.address();
      if (!addr || typeof addr !== "object") {
        reject(new Error("Server did not expose a bound port."));
        return;
      }
      resolve(addr.port);
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(0, TEST_HOST);
  });
}
