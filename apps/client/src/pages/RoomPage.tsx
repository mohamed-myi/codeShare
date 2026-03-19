import { CodeEditor } from "../components/CodeEditor.tsx";
import { ProblemPanel } from "../components/ProblemPanel.tsx";
import { Toolbar } from "../components/Toolbar.tsx";
import { ResultsPanel } from "../components/ResultsPanel.tsx";
import { TestCasePanel } from "../components/TestCasePanel.tsx";
import { useRoom } from "../hooks/useRoom.ts";

export function RoomPage() {
  const { state } = useRoom();
  const connectedCount = state.users.filter((u) => u.connected).length;

  return (
    <div className="flex h-screen flex-col">
      <Toolbar roomCode={state.roomCode} mode={state.mode} users={state.users} />
      {connectedCount < 2 && (
        <div className="bg-yellow-50 px-4 py-2 text-center text-sm text-yellow-800">
          Waiting for partner...
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-1/2 flex-col border-r">
          <div className="flex-1 overflow-auto">
            <ProblemPanel />
          </div>
          <div className="h-1/3 border-t">
            <TestCasePanel />
          </div>
        </div>
        <div className="flex w-1/2 flex-col">
          <div className="flex-1">
            <CodeEditor />
          </div>
          <div className="h-1/3 border-t">
            <ResultsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
