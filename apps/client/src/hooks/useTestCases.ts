import { SocketEvents, type CustomTestCase } from "@codeshare/shared";
import { useSocket } from "./useSocket.ts";

export function useTestCases() {
  const { socket } = useSocket();

  function addTestCase(testCase: CustomTestCase) {
    socket?.emit(SocketEvents.TESTCASE_ADD, testCase);
  }

  return { addTestCase };
}
