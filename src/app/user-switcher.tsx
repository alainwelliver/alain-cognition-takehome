import { auth } from "@/platform";
import { switchUser } from "./actions";
import { UserSelect } from "./user-select";

/** The stubbed sign-in: pick a seeded user, the choice lands in a cookie. */
export async function UserSwitcher() {
  const [current, users] = await Promise.all([auth.currentUser(), auth.switchableUsers()]);
  return (
    <form action={switchUser} className="switcher">
      <label htmlFor="userId">Acting as:</label>
      <UserSelect
        key={current?.id ?? "none"}
        currentId={current?.id ?? ""}
        users={users.map((u) => ({ id: u.id, label: `${u.name} (${u.role})` }))}
      />
    </form>
  );
}
