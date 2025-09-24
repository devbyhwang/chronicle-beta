import { NextResponse } from "next/server";
import { deleteSession } from "@/server/inmemory";

export async function POST(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const token = cookie
    .split(/;\s*/)
    .map((c) => c.split("=", 2))
    .find(([k]) => k === "session")?.[1];
  if (token) deleteSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", "", { path: "/", httpOnly: true, maxAge: 0 });
  return res;
}

