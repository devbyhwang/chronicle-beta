import { NextResponse } from "next/server";
import { createSession, findUserByEmail, hashPassword } from "@/server/inmemory";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<{
    email: string;
    password: string;
  }>;

  const email = (body.email || "").trim().toLowerCase();
  const password = (body.password || "").trim();

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "이메일/비밀번호를 입력하세요." }, { status: 400 });
  }

  const user = findUserByEmail(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return NextResponse.json({ ok: false, error: "이메일 혹은 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const session = createSession(user.id);
  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  res.cookies.set("session", session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7d
  });
  return res;
}

