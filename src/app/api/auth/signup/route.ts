import { NextResponse } from "next/server";
import { createUser, createSession } from "@/server/inmemory";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<{
    email: string;
    password: string;
    name?: string;
  }>;

  const email = (body.email || "").trim();
  const password = (body.password || "").trim();
  const name = (body.name || "").trim();

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "이메일/비밀번호를 입력하세요." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ ok: false, error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
  }

  try {
    const user = createUser({ email, password, name });
    const session = createSession(user.id);
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
    res.cookies.set("session", session.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7d
    });
    return res;
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}

