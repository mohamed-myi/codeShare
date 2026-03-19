import type { RoomMode, RoomUser } from "@codeshare/shared";
import { UserPresence } from "./UserPresence.tsx";

interface ToolbarProps {
  roomCode: string;
  mode: RoomMode;
  users: RoomUser[];
}

export function Toolbar({ roomCode, mode, users }: ToolbarProps) {
  const modeLabel = mode === "interview" ? "Interview" : "Collaboration";

  return (
    <div className="flex items-center gap-2 border-b px-4 py-2">
      <span className="mr-2 font-mono text-sm text-gray-500">{roomCode}</span>
      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
        {modeLabel}
      </span>
      <div className="mx-2 h-4 w-px bg-gray-300" />
      <button className="rounded bg-green-600 px-3 py-1 text-sm text-white">
        Run
      </button>
      <button className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
        Submit
      </button>
      <button className="rounded border px-3 py-1 text-sm">Hint</button>
      <button className="rounded border px-3 py-1 text-sm">Import</button>
      <div className="ml-auto">
        <UserPresence users={users} />
      </div>
    </div>
  );
}
