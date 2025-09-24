import { NextResponse } from "next/server";
import { getSessionByToken, getUserById } from "@/server/inmemory";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const token = cookie
    .split(/;\s*/)
    .map((c) => c.split("=", 2))
    .find(([k]) => k === "session")?.[1];
  const sess = getSessionByToken(token);
  if (!sess) return NextResponse.json({ ok: true, user: null });
  const user = getUserById(sess.userId);
  if (!user) return NextResponse.json({ ok: true, user: null });
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
}

