import { cookies } from "next/headers";
import { getSessionByToken, getUserById } from "@/server/inmemory";

export async function getSession() {
  const jar = await cookies();
  const token = jar.get("session")?.value || null;
  const sess = getSessionByToken(token);
  if (!sess) return null;
  const user = getUserById(sess.userId);
  if (!user) return null;
  return { user: { id: user.id, name: user.name, email: user.email } };
}
