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
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${
            user.connected
              ? "text-[var(--color-success-text)]"
              : "text-[var(--color-text-tertiary)]"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              user.connected ? "bg-[var(--color-success)]" : "bg-[var(--color-text-tertiary)]"
            }`}
          />
          {user.displayName}
        </span>
      ))}
    </div>
  );
}
