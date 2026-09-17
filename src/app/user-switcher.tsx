import { auth } from "@/platform";
import { switchUser } from "./actions";

/** The stubbed sign-in: pick a seeded user, the choice lands in a cookie. */
export async function UserSwitcher() {
  const [current, users] = await Promise.all([auth.currentUser(), auth.switchableUsers()]);
  return (
    <form action={switchUser}>
      <label>
        signed in as{" "}
        <select name="userId" defaultValue={current?.id ?? ""}>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.role})
            </option>
          ))}
        </select>
      </label>{" "}
      <button type="submit">switch</button>
    </form>
  );
}
