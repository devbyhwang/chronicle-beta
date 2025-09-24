import { NextResponse } from "next/server";
import { getUser } from "@/lib/database";

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const token = cookie
      .split(/;\s*/)
      .map((c) => c.split("=", 2))
      .find(([k]) => k === "session")?.[1];
    
    // 간단한 세션 검증 (실제로는 NextAuth나 더 강력한 인증 시스템 사용 권장)
    if (!token) {
      return NextResponse.json({ ok: true, user: null });
    }
    
    // 토큰에서 사용자 ID 추출 (실제로는 JWT 디코딩 등 필요)
    // 여기서는 간단히 토큰을 사용자 ID로 사용
    const user = await getUser(token);
    
    if (!user) {
      return NextResponse.json({ ok: true, user: null });
    }
    
    return NextResponse.json({ 
      ok: true, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        avatar: user.avatar
      } 
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ ok: true, user: null });
  }
}

