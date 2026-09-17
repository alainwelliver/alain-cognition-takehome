"use client";

/** Submits the enclosing form as soon as a user is chosen; no separate button. */
export function UserSelect({
  currentId,
  users,
}: {
  currentId: string;
  users: Array<{ id: string; label: string }>;
}) {
  return (
    <select
      id="userId"
      name="userId"
      defaultValue={currentId}
      aria-label="Acting as"
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.label}
        </option>
      ))}
    </select>
  );
}
