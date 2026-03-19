import type { RoomUser } from "@codeshare/shared";

interface UserPresenceProps {
  users: RoomUser[];
}

export function UserPresence({ users }: UserPresenceProps) {
  return (
    <div className="flex gap-2">
      {users.map((user) => (
        <span
          key={user.id}
          className={`rounded-full px-2 py-0.5 text-xs ${
            user.connected ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
          }`}
        >
          {user.displayName}
        </span>
      ))}
    </div>
  );
}
